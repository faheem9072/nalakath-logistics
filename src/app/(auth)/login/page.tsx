'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { dataRepo } from '@/lib/data-service';
import { Phone, Lock, ArrowRight, Shield, Smartphone, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'driver' | 'owner'>('driver');
  const [driverPhone, setDriverPhone] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('+919876543200');
  const [ownerPassword, setOwnerPassword] = useState('admin123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick 1-tap demo drivers
  const DEMO_DRIVERS = [
    { name: 'Refnise', phone: '+919400112233', vehicle: 'KL 84 B 3057' },
    { name: 'Haneefa', phone: '+919400223344', vehicle: 'KL 84 B 3057' },
    { name: 'Firoz', phone: '+919400334455', vehicle: 'KL 02 BG 3443' },
    { name: 'Ameer', phone: '+919400445566', vehicle: 'KL 57 X 7384' },
    { name: 'Ashin', phone: '+919400778899', vehicle: 'KL 08 BP 5682' },
  ];

  const handleDriverLogin = async (e?: React.FormEvent, customPhone?: string) => {
    if (e) e.preventDefault();
    setError(null);
    const targetPhone = customPhone || driverPhone;

    if (!targetPhone) {
      setError('Please enter your registered mobile number');
      return;
    }

    setIsLoading(true);
    try {
      await dataRepo.loginDriverByPhone(targetPhone);
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
      // Demo password check or phone match
      const profile = await dataRepo.loginByPhone(ownerPhone, '123456');
      if (profile.role === 'owner' || profile.role === 'dispatcher') {
        router.push('/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid owner credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F4F7] flex flex-col justify-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-md mx-auto space-y-6">
        {/* MoveIQ Top Brand Badge with official Nalakath logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-gray-200/80 shadow-2xs">
            <img
              src="/nalakath-logo.png"
              alt="Nalakath Logistics"
              className="w-9 h-9 rounded-full object-cover shadow-xs border border-gray-100"
            />
            <div className="text-left">
              <span className="font-extrabold text-base tracking-tight text-[#121316] block leading-none">
                Nalakath
              </span>
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block leading-none mt-0.5">
                Fleet Trip-Tracker
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium pt-1">
            Sign in to start trips or manage logistics
          </p>
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
            <form onSubmit={handleDriverLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    placeholder="e.g. 9400112233"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full h-12 pl-11 pr-4 bg-[#F8F9FA] border border-gray-200 rounded-2xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400 focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-gray-400">
                  Only phone numbers registered by the owner can log in.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-[#121316] hover:bg-black text-white text-sm font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-98 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                <span>{isLoading ? 'Verifying...' : 'Login'}</span>
                <ArrowRight className="w-4 h-4 text-[#D4F65B]" />
              </button>

              {/* Quick 1-Tap Driver Select for Demo */}
              <div className="pt-3 border-t border-gray-100 space-y-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block text-center">
                  👉 Quick 1-Tap Driver Access (Demo)
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {DEMO_DRIVERS.map((d) => (
                    <button
                      key={d.phone}
                      type="button"
                      onClick={() => handleDriverLogin(undefined, d.phone)}
                      className="p-2.5 rounded-2xl bg-[#F8F9FA] hover:bg-gray-100 border border-gray-200/70 text-left transition-colors cursor-pointer group"
                    >
                      <p className="font-bold text-gray-900 group-hover:text-black">
                        {d.name}
                      </p>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                        {d.vehicle}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}

          {/* Owner Login Tab */}
          {activeTab === 'owner' && (
            <form onSubmit={handleOwnerLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Owner Phone / ID
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    className="w-full h-12 pl-11 pr-4 bg-[#F8F9FA] border border-gray-200 rounded-2xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400 focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
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

              <div className="p-3 bg-gray-50 rounded-2xl text-center text-xs text-gray-500">
                Default Owner credentials pre-filled for demo access.
              </div>
            </form>
          )}
        </div>

        {/* Subtle Kore Footer */}
        <footer className="text-center pt-2 text-[11px] font-medium text-gray-400">
          Designed and developed by Kore
        </footer>
      </div>
    </div>
  );
}
