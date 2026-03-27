const getApiUrl = () =>
  (import.meta.env.PUBLIC_API_URL as string | undefined) || 'http://localhost:3000';

/**
 * Fetch wrapper that:
 * - Adds credentials: 'include' so HttpOnly cookies are sent automatically
 * - On 401, attempts a silent token refresh via POST /api/refresh, then retries once
 * - On second 401 (refresh failed / expired), redirects to homepage
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const apiUrl = getApiUrl();
  const fullUrl = url.startsWith('http') ? url : `${apiUrl}${url}`;

  const res = await fetch(fullUrl, { ...options, credentials: 'include' });

  if (res.status === 401) {
    // Attempt silent refresh
    const refreshRes = await fetch(`${apiUrl}/api/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (refreshRes.ok) {
      // Retry original request with fresh cookie
      return fetch(fullUrl, { ...options, credentials: 'include' });
    }

    // Refresh failed — session is truly expired, redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }

  return res;
}
