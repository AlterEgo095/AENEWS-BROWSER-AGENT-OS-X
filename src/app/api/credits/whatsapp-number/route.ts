import { db } from '@/lib/db'
import { proxyToBackend } from '@/lib/backend-proxy'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Try backend proxy first
    const backendResult = await proxyToBackend('/credits/whatsapp-number')
    if (backendResult?.ok) {
      return NextResponse.json(backendResult.data)
    }

    // Fallback to Prisma/SQLite
    const whatsappSetting = await db.adminSettings.findUnique({
      where: { key: 'whatsapp_number' },
    })

    const whatsappNumber = whatsappSetting?.value || '+243816515095'

    return NextResponse.json({ whatsappNumber })
  } catch (error) {
    console.error('Error fetching WhatsApp number:', error)
    return NextResponse.json({ error: 'Failed to fetch WhatsApp number' }, { status: 500 })
  }
}
