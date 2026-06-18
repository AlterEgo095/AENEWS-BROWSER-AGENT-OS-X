/**
 * PDEOS Phase 2 — Security Fix
 * File: src/lib/backend-proxy.ts (full replacement)
 * Fix C9: propagate Authorization header + remove Prisma fallback
 */
export async function proxyToBackend(req: Request, path: string, options: { method?: string; body?: unknown } = {}): Promise<Response> {
  const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:3000/api/v1';
  const targetUrl = `${backendUrl}${path}`;
  const authHeader = req.headers.get('authorization');
  const cookieHeader = req.headers.get('cookie');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Correlation-ID': req.headers.get('x-correlation-id') || crypto.randomUUID(),
  };
  // FIX C9: forward Authorization
  if (authHeader) headers['Authorization'] = authHeader;
  if (cookieHeader) headers['Cookie'] = cookieHeader;

  try {
    return await fetch(targetUrl, {
      method: options.method ?? 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: 'no-store',
    });
  } catch (err: any) {
    // FIX: NO MORE PRISMA FALLBACK — return clean 502
    return new Response(JSON.stringify({
      success: false,
      error: 'BACKEND_UNREACHABLE',
      message: 'Backend API is unreachable. No fallback — data integrity preserved.',
      details: err?.message,
    }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }
}
