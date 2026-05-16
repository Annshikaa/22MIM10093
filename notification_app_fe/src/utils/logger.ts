// frontend version of the logger — same API as the backend logging middleware
// makes HTTP calls directly to the evaluation service with stack='frontend'

type Level = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
type Package = 'api' | 'component' | 'hook' | 'page' | 'state' | 'style' | 'auth' | 'config' | 'middleware' | 'utils';

const API_BASE = 'http://4.224.186.213/evaluation-service';

let _token: string | null = null;
let _tokenExpiry = 0;

async function getFrontendToken(): Promise<string> {
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

  const data = await res.json();
  _token = data.access_token;
  _tokenExpiry = data.expires_in;
  return _token as string;
}

export async function Log(level: Level, pkg: Package, message: string): Promise<void> {
  // always print to console so devtools shows it even if the API call fails
  console.log(`[${level}] [frontend/${pkg}] ${message}`);

  try {
    const token = await getFrontendToken();
    await fetch(`${API_BASE}/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ stack: 'frontend', level, package: pkg, message }),
    });
  } catch {
    // log calls are best-effort, app shouldn't break if they fail
  }
}
