'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Coins,
  ArrowUpCircle,
  ArrowDownCircle,
  Settings,
  Users,
  Phone,
  Plus,
  Minus,
  Check,
  X,
  ChevronRight,
  Shield,
  Zap,
  Star,
  CreditCard,
  Clock,
  RefreshCw,
  MessageCircle,
  ExternalLink,
  Loader2,
  Trash2,
  Save,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserInfo {
  id: string
  email: string
  name: string | null
  role: string
  credits: number
  transactionCount?: number
  createdAt?: string
  updatedAt?: string
}

interface Transaction {
  id: string
  amount: number
  type: string
  description: string
  adminId?: string | null
  createdAt: string
}

interface CreditPackage {
  id: string
  name: string
  credits: number
  price: number
}

interface OrderInfo {
  whatsappNumber: string
  packages: CreditPackage[]
  message: string
  whatsappUrl: string
}

interface AdminSettings {
  [key: string]: {
    value: string
    description: string | null
    updatedAt: string
  }
}

// ─── API Helpers ─────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

// ─── Animated Counter ────────────────────────────────────────────────────────

function AnimatedCounter({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const start = display
    const end = value
    const diff = end - start
    if (diff === 0) return

    const startTime = performance.now()
    let rafId: number

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(start + diff * eased))
      if (progress < 1) {
        rafId = requestAnimationFrame(animate)
      }
    }

    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration])

  return <span>{display.toLocaleString()}</span>
}

// ─── Transaction Type Helpers ────────────────────────────────────────────────

function getTransactionIcon(type: string) {
  switch (type) {
    case 'purchase':
      return <CreditCard className="size-4 text-emerald-400" />
    case 'admin_add':
      return <ArrowUpCircle className="size-4 text-emerald-400" />
    case 'admin_deduct':
      return <ArrowDownCircle className="size-4 text-red-400" />
    case 'bonus':
      return <Sparkles className="size-4 text-amber-400" />
    case 'usage':
      return <Minus className="size-4 text-red-400" />
    default:
      return <Coins className="size-4 text-slate-400" />
  }
}

function getTransactionLabel(type: string) {
  switch (type) {
    case 'purchase':
      return 'Achat'
    case 'admin_add':
      return 'Crédit Admin'
    case 'admin_deduct':
      return 'Déduction Admin'
    case 'bonus':
      return 'Bonus'
    case 'usage':
      return 'Utilisation'
    default:
      return type
  }
}

// ─── Main App Component ─────────────────────────────────────────────────────

export default function Home() {
  // State
  const [currentView, setCurrentView] = useState<'user' | 'admin'>('user')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [users, setUsers] = useState<UserInfo[]>([])
  const [userData, setUserData] = useState<UserInfo | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null)
  const [adminSettings, setAdminSettings] = useState<AdminSettings>({})
  const [loading, setLoading] = useState(true)

  // Admin dialog state
  const [creditDialogOpen, setCreditDialogOpen] = useState(false)
  const [creditDialogUser, setCreditDialogUser] = useState<UserInfo | null>(null)
  const [creditDialogMode, setCreditDialogMode] = useState<'add' | 'deduct'>('add')
  const [creditAmount, setCreditAmount] = useState('')
  const [creditDescription, setCreditDescription] = useState('')
  const [creditSubmitting, setCreditSubmitting] = useState(false)

  // Admin settings state
  const [whatsappInput, setWhatsappInput] = useState('')
  const [packagesInput, setPackagesInput] = useState<CreditPackage[]>([])
  const [settingsSaving, setSettingsSaving] = useState(false)

  // ─── Data Loading ──────────────────────────────────────────────────────────

  const loadUsers = useCallback(async () => {
    try {
      const data = await apiFetch<{ users: UserInfo[] }>('/api/admin/users')
      setUsers(data.users)
      return data.users
    } catch (err) {
      console.error('Error loading users:', err)
      return []
    }
  }, [])

  const loadUserData = useCallback(async (userId: string) => {
    try {
      const data = await apiFetch<{
        user: UserInfo
        transactions: Transaction[]
      }>(`/api/credits?userId=${userId}`)
      setUserData(data.user)
      setTransactions(data.transactions)
    } catch (err) {
      console.error('Error loading user data:', err)
    }
  }, [])

  const loadOrderInfo = useCallback(async () => {
    try {
      const data = await apiFetch<OrderInfo>('/api/credits/order')
      setOrderInfo(data)
    } catch (err) {
      console.error('Error loading order info:', err)
    }
  }, [])

  const loadAdminSettings = useCallback(async () => {
    try {
      const data = await apiFetch<{ settings: AdminSettings }>('/api/admin/settings')
      setAdminSettings(data.settings)
      if (data.settings.whatsapp_number) {
        setWhatsappInput(data.settings.whatsapp_number.value)
      }
      if (data.settings.credit_packages) {
        try {
          setPackagesInput(JSON.parse(data.settings.credit_packages.value))
        } catch {
          setPackagesInput([])
        }
      }
    } catch (err) {
      console.error('Error loading admin settings:', err)
    }
  }, [])

  // Initial load
  useEffect(() => {
    async function init() {
      setLoading(true)
      // Load admin settings first (this also seeds defaults)
      await loadAdminSettings()
      // Load users
      const usersList = await loadUsers()
      // Load order info
      await loadOrderInfo()
      // Set default user (first non-admin, or first user)
      const regularUser = usersList.find((u) => u.role !== 'admin')
      const adminUser = usersList.find((u) => u.role === 'admin')
      const defaultUser = regularUser || adminUser || usersList[0]
      if (defaultUser) {
        setCurrentUserId(defaultUser.id)
        await loadUserData(defaultUser.id)
      }
      setLoading(false)
    }
    init()
  }, [loadAdminSettings, loadUsers, loadOrderInfo, loadUserData])

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleSwitchView = async (view: 'user' | 'admin') => {
    setCurrentView(view)
    if (view === 'admin') {
      await loadAdminSettings()
      await loadUsers()
    }
  }

  const handleSwitchUser = async (userId: string) => {
    setCurrentUserId(userId)
    await loadUserData(userId)
  }

  const handleOpenCreditDialog = (user: UserInfo, mode: 'add' | 'deduct') => {
    setCreditDialogUser(user)
    setCreditDialogMode(mode)
    setCreditAmount('')
    setCreditDescription('')
    setCreditDialogOpen(true)
  }

  const handleSubmitCredit = async () => {
    if (!creditDialogUser || !creditAmount || !creditDescription) {
      toast.error('Veuillez remplir tous les champs')
      return
    }

    const amount = Number(creditAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Le montant doit être un nombre positif')
      return
    }

    setCreditSubmitting(true)
    try {
      const finalAmount = creditDialogMode === 'deduct' ? -amount : amount
      await apiFetch('/api/admin/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: creditDialogUser.id,
          amount: finalAmount,
          type: creditDialogMode === 'add' ? 'admin_add' : 'admin_deduct',
          description: creditDescription,
          adminId: 'admin',
        }),
      })

      toast.success(
        creditDialogMode === 'add'
          ? `${amount} crédits ajoutés avec succès`
          : `${amount} crédits déduits avec succès`
      )

      setCreditDialogOpen(false)
      await loadUsers()
      if (currentUserId === creditDialogUser.id) {
        await loadUserData(currentUserId)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'opération')
    } finally {
      setCreditSubmitting(false)
    }
  }

  const handleSaveSettings = async () => {
    setSettingsSaving(true)
    try {
      await apiFetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            whatsapp_number: {
              value: whatsappInput,
              description: 'WhatsApp number for credit orders',
            },
            credit_packages: {
              value: JSON.stringify(packagesInput),
              description: 'Available credit packages (JSON array)',
            },
          },
        }),
      })

      toast.success('Paramètres sauvegardés avec succès')
      await loadAdminSettings()
      await loadOrderInfo()
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde des paramètres')
      console.error(err)
    } finally {
      setSettingsSaving(false)
    }
  }

  const handleAddPackage = () => {
    const newId = `pkg_${Date.now()}`
    setPackagesInput([...packagesInput, { id: newId, name: '', credits: 0, price: 0 }])
  }

  const handleRemovePackage = (id: string) => {
    setPackagesInput(packagesInput.filter((p) => p.id !== id))
  }

  const handleUpdatePackage = (id: string, field: keyof CreditPackage, value: string | number) => {
    setPackagesInput(
      packagesInput.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    )
  }

  // ─── Loading State ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="size-12 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full"
        />
      </div>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-100 flex flex-col">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Zap className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-50">
                AENEWS<span className="text-emerald-400 ml-1">Agent OS X</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">
                Credit Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* User switcher */}
            <select
              value={currentUserId}
              onChange={(e) => handleSwitchUser(e.target.value)}
              className="h-8 rounded-md border border-slate-700 bg-slate-800/50 text-xs text-slate-300 px-2 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 max-w-[160px] sm:max-w-[200px]"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email} ({u.role})
                </option>
              ))}
            </select>

            {/* View toggle */}
            <div className="flex items-center bg-slate-800/50 rounded-lg border border-slate-700/50 p-0.5">
              <button
                onClick={() => handleSwitchView('user')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  currentView === 'user'
                    ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <CreditCard className="size-3" />
                  <span className="hidden sm:inline">Utilisateur</span>
                </span>
              </button>
              <button
                onClick={() => handleSwitchView('admin')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  currentView === 'admin'
                    ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Shield className="size-3" />
                  <span className="hidden sm:inline">Admin</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Content ────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        <AnimatePresence mode="wait">
          {currentView === 'user' ? (
            <motion.div
              key="user"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <UserDashboard
                user={userData}
                transactions={transactions}
                orderInfo={orderInfo}
                onRefresh={() => loadUserData(currentUserId)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <AdminPanel
                users={users}
                adminSettings={adminSettings}
                whatsappInput={whatsappInput}
                setWhatsappInput={setWhatsappInput}
                packagesInput={packagesInput}
                setPackagesInput={setPackagesInput}
                settingsSaving={settingsSaving}
                onSaveSettings={handleSaveSettings}
                onAddPackage={handleAddPackage}
                onRemovePackage={handleRemovePackage}
                onUpdatePackage={handleUpdatePackage}
                onOpenCreditDialog={handleOpenCreditDialog}
                onRefreshUsers={loadUsers}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ─── Credit Operation Dialog ─────────────────────────────────────── */}
      <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {creditDialogMode === 'add' ? (
                <>
                  <ArrowUpCircle className="size-5 text-emerald-400" />
                  Ajouter des crédits
                </>
              ) : (
                <>
                  <ArrowDownCircle className="size-5 text-red-400" />
                  Déduire des crédits
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {creditDialogMode === 'add' ? 'Ajouter' : 'Déduire'} des crédits pour{' '}
              <span className="text-slate-200 font-medium">
                {creditDialogUser?.name || creditDialogUser?.email}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">Montant</Label>
              <div className="relative">
                <Coins className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                <Input
                  type="number"
                  min="1"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  placeholder="Entrez le montant"
                  className="pl-9 bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:ring-emerald-500/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">Description / Raison</Label>
              <Input
                value={creditDescription}
                onChange={(e) => setCreditDescription(e.target.value)}
                placeholder="Raison de l'opération"
                className="bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:ring-emerald-500/50"
              />
            </div>
            {creditDialogUser && (
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
                <p className="text-xs text-slate-500">
                  Solde actuel:{' '}
                  <span className="text-emerald-400 font-semibold">
                    {creditDialogUser.credits.toLocaleString()} crédits
                  </span>
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreditDialogOpen(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmitCredit}
              disabled={creditSubmitting}
              className={
                creditDialogMode === 'add'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }
            >
              {creditSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Traitement...
                </>
              ) : creditDialogMode === 'add' ? (
                <>
                  <Plus className="size-4" />
                  Ajouter
                </>
              ) : (
                <>
                  <Minus className="size-4" />
                  Déduire
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/60 bg-[#0a0a0f]/80 backdrop-blur-xl mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-slate-600">
            © 2025 AENEWS Agent OS X — Credit Management System
          </p>
          <p className="text-xs text-slate-600 flex items-center gap-1">
            <Zap className="size-3" /> Powered by AENEWS
          </p>
        </div>
      </footer>
    </div>
  )
}

// ─── User Dashboard Component ────────────────────────────────────────────────

function UserDashboard({
  user,
  transactions,
  orderInfo,
  onRefresh,
}: {
  user: UserInfo | null
  transactions: Transaction[]
  orderInfo: OrderInfo | null
  onRefresh: () => void
}) {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await onRefresh()
    setTimeout(() => setRefreshing(false), 500)
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-500">Aucun utilisateur sélectionné</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ─── Credit Balance Card ─────────────────────────────────────────── */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 border-slate-800 overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent" />
          <CardHeader className="relative pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-sm flex items-center gap-2">
                <Coins className="size-4 text-emerald-400" />
                Solde de crédits
              </CardDescription>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                className="size-8 text-slate-500 hover:text-emerald-400"
              >
                <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="flex items-end gap-3">
              <span className="text-5xl sm:text-6xl font-bold text-slate-50 tabular-nums tracking-tight">
                <AnimatedCounter value={user.credits} />
              </span>
              <span className="text-lg text-emerald-400/80 font-medium mb-2">crédits</span>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
              >
                {user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
              </Badge>
              <span className="text-xs text-slate-500">{user.email}</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Order Credits + Packages Row ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* WhatsApp CTA */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1"
        >
          <Card className="bg-slate-900 border-slate-800 h-full flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <MessageCircle className="size-4 text-[#25D366]" />
                Commander des Crédits
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs">
                Passez votre commande via WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center">
              <a
                href={orderInfo?.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button
                  className="w-full h-12 text-base font-semibold bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-lg shadow-[#25D366]/20"
                  size="lg"
                >
                  <MessageCircle className="size-5 mr-2" />
                  Commander via WhatsApp
                  <ExternalLink className="size-4 ml-1 opacity-60" />
                </Button>
              </a>
              {orderInfo?.whatsappNumber && (
                <p className="text-center text-xs text-slate-600 mt-2 flex items-center justify-center gap-1">
                  <Phone className="size-3" />
                  {orderInfo.whatsappNumber}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Credit Packages */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-2"
        >
          <Card className="bg-slate-900 border-slate-800 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Star className="size-4 text-amber-400" />
                Packages de Crédits
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs">
                Choisissez le package qui vous convient
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {orderInfo?.packages.map((pkg, i) => (
                  <motion.div
                    key={pkg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                    className="relative group"
                  >
                    <div
                      className={`rounded-xl border p-4 transition-all duration-200 cursor-pointer hover:scale-[1.02] ${
                        pkg.name === 'Pro' || pkg.id === 'pro'
                          ? 'border-emerald-500/40 bg-emerald-500/5 shadow-lg shadow-emerald-500/10'
                          : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600/50'
                      }`}
                    >
                      {(pkg.name === 'Pro' || pkg.id === 'pro') && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                          <Badge className="bg-emerald-500 text-white text-[10px] px-2 py-0 shadow-md">
                            Populaire
                          </Badge>
                        </div>
                      )}
                      <div className="text-center">
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                          {pkg.name}
                        </p>
                        <p className="text-2xl font-bold text-slate-50">
                          {pkg.credits.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500 mb-2">crédits</p>
                        <Separator className="bg-slate-700/50 my-2" />
                        <p className="text-lg font-semibold text-emerald-400">${pkg.price}</p>
                        <p className="text-[10px] text-slate-600">
                          ${(pkg.price / pkg.credits * 100).toFixed(1)} / 100 crédits
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {(!orderInfo?.packages || orderInfo.packages.length === 0) && (
                  <div className="col-span-3 text-center py-8 text-slate-600 text-sm">
                    Aucun package disponible
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── Transaction History ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Clock className="size-4 text-slate-400" />
                Historique des Transactions
              </CardTitle>
              <Badge variant="outline" className="border-slate-700 text-slate-500 text-xs">
                {transactions.length} transactions
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <Coins className="size-10 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Aucune transaction pour le moment</p>
                <p className="text-slate-600 text-xs mt-1">
                  Commandez des crédits pour commencer
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-96">
                <div className="space-y-2 pr-4">
                  {transactions.map((t, i) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-800/50 bg-slate-800/20 hover:bg-slate-800/40 transition-colors"
                    >
                      <div
                        className={`size-9 rounded-full flex items-center justify-center shrink-0 ${
                          t.amount > 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'
                        }`}
                      >
                        {getTransactionIcon(t.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-200">
                            {getTransactionLabel(t.type)}
                          </p>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 ${
                              t.amount > 0
                                ? 'border-emerald-500/30 text-emerald-400'
                                : 'border-red-500/30 text-red-400'
                            }`}
                          >
                            {t.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{t.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className={`text-sm font-semibold tabular-nums ${
                            t.amount > 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {t.amount > 0 ? '+' : ''}
                          {t.amount.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-slate-600">
                          {new Date(t.createdAt).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

// ─── Admin Panel Component ───────────────────────────────────────────────────

function AdminPanel({
  users,
  adminSettings,
  whatsappInput,
  setWhatsappInput,
  packagesInput,
  settingsSaving,
  onSaveSettings,
  onAddPackage,
  onRemovePackage,
  onUpdatePackage,
  onOpenCreditDialog,
  onRefreshUsers,
}: {
  users: UserInfo[]
  adminSettings: AdminSettings
  whatsappInput: string
  setWhatsappInput: (v: string) => void
  packagesInput: CreditPackage[]
  setPackagesInput: (v: CreditPackage[]) => void
  settingsSaving: boolean
  onSaveSettings: () => void
  onAddPackage: () => void
  onRemovePackage: (id: string) => void
  onUpdatePackage: (id: string, field: keyof CreditPackage, value: string | number) => void
  onOpenCreditDialog: (user: UserInfo, mode: 'add' | 'deduct') => void
  onRefreshUsers: () => void
}) {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await onRefreshUsers()
    setTimeout(() => setRefreshing(false), 500)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Shield className="size-5 text-emerald-400" />
            Panneau d&apos;Administration
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gérez les paramètres, utilisateurs et crédits
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="border-slate-700 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30"
        >
          <RefreshCw className={`size-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="bg-slate-800/50 border border-slate-700/50">
          <TabsTrigger value="users" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            <Users className="size-3.5 mr-1.5" />
            Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            <Settings className="size-3.5 mr-1.5" />
            Paramètres
          </TabsTrigger>
        </TabsList>

        {/* ─── Users Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="users">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Users className="size-4 text-slate-400" />
                Gestion des Utilisateurs
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs">
                {users.length} utilisateur{users.length !== 1 ? 's' : ''} enregistré{users.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400 text-xs">Utilisateur</TableHead>
                      <TableHead className="text-slate-400 text-xs">Rôle</TableHead>
                      <TableHead className="text-slate-400 text-xs text-right">Crédits</TableHead>
                      <TableHead className="text-slate-400 text-xs text-right">Transactions</TableHead>
                      <TableHead className="text-slate-400 text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id} className="border-slate-800/50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className={`size-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                                u.role === 'admin'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-slate-700/50 text-slate-400'
                              }`}
                            >
                              {(u.name || u.email).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-200">
                                {u.name || 'Sans nom'}
                              </p>
                              <p className="text-xs text-slate-500">{u.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              u.role === 'admin'
                                ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                                : 'border-slate-600 text-slate-400'
                            }`}
                          >
                            {u.role === 'admin' ? 'Admin' : 'Utilisateur'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm font-semibold text-emerald-400 tabular-nums">
                            {u.credits.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-xs text-slate-500 tabular-nums">
                            {u.transactionCount || 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onOpenCreditDialog(u, 'add')}
                              className="h-7 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                            >
                              <Plus className="size-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onOpenCreditDialog(u, 'deduct')}
                              className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Minus className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Settings Tab ──────────────────────────────────────────────── */}
        <TabsContent value="settings">
          <div className="space-y-4">
            {/* WhatsApp Settings */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Phone className="size-4 text-[#25D366]" />
                  Numéro WhatsApp
                </CardTitle>
                <CardDescription className="text-slate-500 text-xs">
                  Numéro utilisé pour les commandes de crédits via WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                    <Input
                      value={whatsappInput}
                      onChange={(e) => setWhatsappInput(e.target.value)}
                      placeholder="+243XXXXXXXXX"
                      className="pl-9 bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div className="text-xs text-slate-600 bg-slate-800/30 rounded-lg px-3 py-2 border border-slate-700/50">
                    Actuel:{' '}
                    <span className="text-slate-400">
                      {adminSettings.whatsapp_number?.value || '—'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Credit Packages Settings */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                      <Star className="size-4 text-amber-400" />
                      Packages de Crédits
                    </CardTitle>
                    <CardDescription className="text-slate-500 text-xs">
                      Configurez les packages disponibles pour les utilisateurs
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onAddPackage}
                    className="border-slate-700 text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/30"
                  >
                    <Plus className="size-4 mr-1" />
                    Ajouter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {packagesInput.map((pkg, i) => (
                    <motion.div
                      key={pkg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-800 bg-slate-800/20"
                    >
                      <div className="size-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-emerald-400">{i + 1}</span>
                      </div>
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-[10px] text-slate-500 uppercase tracking-wider">Nom</Label>
                          <Input
                            value={pkg.name}
                            onChange={(e) => onUpdatePackage(pkg.id, 'name', e.target.value)}
                            placeholder="Nom"
                            className="h-8 text-sm bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:ring-emerald-500/50"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-slate-500 uppercase tracking-wider">Crédits</Label>
                          <Input
                            type="number"
                            value={pkg.credits}
                            onChange={(e) =>
                              onUpdatePackage(pkg.id, 'credits', Number(e.target.value))
                            }
                            placeholder="100"
                            className="h-8 text-sm bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:ring-emerald-500/50"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-slate-500 uppercase tracking-wider">Prix ($)</Label>
                          <Input
                            type="number"
                            value={pkg.price}
                            onChange={(e) =>
                              onUpdatePackage(pkg.id, 'price', Number(e.target.value))
                            }
                            placeholder="5"
                            className="h-8 text-sm bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:ring-emerald-500/50"
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemovePackage(pkg.id)}
                        className="size-8 text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </motion.div>
                  ))}
                  {packagesInput.length === 0 && (
                    <div className="text-center py-8">
                      <Star className="size-8 text-slate-700 mx-auto mb-2" />
                      <p className="text-slate-500 text-sm">Aucun package configuré</p>
                      <p className="text-slate-600 text-xs mt-1">
                        Cliquez sur &quot;Ajouter&quot; pour créer un package
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={onSaveSettings}
                disabled={settingsSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
                size="lg"
              >
                {settingsSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    Sauvegarder les paramètres
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
