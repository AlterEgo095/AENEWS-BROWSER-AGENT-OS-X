import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
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
