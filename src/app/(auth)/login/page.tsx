'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { dataRepo } from '@/lib/data-service';
import { Phone, Lock, ArrowRight, Shield, Smartphone, AlertCircle, KeyRound } from 'lucide-react';
import { InstallPwaButton } from '@/components/layout/InstallPwaButton';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');

  const [activeTab, setActiveTab] = useState<'driver' | 'owner'>(
    roleParam === 'owner' ? 'owner' : 'driver'
  );

  useEffect(() => {
    if (roleParam === 'owner') {
      setActiveTab('owner');
    } else if (roleParam === 'driver') {
      setActiveTab('driver');
    }
  }, [roleParam]);

  const [driverPhone, setDriverPhone] = useState('');
  const [driverPin, setDriverPin] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDriverLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    const targetPhone = driverPhone;
    const targetPin = driverPin;

    if (!targetPhone.trim()) {
      setError('Please enter your registered mobile number');
      return;
    }
    if (!targetPin.trim()) {
      setError('Please enter your 4-digit PIN');
      return;
    }

    setIsLoading(true);
    try {
      await dataRepo.loginDriverByPhone(targetPhone, targetPin);
      router.push('/driver');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!ownerPassword) {
      setError('Please enter password');
      return;
    }

    setIsLoading(true);
    try {
      await dataRepo.loginOwner(ownerPassword);
      router.push('/drivers');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid owner password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F4F7] flex flex-col justify-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-md mx-auto space-y-6">
        {/* Top Brand Badge with Nalakath Logistics Logo & Name */}
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
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500 block mt-0.5">
                LOGISTICS
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium pt-1">
            Sign in to start trips or manage fleet operations
          </p>
          <div className="flex justify-center pt-1">
            <InstallPwaButton className="!bg-[#121316] hover:!bg-black !text-white !font-bold !text-xs !py-2 !px-4 !rounded-2xl !shadow-xs" />
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 space-y-5">
          {/* Pill Tabs: MoveIQ style chips */}
          <div className="flex items-center p-1 bg-[#F4F5F7] rounded-full">
            <button
              type="button"
              onClick={() => {
                setActiveTab('driver');
                setError(null);
              }}
              className={`flex-1 py-2.5 rounded-full text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'driver'
                  ? 'bg-[#121316] text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Driver</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('owner');
                setError(null);
              }}
              className={`flex-1 py-2.5 rounded-full text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'owner'
                  ? 'bg-[#121316] text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Owner</span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="font-medium leading-relaxed">{error}</p>
            </div>
          )}

          {/* Driver Login Tab */}
          {activeTab === 'driver' && (
            <form onSubmit={(e) => handleDriverLogin(e)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    placeholder="Enter your mobile number"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full h-12 pl-11 pr-4 bg-[#F8F9FA] border border-gray-200 rounded-2xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400 focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={driverPin}
                    onChange={(e) => setDriverPin(e.target.value)}
                    className="w-full h-12 pl-11 pr-4 bg-[#F8F9FA] border border-gray-200 rounded-2xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400 focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-[#121316] hover:bg-black text-white text-sm font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-98 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                <span>{isLoading ? 'Verifying...' : 'Login as Driver'}</span>
                <ArrowRight className="w-4 h-4 text-[#D4F65B]" />
              </button>
            </form>
          )}

          {/* Owner Login Tab */}
          {activeTab === 'owner' && (
            <form onSubmit={handleOwnerLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Owner Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    placeholder="Enter owner password"
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    className="w-full h-12 pl-11 pr-4 bg-[#F8F9FA] border border-gray-200 rounded-2xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400 focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-[#121316] hover:bg-black text-white text-sm font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-98 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                <span>{isLoading ? 'Signing in...' : 'Sign In as Owner'}</span>
                <ArrowRight className="w-4 h-4 text-[#D4F65B]" />
              </button>
            </form>
          )}
        </div>

        {/* Subtle Centered Kore Footer */}
        <footer className="text-center pt-2 text-[11px] font-medium text-gray-400">
          Designed and developed by Kore
        </footer>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F2F4F7] flex items-center justify-center p-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider animate-pulse">
            Loading Nalakath Portal...
          </div>
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}

