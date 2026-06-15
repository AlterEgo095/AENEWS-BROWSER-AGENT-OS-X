/**
 * Backend API proxy helper for forwarding requests to the NestJS backend.
 *
 * Usage:
 *   - Set BACKEND_API_URL env var to the backend base URL (e.g., http://localhost:3001/api/v1)
 *   - If not set or backend is unreachable, the proxy returns null and the
 *     calling route can fall back to the Prisma/SQLite approach
 */

const BACKEND_API_URL = process.env.BACKEND_API_URL || '';

interface ProxyOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

/**
 * Attempt to proxy a request to the NestJS backend.
 * Returns the parsed JSON response or null if the backend is unavailable.
 */
export async function proxyToBackend(
  path: string,
  options: ProxyOptions = {},
): Promise<{ data: any; ok: boolean } | null> {
  if (!BACKEND_API_URL) return null;

  const url = `${BACKEND_API_URL}${path}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`Backend proxy returned ${response.status} for ${path}`);
      return null;
    }

    const data = await response.json();
    return { data, ok: true };
  } catch (error: any) {
    // Backend unreachable — fall back silently
    console.debug(`Backend proxy failed for ${path}: ${error.message}`);
    return null;
  }
}
