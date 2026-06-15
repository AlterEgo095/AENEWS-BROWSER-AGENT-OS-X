'use client';

import { useEffect, useState } from 'react';
import {
  Wallet,
  Coins,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Gift,
  Shield,
  Star,
  Check,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { CreditInfo, CreditTransaction, CreditPackage } from '@/lib/types';

// Fallback defaults
const FALLBACK_PACKAGES: CreditPackage[] = [
  { id: 'starter', name: 'Starter', credits: 100, price: 5 },
  { id: 'pro', name: 'Pro', credits: 500, price: 20, popular: true },
  { id: 'enterprise', name: 'Enterprise', credits: 2000, price: 50 },
];

const FALLBACK_WHATSAPP = '243816515095';

export default function CreditsPage() {
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
  const [packages, setPackages] = useState<CreditPackage[]>(FALLBACK_PACKAGES);
  const [whatsappNumber, setWhatsappNumber] = useState(FALLBACK_WHATSAPP);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  useEffect(() => {
    fetchCreditsData();
  }, []);

  async function fetchCreditsData() {
    setLoading(true);
    try {
      // Try the order info endpoint first (combines packages + whatsapp)
      const orderInfo = await api.getCreditsOrderInfo();
      if (orderInfo.packages && orderInfo.packages.length > 0) {
        setPackages(orderInfo.packages);
      }
      if (orderInfo.whatsappNumber) {
        setWhatsappNumber(orderInfo.whatsappNumber);
      }
    } catch {
      // Fallback - try individual endpoints
      try {
        const packagesRes = await api.getCreditsPackages();
        if (Array.isArray(packagesRes) && packagesRes.length > 0) {
          setPackages(packagesRes);
        }
      } catch { /* use fallback */ }
      try {
        const whatsappRes = await api.getCreditsWhatsappNumber();
        if (whatsappRes?.number) {
          setWhatsappNumber(whatsappRes.number);
        }
      } catch { /* use fallback */ }
    }

    // Fetch balance separately (needs user ID)
    try {
      // Use the current user's ID from auth store
      const { useAuthStore } = await import('@/store/auth-store');
      const user = useAuthStore.getState().user;
      if (user?.id) {
        const balance = await api.getCreditsBalance(user.id);
        setCreditInfo(balance);
      }
    } catch { /* use default */ }

    setLoading(false);
  }

  function handleWhatsAppOrder(pkg: CreditPackage) {
    const message = encodeURIComponent(
      `Hi! I'd like to purchase the ${pkg.name} package: ${pkg.credits} credits for $${pkg.price}.`
    );
    const url = `https://wa.me/${whatsappNumber}?text=${message}`;
    window.open(url, '_blank');
  }

  function getTransactionIcon(type: CreditTransaction['type']) {
    switch (type) {
      case 'purchase':
        return <ArrowDownLeft className="h-4 w-4 text-emerald-400" />;
      case 'usage':
        return <ArrowUpRight className="h-4 w-4 text-red-400" />;
      case 'admin_add':
        return <Shield className="h-4 w-4 text-blue-400" />;
      case 'admin_deduct':
        return <Shield className="h-4 w-4 text-amber-400" />;
      case 'bonus':
        return <Gift className="h-4 w-4 text-purple-400" />;
      default:
        return <Coins className="h-4 w-4 text-muted-foreground" />;
    }
  }

  function getTransactionColor(type: CreditTransaction['type']) {
    switch (type) {
      case 'purchase':
      case 'admin_add':
      case 'bonus':
        return 'text-emerald-400';
      case 'usage':
      case 'admin_deduct':
        return 'text-red-400';
      default:
        return 'text-muted-foreground';
    }
  }

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Coins className="h-6 w-6 text-yellow-400" />
            Credits
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your credits and purchase packages
          </p>
        </div>
        <button
          onClick={fetchCreditsData}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/5"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Balance Card */}
      <div className="relative rounded-xl border border-border bg-card overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-amber-500/5" />
        <div className="relative p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Current Balance</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-foreground">
                  {loading ? (
                    <span className="inline-block h-10 w-24 animate-shimmer rounded-lg" />
                  ) : (
                    <AnimatedCounter value={creditInfo?.balance ?? 0} />
                  )}
                </span>
                <Coins className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total Used</p>
                <p className="text-lg font-semibold text-foreground">{creditInfo?.totalUsed ?? 0}</p>
              </div>
              <div className="h-10 w-px bg-border" />
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total Purchased</p>
                <p className="text-lg font-semibold text-foreground">{creditInfo?.totalPurchased ?? 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Credit Packages */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Credit Packages
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {packages.map((pkg) => (
            <CreditPackageCard
              key={pkg.id}
              pkg={pkg}
              isSelected={selectedPackage === pkg.id}
              onSelect={() => setSelectedPackage(pkg.id)}
              onOrder={() => handleWhatsAppOrder(pkg)}
            />
          ))}
        </div>
      </div>

      {/* WhatsApp CTA */}
      <div className="rounded-xl border border-[#25D366]/30 bg-[#25D366]/5 p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366]/20">
              <MessageCircle className="h-5 w-5 text-[#25D366]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Order via WhatsApp</h3>
              <p className="text-xs text-muted-foreground">
                Contact us directly to purchase credits
              </p>
            </div>
          </div>
          <a
            href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hi! I'd like to purchase credits.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="sm:ml-auto inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#20bd5a]"
          >
            <MessageCircle className="h-4 w-4" />
            Open WhatsApp
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Transaction History */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Transaction History
        </h2>
        {creditInfo?.transactions && creditInfo.transactions.length > 0 ? (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="divide-y divide-border">
              {creditInfo.transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5">
                    {getTransactionIcon(tx.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{tx.description}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {tx.type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} • {formatRelativeTime(tx.createdAt)}
                    </p>
                  </div>
                  <span className={cn('text-sm font-semibold', getTransactionColor(tx.type))}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-border bg-card">
            <Wallet className="h-10 w-10 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">No transactions yet</p>
            <p className="text-xs text-muted-foreground/70">Purchase credits to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Animated Counter ─────────────────────────────────────────────────────── */

function AnimatedCounter({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (displayValue === value) return;
    const duration = 800;
    const startTime = Date.now();
    const startValue = displayValue;

    function animate() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(startValue + (value - startValue) * eased));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{displayValue.toLocaleString()}</>;
}

/* ─── Credit Package Card ──────────────────────────────────────────────────── */

function CreditPackageCard({
  pkg,
  isSelected,
  onSelect,
  onOrder,
}: {
  pkg: CreditPackage;
  isSelected: boolean;
  onSelect: () => void;
  onOrder: () => void;
}) {
  const isPopular = pkg.popular;
  const pricePerCredit = (pkg.price / pkg.credits).toFixed(3);

  return (
    <div
      onClick={onSelect}
      className={cn(
        'relative rounded-xl border p-5 transition-all duration-200 cursor-pointer',
        isSelected
          ? 'border-yellow-500/50 ring-1 ring-yellow-500/30'
          : 'border-border hover:border-yellow-500/20',
        isPopular && 'border-yellow-500/30'
      )}
    >
      {/* Popular Badge */}
      {isPopular && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 px-3 py-0.5 text-[10px] font-bold text-black shadow-lg">
            <Star className="h-2.5 w-2.5 fill-current" />
            MOST POPULAR
          </span>
        </div>
      )}

      {/* Gradient Background */}
      <div
        className={cn(
          'absolute inset-0 rounded-xl bg-gradient-to-br opacity-5 transition-opacity',
          isPopular ? 'from-yellow-500 to-amber-500' : 'from-slate-500 to-gray-500',
          isSelected ? 'opacity-15' : 'opacity-5'
        )}
      />

      <div className="relative z-10">
        {/* Package Name */}
        <h3 className="text-lg font-bold text-foreground">{pkg.name}</h3>

        {/* Credits */}
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-3xl font-bold text-foreground">{pkg.credits.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground">credits</span>
        </div>

        {/* Price */}
        <div className="mt-2">
          <span className="text-2xl font-bold text-foreground">${pkg.price}</span>
          <span className="ml-1 text-xs text-muted-foreground">
            (${pricePerCredit}/credit)
          </span>
        </div>

        {/* Features */}
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Check className="h-3 w-3 text-emerald-400" />
            Instant activation
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Check className="h-3 w-3 text-emerald-400" />
            No expiration
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Check className="h-3 w-3 text-emerald-400" />
            All agents access
          </div>
          {pkg.credits >= 500 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Check className="h-3 w-3 text-emerald-400" />
              Priority support
            </div>
          )}
          {pkg.credits >= 2000 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Check className="h-3 w-3 text-emerald-400" />
              Dedicated account manager
            </div>
          )}
        </div>

        {/* Order Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOrder();
          }}
          className={cn(
            'mt-4 w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors',
            isPopular
              ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black hover:from-yellow-400 hover:to-amber-400'
              : 'bg-white/10 text-foreground hover:bg-white/15'
          )}
        >
          <MessageCircle className="h-4 w-4" />
          Order via WhatsApp
        </button>
      </div>
    </div>
  );
}
