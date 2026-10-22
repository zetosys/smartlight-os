'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUlb, SEED_ACCOUNTS } from '../../components/context/UlbContext';
import { ApiClient } from '../../lib/api-client';
import { LoginResponse } from '@smartlight/shared-types';
import { SimulatedBadge } from '@smartlight/ui';
import { ShieldCheck, KeyRound, Lock, User, ArrowRight, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { setCurrentAccount } = useUlb();

  const [email, setEmail] = useState('admin@smartlight.os');
  const [password, setPassword] = useState('SmartLight@2026!');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // MFA Challenge State
  const [mfaChallenge, setMfaChallenge] = useState<{
    token: string;
    method: string;
  } | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  const handleCredentialsSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await ApiClient.fetch<LoginResponse>('auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (res.mfaRequired && res.mfaChallengeToken) {
        // Step 2: Move to MFA challenge verification
        setMfaChallenge({
          token: res.mfaChallengeToken,
          method: res.mfaMethod || 'TOTP',
        });
      } else if (res.accessToken) {
        // Direct login success
        ApiClient.setToken(res.accessToken);
        await setCurrentAccount(email);
        router.push('/dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!mfaChallenge) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await ApiClient.fetch<LoginResponse>('auth/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({
          mfaChallengeToken: mfaChallenge.token,
          code: mfaCode,
        }),
      });

      if (res.accessToken) {
        ApiClient.setToken(res.accessToken);
        await setCurrentAccount(email);
        router.push('/dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid MFA code. For dev/demo, enter 123456');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (userEmail: string) => {
    setEmail(userEmail);
    setPassword('SmartLight@2026!');
    setMfaChallenge(null);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-slate-950 text-xl mx-auto shadow-lg shadow-amber-500/20">
            SL
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            SmartLight OS
          </h2>
          <p className="text-xs text-slate-400">
            Hardware-Agnostic SLMCS Operations Authentication
          </p>
          <div className="pt-1">
            <SimulatedBadge />
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
          {!mfaChallenge ? (
            /* Step 1: Credentials Form */
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Operator / Admin Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition font-mono"
                    placeholder="operator@smartlight.os"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition font-mono"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Sign In to Control Room
              </button>
            </form>
          ) : (
            /* Step 2: MFA Verification Form */
            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs space-y-1">
                <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  Multi-Factor Authentication Required
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Enter the 6-digit TOTP verification code from your authenticator app.
                </p>
                <div className="text-[10px] text-amber-400/80 font-mono pt-1">
                  Demo bypass key: <code className="bg-slate-950 px-1 py-0.5 rounded">123456</code>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  6-Digit Verification Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    required
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-base text-center tracking-widest text-amber-400 font-mono placeholder-slate-700 focus:outline-none focus:border-amber-500 transition"
                    placeholder="123456"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMfaChallenge(null)}
                  className="w-1/3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || mfaCode.length < 6}
                  className="w-2/3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Verify &amp; Continue
                </button>
              </div>
            </form>
          )}

          {/* Quick Demo Accounts */}
          <div className="pt-4 border-t border-slate-800">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2 text-center">
              Quick Switch Seeded Persona
            </div>
            <div className="grid grid-cols-1 gap-1.5 text-xs font-mono">
              {SEED_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickLogin(acc.email)}
                  className={`p-2 rounded border text-left flex items-center justify-between transition ${
                    email === acc.email
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/40'
                      : 'bg-slate-950/60 hover:bg-slate-800 text-slate-400 border-slate-800'
                  }`}
                >
                  <span className="font-sans font-medium text-slate-200 truncate">{acc.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-400">
                    {acc.role} {acc.role === 'PLATFORM_ADMIN' ? '(MFA)' : ''}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
