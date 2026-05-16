import axios from 'axios';
import pool from './db';
import { Log } from '../logging_middleware';

const API_BASE = 'http://4.224.186.213/evaluation-service';

// using a fixed student id for the demo — in a real app this'd come from auth
const DEMO_STUDENT_ID = 'demo_student_001';

let _token: string | null = null;
let _tokenExpiry = 0;

async function getApiToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (_token && now < _tokenExpiry - 60) return _token;

  await Log('backend', 'debug', 'auth', 'requesting new token from evaluation service');

  const res = await axios.post(`${API_BASE}/auth`, {
    email: 'anshikajain7566@gmail.com',
    name: 'anshika jain',
    rollNo: '22mim10093',
    accessCode: 'SfFuWg',
    clientID: 'e7bc7aea-0988-43ac-b7f0-6732ac264f10',
    clientSecret: 'dCsWsUfbUtcsWtzy',
  });

  _token = res.data.access_token;
  _tokenExpiry = res.data.expires_in;
  return _token as string;
}

export async function fetchFromExternalApi(params: {
  limit?: number;
  page?: number;
  notification_type?: string;
}): Promise<any[]> {
  const token = await getApiToken();
  await Log('backend', 'info', 'service', `fetching from external API, params: ${JSON.stringify(params)}`);

  const res = await axios.get(`${API_BASE}/notifications`, {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });

  return res.data.notifications || [];
}

export async function ensureDemoStudent(): Promise<void> {
  await pool.query(
    `INSERT INTO students (id, name, email)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO NOTHING`,
    [DEMO_STUDENT_ID, 'Demo Student', 'demo@campus.edu']
  );
  await Log('backend', 'debug', 'db', 'demo student ready in db');
}

// pulls from external API and upserts into local db, returns how many were new
export async function syncNotifications(): Promise<{ synced: number; notifications: any[] }> {
  const notifications = await fetchFromExternalApi({ limit: 50, page: 1 });

  let newCount = 0;
  for (const n of notifications) {
    const result = await pool.query(
      `INSERT INTO notifications (id, student_id, type, message, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [n.ID, DEMO_STUDENT_ID, n.Type, n.Message, n.Timestamp]
    );
    if (result.rowCount && result.rowCount > 0) newCount++;
  }

  if (newCount > 0) {
    await Log('backend', 'info', 'service', `synced ${newCount} new notifications into db`);
  }

  return { synced: newCount, notifications };
}

export async function getNotifications(opts: {
  limit?: number;
  offset?: number;
  type?: string;
}): Promise<any[]> {
  const { limit = 20, offset = 0, type } = opts;

  await Log('backend', 'info', 'repository', `querying notifications: limit=${limit}, offset=${offset}, type=${type || 'all'}`);

  if (type) {
    const res = await pool.query(
      `SELECT * FROM notifications
       WHERE student_id = $1 AND type = $2
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [DEMO_STUDENT_ID, type, limit, offset]
    );
    return res.rows;
  }

  const res = await pool.query(
    `SELECT * FROM notifications
     WHERE student_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [DEMO_STUDENT_ID, limit, offset]
  );
  return res.rows;
}

export async function markAsRead(id: string): Promise<any | null> {
  await Log('backend', 'info', 'service', `marking notification ${id} as read`);

  const res = await pool.query(
    `UPDATE notifications SET is_read = TRUE WHERE id = $1 RETURNING *`,
    [id]
  );
  return res.rows[0] || null;
}

// score = type_weight / (1 + age_in_days)
// Placement=3, Result=2, Event=1
export async function getPriorityInbox(topN = 10): Promise<any[]> {
  await Log('backend', 'info', 'service', `computing priority inbox, top ${topN}`);

  const res = await pool.query(
    `SELECT *,
       CASE type
         WHEN 'Placement' THEN 3
         WHEN 'Result' THEN 2
         WHEN 'Event' THEN 1
         ELSE 0
       END AS type_weight,
       ROUND(
         CASE type WHEN 'Placement' THEN 3 WHEN 'Result' THEN 2 WHEN 'Event' THEN 1 ELSE 0 END
         / (1.0 + EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400.0)
       , 4) AS priority_score
     FROM notifications
     WHERE student_id = $1
     ORDER BY priority_score DESC
     LIMIT $2`,
    [DEMO_STUDENT_ID, topN]
  );

  await Log('backend', 'debug', 'service', `priority inbox computed, returned ${res.rows.length} items`);
  return res.rows;
}

// keeps track of what we've already seen so we can detect truly new arrivals
const seenIds = new Set<string>();

export function startNotificationPoller(onNew: (notification: any) => void): void {
  const POLL_INTERVAL_MS = 30_000;

  const poll = async () => {
    try {
      const { notifications, synced } = await syncNotifications();
      const isFirstRun = seenIds.size === 0;

      for (const n of notifications) {
        if (!seenIds.has(n.ID)) {
          if (!isFirstRun) {
            // only broadcast after the initial load so we don't spam clients on startup
            onNew(n);
            await Log('backend', 'info', 'cron_job', `new notification broadcast: ${n.ID} (${n.Type})`);
          }
          seenIds.add(n.ID);
        }
      }

      if (synced > 0) {
        await Log('backend', 'info', 'cron_job', `poller synced ${synced} new notifications`);
      }
    } catch (err: any) {
      await Log('backend', 'error', 'cron_job', `poller failed: ${err.message}`);
    }
  };

  poll(); // run immediately on startup
  setInterval(poll, POLL_INTERVAL_MS);

  Log('backend', 'info', 'cron_job', `notification poller started, running every ${POLL_INTERVAL_MS / 1000}s`);
}
