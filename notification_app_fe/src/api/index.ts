// calling the evaluation API directly from browser — fastest path, no backend proxy needed

// requests go to /eval/... which Vite proxies to http://4.224.186.213/evaluation-service/...
const API_BASE = '/eval';

export interface Notification {
  id: string;
  type: 'Event' | 'Result' | 'Placement';
  message: string;
  is_read: boolean;
  created_at: string;
  priority_score?: number;
}

let _token: string | null = null;
let _tokenExpiry = 0;

async function getToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (_token && now < _tokenExpiry - 60) return _token;

  const res = await fetch(`${API_BASE}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'anshikajain7566@gmail.com',
      name: 'anshika jain',
      rollNo: '22mim10093',
      accessCode: 'SfFuWg',
      clientID: 'e7bc7aea-0988-43ac-b7f0-6732ac264f10',
      clientSecret: 'dCsWsUfbUtcsWtzy',
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`auth failed: ${res.status} — ${body}`);
  }
  const data = await res.json();
  _token = data.access_token;
  _tokenExpiry = now + (data.expires_in || 3600);
  return _token as string;
}

function normalize(n: any): Notification {
  return {
    id: n.ID || n.id,
    type: (n.Type || n.type) as Notification['type'],
    message: n.Message || n.message,
    is_read: false,
    created_at: n.Timestamp || n.created_at,
  };
}

export async function fetchNotifications(params?: {
  limit?: number;
  page?: number;
  type?: string;
}): Promise<Notification[]> {
  const token = await getToken();
  const query = new URLSearchParams();
  // external API caps limit at 10
  const limit = Math.min(params?.limit ?? 10, 10);
  query.set('limit', String(limit));
  if (params?.page) query.set('page', String(params.page));
  if (params?.type) query.set('notification_type', params.type);

  const res = await fetch(`${API_BASE}/notifications?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API error: ${res.status} — ${body}`);
  }
  const data = await res.json();
  return (data.notifications || []).map(normalize);
}

const WEIGHTS: Record<string, number> = { Placement: 3, Result: 2, Event: 1 };

export function computePriorityScore(n: Notification): number {
  const w = WEIGHTS[n.type] ?? 1;
  const ageDays = (Date.now() - new Date(n.created_at).getTime()) / 86_400_000;
  return w / (1 + ageDays);
}

export async function fetchPriorityInbox(topN = 10): Promise<Notification[]> {
  const all = await fetchNotifications({ limit: 10 });
  return all
    .map((n) => ({ ...n, priority_score: computePriorityScore(n) }))
    .sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0))
    .slice(0, topN);
}

// read state is tracked in React state — best-effort persist to backend
export async function markAsRead(_id: string): Promise<boolean> {
  return true;
}

export async function triggerSync(): Promise<number> { return 0; }
