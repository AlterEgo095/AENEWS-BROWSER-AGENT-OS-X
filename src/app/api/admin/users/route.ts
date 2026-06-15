import { db } from '@/lib/db'
import { proxyToBackend } from '@/lib/backend-proxy'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Try backend proxy first
    const backendResult = await proxyToBackend('/credits/admin/accounts')
    if (backendResult?.ok) {
      // Backend returns { accounts: [...] } — transform to match frontend expected format
      const accounts = backendResult.data.accounts || []
      const users = accounts.map((a: any) => ({
        id: a.userId,
        email: a.userId, // Backend doesn't store email in credit_accounts
        name: `User ${a.userId.slice(0, 8)}`,
        role: 'user',
        credits: a.balance,
        transactionCount: 0,
        createdAt: a.createdAt,
        updatedAt: a.createdAt,
      }))
      return NextResponse.json({ users })
    }

    // Fallback to Prisma/SQLite
    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        credits: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { transactions: true },
        },
      },
    })

    const formatted = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      credits: u.credits,
      transactionCount: u._count.transactions,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    }))

    return NextResponse.json({ users: formatted })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
