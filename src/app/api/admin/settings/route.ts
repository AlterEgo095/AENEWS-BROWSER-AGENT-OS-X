import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

const DEFAULT_SETTINGS: Record<string, { value: string; description: string }> = {
  whatsapp_number: {
    value: '+243816515095',
    description: 'WhatsApp number for credit orders',
  },
  credit_packages: {
    value: JSON.stringify([
      { id: 'starter', name: 'Starter', credits: 100, price: 5 },
      { id: 'pro', name: 'Pro', credits: 500, price: 20 },
      { id: 'enterprise', name: 'Enterprise', credits: 2000, price: 50 },
    ]),
    description: 'Available credit packages (JSON array)',
  },
}

async function seedDefaults() {
  for (const [key, config] of Object.entries(DEFAULT_SETTINGS)) {
    const existing = await db.adminSettings.findUnique({ where: { key } })
    if (!existing) {
      await db.adminSettings.create({
        data: { key, value: config.value, description: config.description },
      })
    }
  }
}

async function seedDemoUsers() {
  const adminExists = await db.user.findUnique({ where: { email: 'admin@aenews.com' } })
  if (!adminExists) {
    await db.user.create({
      data: { email: 'admin@aenews.com', name: 'Admin AENEWS', role: 'admin', credits: 9999 },
    })
  }
  const userExists = await db.user.findUnique({ where: { email: 'user@aenews.com' } })
  if (!userExists) {
    await db.user.create({
      data: { email: 'user@aenews.com', name: 'Utilisateur Demo', role: 'user', credits: 50 },
    })
  }
}

export async function GET() {
  try {
    await seedDefaults()
    await seedDemoUsers()

    const settings = await db.adminSettings.findMany({
      orderBy: { key: 'asc' },
    })

    const settingsMap: Record<string, { value: string; description: string | null; updatedAt: string }> = {}
    for (const s of settings) {
      settingsMap[s.key] = {
        value: s.value,
        description: s.description,
        updatedAt: s.updatedAt.toISOString(),
      }
    }

    return NextResponse.json({ settings: settingsMap })
  } catch (error) {
    console.error('Error fetching admin settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { settings } = body as {
      settings: Record<string, { value: string; description?: string }>
    }

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Invalid settings data' }, { status: 400 })
    }

    const results = []
    for (const [key, data] of Object.entries(settings)) {
      const upserted = await db.adminSettings.upsert({
        where: { key },
        update: { value: data.value, description: data.description },
        create: { key, value: data.value, description: data.description },
      })
      results.push(upserted)
    }

    return NextResponse.json({ success: true, updated: results.length })
  } catch (error) {
    console.error('Error updating admin settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
