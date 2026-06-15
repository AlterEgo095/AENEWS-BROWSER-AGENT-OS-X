import { db } from '@/lib/db'
import { proxyToBackend } from '@/lib/backend-proxy'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Try backend proxy first
    const backendResult = await proxyToBackend('/credits/order')
    if (backendResult?.ok) {
      return NextResponse.json(backendResult.data)
    }

    // Fallback to Prisma/SQLite
    const whatsappSetting = await db.adminSettings.findUnique({
      where: { key: 'whatsapp_number' },
    })
    const packagesSetting = await db.adminSettings.findUnique({
      where: { key: 'credit_packages' },
    })

    const whatsappNumber = whatsappSetting?.value || '+243816515095'
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

    const message = 'Bonjour, je souhaite commander des crédits AENEWS Agent OS X.'
    const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/[^0-9+]/g, '')}?text=${encodeURIComponent(message)}`

    return NextResponse.json({
      whatsappNumber,
      packages,
      message,
      whatsappUrl,
    })
  } catch (error) {
    console.error('Error fetching order info:', error)
    return NextResponse.json({ error: 'Failed to fetch order information' }, { status: 500 })
  }
}
