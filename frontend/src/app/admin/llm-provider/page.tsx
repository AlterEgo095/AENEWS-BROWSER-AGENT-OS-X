'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Brain, Zap, Shield, AlertTriangle, CheckCircle2, XCircle,
  RefreshCw, ArrowRight, Cpu, Activity, Database, Key,
  ChevronDown, Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────

interface ProviderInfo {
  name: string;
  available: boolean;
  circuitState: string;
  inCooldown: boolean;
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalTokens: number;
    lastRequestAt: string | null;
    lastError: string | null;
  };
}

interface LLMConfig {
  defaultProvider: string;
  fallbackEnabled: boolean;
  secondaryProvider: string;
}

interface LLMHealth {
  status: string;
  defaultProvider: { name: string; available: boolean };
  fallback: { name: string; available: boolean } | null;
  recommendation: string;
}

// ─── Provider Display Config ────────────────────────────────────

const PROVIDER_DISPLAY: Record<string, { label: string; color: string; bgColor: string; icon: string; description: string }> = {
  zai: {
    label: 'Z-AI (GLM-4 Plus)',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20 border-blue-500/30',
    icon: '🧠',
    description: 'Primary provider — Built-in AI infrastructure, always available in deployment environment',
  },
  openai: {
    label: 'OpenAI (GPT-4o)',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20 border-green-500/30',
    icon: '⚡',
    description: 'OpenAI GPT-4o — Requires OPENAI_API_KEY environment variable',
  },
  anthropic: {
    label: 'Anthropic (Claude)',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20 border-purple-500/30',
    icon: '🔮',
    description: 'Anthropic Claude Sonnet 4 — Requires ANTHROPIC_API_KEY environment variable',
  },
};

// ─── Component ──────────────────────────────────────────────────

export default function LLMProviderPage() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [health, setHealth] = useState<LLMHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [selectedProvider, setSelectedProvider] = useState<string>('zai');
  const [fallbackEnabled, setFallbackEnabled] = useState(false);
  const [secondaryProvider, setSecondaryProvider] = useState<string>('anthropic');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [providersRes, configRes, healthRes] = await Promise.all([
        api.getLLMProviders(),
        api.getLLMConfig(),
        api.getLLMHealth(),
      ]);

      if (providersRes) setProviders(providersRes.providers as ProviderInfo[] || []);
      if (configRes) {
        setConfig(configRes.config);
        setSelectedProvider(configRes.config.defaultProvider);
        setFallbackEnabled(configRes.config.fallbackEnabled);
        setSecondaryProvider(configRes.config.secondaryProvider);
      }
      if (healthRes) setHealth(healthRes as LLMHealth);
    } catch (err: any) {
      setError(err.message || 'Failed to load LLM provider data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSwitchProvider = async () => {
    setSwitching(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await api.updateLLMConfig({
        defaultProvider: selectedProvider,
        fallbackEnabled,
        secondaryProvider: fallbackEnabled ? secondaryProvider : undefined,
      });
      if (result?.success) {
        setConfig(result.config as LLMConfig);
        setSuccess(`Provider switched to ${PROVIDER_DISPLAY[selectedProvider]?.label || selectedProvider}${result.warning ? ` — ${result.warning}` : ''}`);
        // Refresh data
        await fetchData();
      } else {
        setError(result?.warning || 'Failed to switch provider');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to switch provider');
    } finally {
      setSwitching(false);
    }
  };

  const handleInvalidateCache = async () => {
    try {
      const result = await api.invalidateLLMCache();
      if (result?.success) {
        setSuccess(`Cache invalidated — ${result.invalidatedEntries} entries cleared`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to invalidate cache');
    }
  };

  const getStatusColor = (available: boolean) => available ? 'text-green-400' : 'text-red-400';
  const getStatusIcon = (available: boolean) => available ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <XCircle className="w-5 h-5 text-red-400" />;
  const getCircuitColor = (state: string) => {
    switch (state) {
      case 'CLOSED': return 'text-green-400';
      case 'OPEN': return 'text-red-400';
      case 'HALF_OPEN': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/60">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading LLM Provider Configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold">AI Provider Management</h1>
              <p className="text-white/50 text-sm">Configure LLM providers — changes apply instantly to all agents</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-400">✕</button>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} className="ml-auto text-green-400/60 hover:text-green-400">✕</button>
          </div>
        )}

        {/* Health Status Card */}
        {health && (
          <div className={cn(
            'rounded-xl border p-6',
            health.status === 'healthy' ? 'bg-green-500/5 border-green-500/20' : 'bg-yellow-500/5 border-yellow-500/20',
          )}>
            <div className="flex items-center gap-3 mb-3">
              {health.status === 'healthy' ? (
                <Activity className="w-6 h-6 text-green-400" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
              )}
              <h2 className="text-lg font-semibold">
                System Status: {health.status === 'healthy' ? 'Operational' : 'Degraded'}
              </h2>
            </div>
            <p className="text-white/60 text-sm mb-4">{health.recommendation}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                {getStatusIcon(health.defaultProvider.available)}
                <div>
                  <p className="text-sm text-white/50">Default Provider</p>
                  <p className={cn('font-medium', getStatusColor(health.defaultProvider.available))}>
                    {PROVIDER_DISPLAY[health.defaultProvider.name]?.label || health.defaultProvider.name}
                  </p>
                </div>
              </div>
              {health.fallback && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                  {getStatusIcon(health.fallback.available)}
                  <div>
                    <p className="text-sm text-white/50">Fallback Provider</p>
                    <p className={cn('font-medium', getStatusColor(health.fallback.available))}>
                      {PROVIDER_DISPLAY[health.fallback.name]?.label || health.fallback.name}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Provider Cards */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-400" />
              Available Providers
            </h2>
            {providers.map((provider) => {
              const display = PROVIDER_DISPLAY[provider.name] || {
                label: provider.name,
                color: 'text-gray-400',
                bgColor: 'bg-gray-500/20 border-gray-500/30',
                icon: '🤖',
                description: 'Unknown provider',
              };
              const isActive = config?.defaultProvider === provider.name;
              const successRate = provider.metrics.totalRequests > 0
                ? ((provider.metrics.successfulRequests / provider.metrics.totalRequests) * 100).toFixed(1)
                : 'N/A';

              return (
                <div
                  key={provider.name}
                  className={cn(
                    'rounded-xl border p-5 transition-all',
                    isActive ? 'border-blue-500/40 bg-blue-500/5 ring-1 ring-blue-500/20' : 'border-white/10 bg-white/[0.02]',
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{display.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className={cn('font-semibold', display.color)}>{display.label}</h3>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-white/40 text-xs mt-0.5">{display.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(provider.available)}
                      <span className={cn('text-sm font-medium', getStatusColor(provider.available))}>
                        {provider.available ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-4 gap-3 mt-4">
                    <div className="p-2 rounded-lg bg-white/5 text-center">
                      <p className="text-white/40 text-xs">Requests</p>
                      <p className="font-medium text-sm">{provider.metrics.totalRequests.toLocaleString()}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5 text-center">
                      <p className="text-white/40 text-xs">Success Rate</p>
                      <p className={cn('font-medium text-sm', successRate === '100.0' ? 'text-green-400' : successRate === 'N/A' ? 'text-white/30' : 'text-yellow-400')}>
                        {successRate}%
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5 text-center">
                      <p className="text-white/40 text-xs">Tokens</p>
                      <p className="font-medium text-sm">{provider.metrics.totalTokens.toLocaleString()}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5 text-center">
                      <p className="text-white/40 text-xs">Circuit</p>
                      <p className={cn('font-medium text-sm', getCircuitColor(provider.circuitState))}>
                        {provider.circuitState}
                      </p>
                    </div>
                  </div>

                  {provider.metrics.lastError && (
                    <div className="mt-3 p-2 rounded-lg bg-red-500/10 text-red-400 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>Last error: {provider.metrics.lastError}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Configuration Panel */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Switch Provider
            </h2>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-5">
              {/* Provider Selection */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Default Provider</label>
                <div className="space-y-2">
                  {Object.entries(PROVIDER_DISPLAY).map(([key, display]) => {
                    const providerInfo = providers.find(p => p.name === key);
                    const isSelected = selectedProvider === key;

                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedProvider(key)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                          isSelected
                            ? 'border-blue-500/40 bg-blue-500/10'
                            : 'border-white/10 bg-white/[0.02] hover:bg-white/5',
                        )}
                      >
                        <span className="text-lg">{display.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm font-medium', display.color)}>{display.label}</p>
                          <p className="text-white/30 text-xs truncate">{display.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {providerInfo && (
                            <span className={cn('text-xs', getStatusColor(providerInfo.available))}>
                              {providerInfo.available ? '✓' : '✗'}
                            </span>
                          )}
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-white" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fallback Configuration */}
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm text-white/60">Fallback Provider</label>
                  <button
                    onClick={() => setFallbackEnabled(!fallbackEnabled)}
                    className={cn(
                      'relative w-10 h-5 rounded-full transition-colors',
                      fallbackEnabled ? 'bg-blue-500' : 'bg-white/20',
                    )}
                  >
                    <div className={cn(
                      'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                      fallbackEnabled ? 'translate-x-5' : 'translate-x-0.5',
                    )} />
                  </button>
                </div>

                {fallbackEnabled && (
                  <div className="space-y-2">
                    {Object.entries(PROVIDER_DISPLAY)
                      .filter(([key]) => key !== selectedProvider)
                      .map(([key, display]) => (
                        <button
                          key={key}
                          onClick={() => setSecondaryProvider(key)}
                          className={cn(
                            'w-full flex items-center gap-2 p-2 rounded-lg border transition-all text-left',
                            secondaryProvider === key
                              ? 'border-purple-500/40 bg-purple-500/10'
                              : 'border-white/5 bg-white/[0.02] hover:bg-white/5',
                          )}
                        >
                          <span className="text-sm">{display.icon}</span>
                          <span className={cn('text-xs', display.color)}>{display.label}</span>
                        </button>
                      ))}
                  </div>
                )}

                <p className="text-white/30 text-xs mt-2">
                  {fallbackEnabled
                    ? `If ${PROVIDER_DISPLAY[selectedProvider]?.label} fails, requests will fall back to ${PROVIDER_DISPLAY[secondaryProvider]?.label}`
                    : 'When disabled, agent requests will use heuristic fallback data if the primary provider fails'}
                </p>
              </div>

              {/* Apply Button */}
              <button
                onClick={handleSwitchProvider}
                disabled={switching || selectedProvider === config?.defaultProvider}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all',
                  switching || selectedProvider === config?.defaultProvider
                    ? 'bg-white/10 text-white/30 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white',
                )}
              >
                {switching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Applying...
                  </>
                ) : selectedProvider === config?.defaultProvider ? (
                  'Current Provider'
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    Switch to {PROVIDER_DISPLAY[selectedProvider]?.label}
                  </>
                )}
              </button>

              {/* Cache Management */}
              <div className="border-t border-white/10 pt-4">
                <h3 className="text-sm text-white/60 mb-3 flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Cache Management
                </h3>
                <button
                  onClick={handleInvalidateCache}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Invalidate LLM Cache
                </button>
                <p className="text-white/30 text-xs mt-1">
                  Clear cached LLM responses. Useful after switching providers to ensure fresh results.
                </p>
              </div>
            </div>

            {/* Agent Compatibility Info */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-400" />
                Agent Compatibility
              </h3>
              <div className="space-y-2 text-xs text-white/50">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  <span>All 129 agents use the centralized LLM service</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  <span>No agent has hardcoded provider dependencies</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  <span>Graceful fallback to heuristic data if LLM is unavailable</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  <span>Provider switch applies instantly — no restart needed</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  <span>Configuration persisted in database (survives restarts)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
