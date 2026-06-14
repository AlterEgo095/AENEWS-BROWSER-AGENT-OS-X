'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────────

interface LockoutStats {
  totalLockedAccounts: number;
  lockedAccounts: Array<{ email: string; lockedUntil: number; failedAttempts: number }>;
}

interface ThreatAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  ip: string;
  timestamp: number;
  acknowledged: boolean;
}

interface IpReputation {
  ip: string;
  score: number;
  flags: string[];
  requestCount: number;
  autoBlocked: boolean;
  lastSeen: number;
}

interface ActiveSession {
  family: string;
  createdAt: number;
  ipAddress?: string;
}

// ─── Severity Badge Component ───────────────────────────────

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded border ${colors[severity] || colors.low}`}>
      {severity.toUpperCase()}
    </span>
  );
}

// ─── Main Component ─────────────────────────────────────────

export default function SecurityDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [lockoutStats, setLockoutStats] = useState<LockoutStats | null>(null);
  const [alerts, setAlerts] = useState<ThreatAlert[]>([]);
  const [reputations, setReputations] = useState<IpReputation[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

  const fetchSecurityData = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      const [lockoutRes, alertsRes, repsRes, sessionsRes] = await Promise.allSettled([
        fetch(`${apiBase}/security/lockout/stats`, { headers }),
        fetch(`${apiBase}/security/threats/alerts?limit=50`, { headers }),
        fetch(`${apiBase}/security/threats/ip-reputations`, { headers }),
        fetch(`${apiBase}/security/tokens/sessions`, { headers }),
      ]);

      if (lockoutRes.status === 'fulfilled' && lockoutRes.value.ok) {
        setLockoutStats(await lockoutRes.value.json());
      }
      if (alertsRes.status === 'fulfilled' && alertsRes.value.ok) {
        setAlerts(await alertsRes.value.json());
      }
      if (repsRes.status === 'fulfilled' && repsRes.value.ok) {
        setReputations(await repsRes.value.json());
      }
      if (sessionsRes.status === 'fulfilled' && sessionsRes.value.ok) {
        setSessions(await sessionsRes.value.json());
      }
    } catch (error) {
      console.error('Failed to fetch security data:', error);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchSecurityData();
    const interval = setInterval(fetchSecurityData, 30000);
    return () => clearInterval(interval);
  }, [fetchSecurityData]);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'lockout', label: 'Account Lockout' },
    { id: 'threats', label: 'Threat Intel' },
    { id: 'audit', label: 'Audit Log' },
    { id: 'tokens', label: 'Tokens' },
    { id: 'ip-control', label: 'IP Control' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-lg">Loading security dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🛡️</div>
          <div>
            <h1 className="text-2xl font-bold">Security Dashboard</h1>
            <p className="text-gray-500 text-sm">Phase 12 — Security Hardening & Monitoring</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800 px-6">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-400 border-blue-400'
                  : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <div className="text-gray-500 text-xs mb-1">LOCKED ACCOUNTS</div>
                <div className="text-3xl font-bold text-red-400">{lockoutStats?.totalLockedAccounts || 0}</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <div className="text-gray-500 text-xs mb-1">ACTIVE THREATS</div>
                <div className="text-3xl font-bold text-orange-400">{alerts.filter((a) => !a.acknowledged).length}</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <div className="text-gray-500 text-xs mb-1">SUSPICIOUS IPS</div>
                <div className="text-3xl font-bold text-yellow-400">{reputations.filter((r) => r.score >= 50).length}</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <div className="text-gray-500 text-xs mb-1">ACTIVE SESSIONS</div>
                <div className="text-3xl font-bold text-green-400">{sessions.length}</div>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Recent Threat Alerts</h3>
              {alerts.length === 0 ? (
                <div className="text-gray-500 text-center py-8">No recent threat alerts — system is secure</div>
              ) : (
                <div className="space-y-2">
                  {alerts.slice(0, 10).map((alert) => (
                    <div key={alert.id} className={`flex items-center justify-between p-3 rounded border ${alert.acknowledged ? 'border-gray-800 bg-gray-900/50' : 'border-gray-700 bg-gray-900'}`}>
                      <div className="flex items-center gap-3">
                        <SeverityBadge severity={alert.severity} />
                        <div>
                          <div className="text-sm font-medium">{alert.type.replace(/_/g, ' ')}</div>
                          <div className="text-xs text-gray-500">{alert.description}</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">{new Date(alert.timestamp).toLocaleTimeString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Top Risk IPs</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800">
                    <th className="text-left pb-2">IP</th>
                    <th className="text-left pb-2">Score</th>
                    <th className="text-left pb-2">Flags</th>
                    <th className="text-left pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reputations.sort((a, b) => b.score - a.score).slice(0, 10).map((rep) => (
                    <tr key={rep.ip} className="border-b border-gray-800/50">
                      <td className="py-2 font-mono">{rep.ip}</td>
                      <td className="py-2 font-bold">{rep.score}</td>
                      <td className="py-2">
                        <div className="flex gap-1 flex-wrap">
                          {rep.flags.slice(0, 3).map((f) => (
                            <span key={f} className="px-1 py-0.5 text-xs bg-gray-800 rounded">{f.replace(/_/g, ' ')}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2">
                        {rep.autoBlocked ? <span className="text-red-400 text-xs font-medium">BLOCKED</span> : <span className="text-green-400 text-xs">Monitored</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'lockout' && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Locked Accounts</h3>
            {!lockoutStats?.lockedAccounts.length ? (
              <div className="text-gray-500 text-center py-8">No locked accounts</div>
            ) : (
              <div className="space-y-2">
                {lockoutStats.lockedAccounts.map((account) => (
                  <div key={account.email} className="flex items-center justify-between p-3 bg-gray-800/50 rounded">
                    <div>
                      <div className="font-medium">{account.email}</div>
                      <div className="text-xs text-gray-500">Failed: {account.failedAttempts} | Until: {new Date(account.lockedUntil).toLocaleString()}</div>
                    </div>
                    <button className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 rounded">Unlock</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'threats' && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">All Threat Alerts</h3>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.id} className={`p-3 rounded border ${alert.acknowledged ? 'border-gray-800 opacity-60' : 'border-gray-700'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={alert.severity} />
                      <span className="font-medium">{alert.type.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="text-xs text-gray-500">IP: {alert.ip}</div>
                  </div>
                  <div className="text-sm text-gray-400 mt-1">{alert.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Audit Log</h3>
            <div className="text-gray-500 text-center py-8">Audit log query interface — connect to the API to view entries</div>
          </div>
        )}

        {activeTab === 'tokens' && (
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Active Sessions</h3>
              {sessions.length === 0 ? (
                <div className="text-gray-500 text-center py-8">No active sessions</div>
              ) : (
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <div key={session.family} className="p-3 bg-gray-800/50 rounded">
                      <div className="font-mono text-sm">{session.family.substring(0, 16)}...</div>
                      <div className="text-xs text-gray-500">IP: {session.ipAddress || 'unknown'} | Created: {new Date(session.createdAt).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'ip-control' && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">IP Reputation Table</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="text-left pb-2">IP</th>
                  <th className="text-left pb-2">Score</th>
                  <th className="text-left pb-2">Flags</th>
                  <th className="text-left pb-2">Status</th>
                  <th className="text-left pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reputations.map((rep) => (
                  <tr key={rep.ip} className="border-b border-gray-800/50">
                    <td className="py-2 font-mono">{rep.ip}</td>
                    <td className="py-2 font-bold">{rep.score}</td>
                    <td className="py-2">
                      {rep.flags.map((f) => <span key={f} className="px-1 py-0.5 text-xs bg-gray-800 rounded mr-1">{f.replace(/_/g, ' ')}</span>)}
                    </td>
                    <td className="py-2">
                      {rep.autoBlocked ? <span className="text-red-400 text-xs font-bold">BLOCKED</span> : <span className="text-green-400 text-xs">OK</span>}
                    </td>
                    <td className="py-2">
                      <button className={`px-2 py-1 text-xs rounded ${rep.autoBlocked ? 'bg-green-600' : 'bg-red-600'}`}>
                        {rep.autoBlocked ? 'Unblock' : 'Block'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
