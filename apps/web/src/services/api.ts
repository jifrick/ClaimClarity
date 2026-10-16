const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  
  // Read current user session from localStorage
  const savedUser = localStorage.getItem('claimclarity_user');
  let token: string | undefined;
  let demoUserId: string | undefined;

  if (savedUser) {
    try {
      const parsed = JSON.parse(savedUser);
      if (parsed.token) {
        token = parsed.token;
      }
      if (parsed.id) {
        demoUserId = parsed.id;
      }
    } catch {
      // Ignore
    }
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else if (!headers.has('Authorization')) {
    headers.set('Authorization', 'Bearer demo-token');
  }

  if (demoUserId) {
    headers.set('x-demo-user-id', demoUserId);
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}
