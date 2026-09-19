'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogIn, Key, Building2, UserCheck, Loader2 } from 'lucide-react';
import { AnimatedIcon } from '@/components/AnimatedIcon';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const autofillCredentials = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 uppercase">
          CLEAR<span className="text-zinc-500 font-normal">AUDIT</span>
        </h1>
        <p className="mt-1 text-xs text-zinc-600 font-medium">
          Multi-Tenant Audit Document Review & Compliance System
        </p>
      </div>

      {/* SIDE BY SIDE CONTAINER (No scrolling required) */}
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* LEFT COLUMN: LOGIN FORM */}
        <motion.div
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-6 sm:p-8 shadow-md border border-zinc-200 rounded-2xl flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-100">
              <AnimatedIcon icon={LogIn} className="w-5 h-5 text-zinc-900" animationType="scale" />
              <h2 className="text-base font-extrabold text-zinc-900 uppercase font-mono tracking-tight">
                Sign In to Workspace
              </h2>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wide mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@firm.co"
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-xs font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wide mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-xs font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full mt-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <AnimatedIcon icon={LogIn} className="w-4 h-4" animationType="scale" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="text-[11px] text-zinc-400 font-mono text-center pt-6 mt-4 border-t border-zinc-100">
            ClearAudit Document System • FE-2 Evaluation Submission
          </div>
        </motion.div>

        {/* RIGHT COLUMN: SIDE BY SIDE EVALUATOR DEMO ACCOUNTS PANEL */}
        <motion.div
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-6 sm:p-8 shadow-md border border-zinc-200 rounded-2xl flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-2 mb-2 pb-3 border-b border-zinc-100">
              <AnimatedIcon icon={UserCheck} className="w-5 h-5 text-zinc-900" animationType="bounce" />
              <h2 className="text-base font-extrabold text-zinc-900 uppercase font-mono tracking-tight">
                Evaluator Demo Accounts (1-Click Fill)
              </h2>
            </div>
            <p className="text-[11px] text-zinc-500 font-medium mb-4 leading-relaxed">
              Click any button below to instantly autofill credentials into the sign-in form. Test firm isolation & role permissions:
            </p>

            {/* SIDE BY SIDE FIRMS CONTAINER */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* FIRM A */}
              <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center text-xs font-extrabold text-zinc-900 uppercase tracking-wide border-b border-zinc-200 pb-2 mb-2">
                    <Building2 className="w-4 h-4 text-blue-600 mr-1.5" />
                    Firm A: ABC & Co.
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => autofillCredentials('rohit@abc.co')}
                      className="w-full p-2.5 bg-white hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-xl text-left transition-all group"
                    >
                      <span className="font-bold text-xs text-zinc-900 group-hover:text-white block">
                        Rohit Sharma
                      </span>
                      <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300 font-mono block">
                        STAFF • rohit@abc.co
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => autofillCredentials('aman@abc.co')}
                      className="w-full p-2.5 bg-white hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-xl text-left transition-all group"
                    >
                      <span className="font-bold text-xs text-amber-700 group-hover:text-amber-300 block">
                        Aman Gupta
                      </span>
                      <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300 font-mono block">
                        REVIEWER • aman@abc.co
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* FIRM B */}
              <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center text-xs font-extrabold text-zinc-900 uppercase tracking-wide border-b border-zinc-200 pb-2 mb-2">
                    <Building2 className="w-4 h-4 text-emerald-600 mr-1.5" />
                    Firm B: XYZ & Co.
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => autofillCredentials('priya@xyz.co')}
                      className="w-full p-2.5 bg-white hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-xl text-left transition-all group"
                    >
                      <span className="font-bold text-xs text-emerald-800 group-hover:text-emerald-300 block">
                        Priya Verma
                      </span>
                      <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300 font-mono block">
                        STAFF • priya@xyz.co
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => autofillCredentials('karan@xyz.co')}
                      className="w-full p-2.5 bg-white hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-xl text-left transition-all group"
                    >
                      <span className="font-bold text-xs text-purple-800 group-hover:text-purple-300 block">
                        Karan Mehta
                      </span>
                      <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300 font-mono block">
                        REVIEWER • karan@xyz.co
                      </span>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div className="text-[11px] text-zinc-500 text-center font-mono pt-4 border-t border-zinc-100 flex items-center justify-center gap-1">
            <AnimatedIcon icon={Key} className="w-3.5 h-3.5 text-zinc-400" animationType="wiggle" />
            <span>Password for all accounts:</span>
            <span className="text-zinc-900 font-bold bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
              password123
            </span>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
