import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, amount, type, description, adminId } = body as {
      userId: string
      amount: number
      type: string
      description: string
      adminId?: string
    }

    if (!userId || !amount || !type || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, amount, type, description' },
        { status: 400 }
      )
    }

    const numericAmount = Number(amount)
    if (isNaN(numericAmount) || numericAmount === 0) {
      return NextResponse.json({ error: 'Amount must be a non-zero number' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // For deductions, check that the user has enough credits
    if (numericAmount < 0 && user.credits + numericAmount < 0) {
      return NextResponse.json(
        { error: 'Insufficient credits. User balance would go negative.' },
        { status: 400 }
      )
    }

    const transaction = await db.creditTransaction.create({
      data: {
        userId,
        amount: numericAmount,
        type,
        description,
        adminId: adminId || null,
      },
    })

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { credits: { increment: numericAmount } },
    })

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        type: transaction.type,
        description: transaction.description,
        createdAt: transaction.createdAt.toISOString(),
      },
      newBalance: updatedUser.credits,
    })
  } catch (error) {
    console.error('Error processing credit operation:', error)
    return NextResponse.json({ error: 'Failed to process credit operation' }, { status: 500 })
  }
}
