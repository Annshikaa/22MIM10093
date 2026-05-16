# Campus Notification Platform — System Design

---

## Stage 1: API Design

Students miss placement drives and result announcements because there's no central place to check. This platform fixes that — one feed for Events, Results, and Placements with real-time updates.

### REST Endpoints

Base: `http://localhost:5000/api`

| Method | Path | What it does |
|---|---|---|
| GET | /notifications | List notifications. Query: `limit`, `page`, `type`, `source` |
| GET | /notifications/priority | Top N by priority score. Query: `top` |
| PATCH | /notifications/:id/read | Mark one as read |
| POST | /sync | Force pull from external API into DB |
| GET | /health | Server uptime check |

Sample response for GET /notifications:
```json
{
  "notifications": [
    { "id": "uuid", "type": "Placement", "message": "Google visiting 5th June", "is_read": false, "created_at": "2026-04-22T17:51:30Z" }
  ],
  "page": 1, "limit": 20
}
```

I went with REST because the data model is simple and REST caches easily at HTTP level. GraphQL would be overkill here.

### WebSocket

Connection: `ws://localhost:5000`

Server runs a background poller every 30 seconds. When new notifications come in that weren't seen before, it broadcasts them to all connected clients. 30s felt right — placement announcements don't happen every second, and it avoids hammering the external API.

Messages from server:
```json
{ "type": "connected", "message": "connected to notification stream" }
{ "type": "new_notification", "data": { ...notification } }
```

---

## Stage 2: Database Schema

### Tables

```sql
CREATE TYPE notification_type AS ENUM ('Event', 'Result', 'Placement');

CREATE TABLE students (
  id         VARCHAR(50) PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  message    TEXT NOT NULL,
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

Two tables because student data and notification data have different lifetimes and concerns. The ENUM for type means the DB rejects invalid values at insert time — no silent bugs from a typo like `"placement"` vs `"Placement"`. `ON DELETE CASCADE` means cleaning up a student cleans their notifications too.

### Key Queries

Fetch latest for a student:
```sql
SELECT * FROM notifications
WHERE student_id = $1
ORDER BY created_at DESC LIMIT $2 OFFSET $3;
```

Filter by type:
```sql
SELECT * FROM notifications
WHERE student_id = $1 AND type = $2
ORDER BY created_at DESC LIMIT $3 OFFSET $4;
```

Insert without duplicates (poller runs every 30s so same notification can arrive twice):
```sql
INSERT INTO notifications (id, student_id, type, message, created_at)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (id) DO NOTHING;
```

Mark as read:
```sql
UPDATE notifications SET is_read = TRUE WHERE id = $1 RETURNING *;
```

Priority inbox — score = type_weight / (1 + age_in_days):
```sql
SELECT *,
  ROUND(
    CASE type WHEN 'Placement' THEN 3.0 WHEN 'Result' THEN 2.0 ELSE 1.0 END
    / (1.0 + EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400.0)
  , 4) AS priority_score
FROM notifications WHERE student_id = $1
ORDER BY priority_score DESC LIMIT $2;
```

---

## Stage 3: Query Optimization

### Answering the Stage 3 Questions

**1. Is the provided query accurate?**
Technically it returns the right rows, but `ORDER BY createdAt ASC` puts oldest first. For a notification system that's backwards — users want newest unread first. Should be `DESC`.

**2. Why is it slow?**
No indexes. With thousands of rows across many students, every query does a full table scan. The `ORDER BY created_at` also triggers a sort on every request because there's no index to read in order.

**3. How to fix it?**

Add these indexes:

```sql
-- most queries filter by student_id first
CREATE INDEX idx_notifications_student ON notifications(student_id);

-- type-filtered queries (filter + student together)
CREATE INDEX idx_notifications_student_type ON notifications(student_id, type);

-- cover the ORDER BY created_at DESC
CREATE INDEX idx_notifications_student_date ON notifications(student_id, created_at DESC);
```

With the composite `(student_id, created_at DESC)` index, PostgreSQL can do a single index scan and skip the sort entirely. EXPLAIN output goes from a sequential scan (cost ~240) to an index scan (cost ~2) for 20 rows.

**4. Priority inbox performance**

The score formula does `EXTRACT(EPOCH FROM ...)` per row which is fine at small scale. At scale, options are: pre-compute the score column on insert, use a materialized view refreshed every few minutes, or compute in application memory (what I'm doing since the dataset is small). For a real system with 5000+ students I'd go with a materialized view.

---

## Stage 4: Caching Strategy

### What's cached and what's not

Not everything is worth caching. Here's the breakdown:

- **Notification list** — changes every 30s (poller interval), so a 30s TTL in-memory cache makes sense
- **Priority inbox** — same data, same TTL
- **Read/unread state** — changes per user click, cache invalidation gets tricky, not worth it
- **Auth token** — already cached in `auth.ts` with expiry tracking

### In-memory cache (single instance)

```
cache = {}

setCached(key, data, ttl):
  cache[key] = { data, expiresAt: now() + ttl }

getCached(key):
  if key in cache and cache[key].expiresAt > now():
    return cache[key].data
  return null
```

In production with multiple instances you'd use Redis instead — in-memory state isn't shared across processes. For this single-server setup it's fine.

### HTTP caching headers

```
Cache-Control: public, max-age=30
ETag: "<hash of response>"
```

Browser caches the response for 30s. On the next request if ETag matches, server sends `304 Not Modified` — no body transfer needed.

### Connection pooling

`pg.Pool` with `max: 10` — each request borrows a connection and returns it. Without pooling, every request opens a new Postgres connection which hits the server's connection limit fast under load.

---

## Stage 5: Priority Inbox — Approach

### Scoring formula

```
score = type_weight / (1 + age_in_days)
```

- Placement = 3, Result = 2, Event = 1
- Newer notifications score higher
- A Placement from today: 3 / (1 + 0) = 3.0
- A Placement from 3 days ago: 3 / (1 + 3) = 0.75
- An Event from today: 1 / (1 + 0) = 1.0

So a recent Event can outrank an old Placement — that's intentional.

### Pseudocode

```
FUNCTION priorityInbox(notifications, topN):
  WEIGHTS = { Placement: 3, Result: 2, Event: 1 }
  
  FOR each n in notifications:
    age = (now - n.created_at) / ONE_DAY
    n.score = WEIGHTS[n.type] / (1 + age)
  
  SORT notifications by score DESC
  RETURN notifications[0..topN]
```

### How new notifications are handled efficiently

The poller runs every 30 seconds. It fetches the latest from the external API, upserts new ones into the DB (using `ON CONFLICT DO NOTHING`), and broadcasts newly seen IDs to WebSocket clients. The priority inbox re-runs the scoring query each time it's requested — since it's a simple SQL ORDER BY with a computed column it's fast enough. No need to maintain a sorted list in memory.

---

## Stage 6: Priority Inbox Implementation

See `priority_inbox.ts` at the repo root. Run with:

```
cd notification_app_be
npx ts-node --transpile-only ../priority_inbox.ts 10
```

The script fetches up to 150 notifications from the external API across 3 pages, scores each one using `weight / (1 + age_in_days)`, sorts descending, and prints the top N with their scores. Screenshots of the output are in the `screenshots/` folder.

---

## Stage 7: Frontend

React + TypeScript + Vite + Material UI, running on `localhost:3000`.

Two pages — All Notifications (with type filter chips) and Priority Inbox. Notifications fetched live from the external API via the backend proxy. Read/unread tracked in component state and persisted to the local DB via PATCH. WebSocket connection auto-reconnects and adds new notifications to the top of the list without a page refresh.
