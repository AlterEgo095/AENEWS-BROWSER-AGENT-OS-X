import { proxyToBackend } from '@/lib/backend-proxy'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, amount, agentId, missionId, description } = body as {
      userId: string
      amount: number
      agentId?: string
      missionId?: string
      description?: string
    }

    if (!userId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, amount' },
        { status: 400 }
      )
    }

    // Try backend proxy first
    const backendResult = await proxyToBackend('/credits/deduct', {
      method: 'POST',
      body: { userId, amount, agentId, missionId, description },
    })
    if (backendResult?.ok) {
      return NextResponse.json(backendResult.data)
    }

    // No Prisma fallback for deduct — this is an agent execution endpoint
    // that should only be served by the backend
    return NextResponse.json(
      { error: 'Backend credit service unavailable. Cannot deduct credits.' },
      { status: 503 }
    )
  } catch (error) {
    console.error('Error deducting credits:', error)
    return NextResponse.json({ error: 'Failed to deduct credits' }, { status: 500 })
  }
}
