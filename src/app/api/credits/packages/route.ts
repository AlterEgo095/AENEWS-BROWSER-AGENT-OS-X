import { db } from '@/lib/db'
import { proxyToBackend } from '@/lib/backend-proxy'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Try backend proxy first
    const backendResult = await proxyToBackend('/credits/packages')
    if (backendResult?.ok) {
      return NextResponse.json(backendResult.data)
    }

    // Fallback to Prisma/SQLite
    const packagesSetting = await db.adminSettings.findUnique({
      where: { key: 'credit_packages' },
    })

    let packages: { id: string; name: string; credits: number; price: number }[] = []
    try {
      packages = packagesSetting?.value
        ? JSON.parse(packagesSetting.value)
        : [
            { id: 'starter', name: 'Starter', credits: 100, price: 5 },
            { id: 'pro', name: 'Pro', credits: 500, price: 20 },
            { id: 'enterprise', name: 'Enterprise', credits: 2000, price: 50 },
          ]
    } catch {
      packages = [
        { id: 'starter', name: 'Starter', credits: 100, price: 5 },
        { id: 'pro', name: 'Pro', credits: 500, price: 20 },
        { id: 'enterprise', name: 'Enterprise', credits: 2000, price: 50 },
      ]
    }

    return NextResponse.json({ packages })
  } catch (error) {
    console.error('Error fetching packages:', error)
    return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 })
  }
}
