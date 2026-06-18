/**
 * PDEOS Phase 2 — Security Fix
 * File: src/app/api/admin/credits/route.ts (full replacement)
 * Fix C1: add auth via proxyToBackend (Authorization forwarded)
 */
import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function POST(req: NextRequest) {
  const body = await req.json();
  return proxyToBackend(req as unknown as Request, '/credits/admin/add', { method: 'POST', body });
}
