/**
 * PDEOS Phase 2 — Security Fix
 * File: src/app/api/admin/settings/route.ts
 * Fix C2: add auth via proxyToBackend
 */
import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function GET(req: NextRequest) {
  return proxyToBackend(req as unknown as Request, '/credits/admin/settings', { method: 'GET' });
}
export async function PUT(req: NextRequest) {
  const body = await req.json();
  return proxyToBackend(req as unknown as Request, '/credits/admin/settings', { method: 'PUT', body });
}
