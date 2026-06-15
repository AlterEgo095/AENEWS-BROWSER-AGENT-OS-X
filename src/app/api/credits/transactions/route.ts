import { db } from '@/lib/db'
import { proxyToBackend } from '@/lib/backend-proxy'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const limit = searchParams.get('limit') || '50'

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Try backend proxy first
    const backendResult = await proxyToBackend(`/credits/transactions?userId=${encodeURIComponent(userId)}&limit=${limit}`)
    if (backendResult?.ok) {
      return NextResponse.json(backendResult.data)
    }

    // Fallback to Prisma/SQLite
    const transactions = await db.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10),
    })

    const formatted = transactions.map((t) => ({
      id: t.id,
      amount: t.amount,
      type: t.type,
      description: t.description,
      adminId: t.adminId,
      createdAt: t.createdAt.toISOString(),
    }))

    return NextResponse.json({ transactions: formatted })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}
