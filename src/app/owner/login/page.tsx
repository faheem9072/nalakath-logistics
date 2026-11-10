'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { dataRepo } from '@/lib/data-service';
import { Lock, ArrowRight, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { InstallPwaButton } from '@/components/layout/InstallPwaButton';

export default function OwnerLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dataRepo.getCurrentProfile().then((profile) => {
      if (profile?.role === 'owner') {
        router.replace('/drivers');
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPassword = password.trim();
    if (!cleanPassword) {
      setError('Please enter the owner password');
      return;
    }

    setIsLoading(true);
    try {
      await dataRepo.loginOwner(cleanPassword);
      router.push('/drivers');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid owner password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F4F7] flex flex-col justify-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-md mx-auto space-y-6">
        {/* Nalakath Logistics Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-3 bg-white px-5 py-3 rounded-3xl border border-gray-200/80 shadow-2xs">
            <img
              src="/nalakath-logo.png"
              alt="Nalakath Logistics"
              className="w-11 h-11 rounded-full object-contain shrink-0 shadow-xs border border-gray-100"
            />
            <div className="text-left">
              <h1 className="text-base sm:text-lg font-black text-[#121316] tracking-tight leading-none">
                NALAKATH
              </h1>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500 flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3 h-3 text-[#121316]" />
                LOGISTICS • OWNER PORTAL
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium pt-1">
            Private management portal for Nalakath fleet operations
          </p>
          <div className="flex justify-center pt-1">
            <InstallPwaButton className="!bg-[#121316] hover:!bg-black !text-white !font-bold !text-xs !py-2 !px-4 !rounded-2xl !shadow-xs" />
          </div>
        </div>

        {/* Owner Login Card */}
        <div className="bg-white rounded-[32px] p-6 sm:p-7 shadow-sm border border-gray-100 space-y-5">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-base font-black text-[#121316]">Owner Sign In</h2>
            <p className="text-xs text-gray-400 mt-0.5">Enter owner security password to access fleet dashboard</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="font-medium leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Owner Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter owner password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 pl-11 pr-12 bg-[#F8F9FA] border border-gray-200 rounded-2xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400 focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#121316] hover:bg-black text-white text-sm font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-98 transition-all shadow-sm cursor-pointer disabled:opacity-50 mt-2"
            >
              <span>{isLoading ? 'Verifying...' : 'Sign In as Owner'}</span>
              <ArrowRight className="w-4 h-4 text-[#D4F65B]" />
            </button>
          </form>
        </div>

        {/* Footer */}
        <footer className="text-center pt-2 text-[11px] font-medium text-gray-400">
          Nalakath Logistics • Developed by Kore
        </footer>
      </div>
    </div>
  );
}

