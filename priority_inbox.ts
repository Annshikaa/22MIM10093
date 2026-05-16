/**
 * Stage 6 — Priority Inbox
 *
 * Fetches notifications from the external API, computes a priority score
 * for each one, and prints the top N.
 *
 * Score formula: type_weight / (1 + age_in_days)
 *   Placement = 3, Result = 2, Event = 1
 *
 * Run with: npx ts-node priority_inbox.ts [topN]
 */

import axios from 'axios';

const API_BASE = 'http://4.224.186.213/evaluation-service';

const TYPE_WEIGHTS: Record<string, number> = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

interface RawNotification {
  ID: string;
  Type: string;
  Message: string;
  Timestamp: string;
}

interface ScoredNotification extends RawNotification {
  priority_score: number;
  age_days: number;
}

async function getAuthToken(): Promise<string> {
  const res = await axios.post(`${API_BASE}/auth`, {
    email: 'anshikajain7566@gmail.com',
    name: 'anshika jain',
    rollNo: '22mim10093',
    accessCode: 'SfFuWg',
    clientID: 'e7bc7aea-0988-43ac-b7f0-6732ac264f10',
    clientSecret: 'dCsWsUfbUtcsWtzy',
  });
  return res.data.access_token;
}

async function fetchAllNotifications(token: string): Promise<RawNotification[]> {
  // fetch up to 3 pages to get a decent sample
  const all: RawNotification[] = [];

  for (let page = 1; page <= 3; page++) {
    const res = await axios.get(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: 50, page },
    });

    const batch: RawNotification[] = res.data.notifications || [];
    if (batch.length === 0) break;
    all.push(...batch);
  }

  return all;
}

function scoreNotification(n: RawNotification): ScoredNotification {
  const weight = TYPE_WEIGHTS[n.Type] ?? 1;
  const createdAt = new Date(n.Timestamp).getTime();
  const nowMs = Date.now();
  const ageDays = (nowMs - createdAt) / (1000 * 60 * 60 * 24);
  const score = weight / (1 + ageDays);

  return {
    ...n,
    priority_score: Math.round(score * 10000) / 10000,
    age_days: Math.round(ageDays * 10) / 10,
  };
}

function printTopN(notifications: ScoredNotification[], topN: number): void {
  console.log(`\n=== Priority Inbox (top ${topN}) ===\n`);

  notifications.slice(0, topN).forEach((n, i) => {
    const readStatus = '●'; // all unread in this demo
    console.log(`${i + 1}. [${n.Type.toUpperCase()}] score=${n.priority_score} (age: ${n.age_days}d)`);
    console.log(`   ${readStatus} ${n.Message}`);
    console.log(`   ID: ${n.ID} | ${new Date(n.Timestamp).toLocaleDateString()}`);
    console.log();
  });
}

function summarizeByType(notifications: ScoredNotification[]): void {
  const counts: Record<string, number> = {};
  for (const n of notifications) {
    counts[n.Type] = (counts[n.Type] || 0) + 1;
  }

  console.log('--- Summary ---');
  for (const [type, count] of Object.entries(counts)) {
    const weight = TYPE_WEIGHTS[type] ?? 1;
    console.log(`  ${type}: ${count} notification(s) (weight: ${weight})`);
  }
  console.log();
}

async function main() {
  const topN = parseInt(process.argv[2] || '10', 10);

  console.log('fetching auth token...');
  const token = await getAuthToken();

  console.log('fetching notifications from API...');
  const raw = await fetchAllNotifications(token);
  console.log(`fetched ${raw.length} notifications total`);

  // score and sort
  const scored = raw.map(scoreNotification);
  scored.sort((a, b) => b.priority_score - a.priority_score);

  summarizeByType(scored);
  printTopN(scored, topN);

  // also show score breakdown for debugging
  console.log('--- Score breakdown (all) ---');
  scored.forEach((n) => {
    console.log(`  ${n.Type.padEnd(10)} | score: ${String(n.priority_score).padStart(8)} | age: ${n.age_days}d | ${n.Message.slice(0, 50)}`);
  });
}

main().catch((err) => {
  console.error('error:', err.message);
  process.exit(1);
});
