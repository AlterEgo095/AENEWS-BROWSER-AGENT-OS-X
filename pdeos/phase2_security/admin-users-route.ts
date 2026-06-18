/**
 * PDEOS Phase 2 — Security Fix
 * File: src/app/api/admin/users/route.ts
 * Fix C3: add auth via proxyToBackend
 */
import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function GET(req: NextRequest) {
  return proxyToBackend(req as unknown as Request, '/admin/users', { method: 'GET' });
}
