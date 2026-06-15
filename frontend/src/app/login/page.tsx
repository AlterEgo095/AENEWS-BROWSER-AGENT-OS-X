'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Hexagon, LogIn, Mail, Lock, UserPlus, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';

type AuthMode = 'login' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const result = await api.login({ email, password });
        login(result.accessToken, result.user);
      } else {
        const result = await api.register({
          email,
          password,
          firstName,
          lastName,
        });
        login(result.accessToken, result.user);
      }
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 h-[600px] w-[600px] rounded-full bg-violet-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20">
            <Hexagon className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">AENEWS Agent OS X</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Multi-Cluster AI Agent Platform
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
          {/* Tabs */}
          <div className="mb-6 flex rounded-lg bg-background p-1">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={cn(
                'flex-1 rounded-md py-2 text-sm font-medium transition-all',
                mode === 'login'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <LogIn className="mr-2 inline h-4 w-4" />
              Sign In
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); }}
              className={cn(
                'flex-1 rounded-md py-2 text-sm font-medium transition-all',
                mode === 'register'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <UserPlus className="mr-2 inline h-4 w-4" />
              Register
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
                    placeholder="Doe"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
                  placeholder="admin@aenews.io"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo Notice */}
          <div className="mt-6 rounded-lg border border-border bg-background/50 p-3">
            <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">
              Demo Mode
            </p>
            <p className="text-xs text-muted-foreground">
              The backend API may not be running. The dashboard will display mock data when the API is unavailable.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground/50">
          AENEWS Agent OS X v2.0.0-alpha &middot; Multi-Cluster AI Agent Platform
        </p>
      </div>
    </div>
  );
}
