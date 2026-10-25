'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { dataRepo } from '@/lib/data-service';
import { Profile } from '@/types/database';
import { StatusBadge } from '@/components/ui/Badge';
import { LogOut, Smartphone } from 'lucide-react';
import { NalakathLogo } from '@/components/brand/NalakathLogo';
import { LanguageSwitcher, useLanguage } from '@/lib/i18n/LanguageContext';

export function Header() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    dataRepo.getCurrentProfile().then(setProfile);
  }, []);

  const handleRoleSwitch = async (role: 'owner' | 'dispatcher' | 'driver') => {
    const targetMap: Record<string, string> = {
      owner: '00000000-0000-0000-0000-000000000001',
      dispatcher: '00000000-0000-0000-0000-000000000002',
      driver: '00000000-0000-0000-0000-000000000003',
    };
    await dataRepo.setSessionUser(targetMap[role]);
    const updated = await dataRepo.getCurrentProfile();
    setProfile(updated);
    if (role === 'driver') {
      router.push('/driver');
    } else {
      router.push('/dashboard');
    }
  };

  const handleLogout = async () => {
    await dataRepo.logout();
    router.push('/login');
  };

  return (
    <header className="h-14 sm:h-16 bg-white border-b border-slate-200/80 px-2.5 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <div className="flex items-center gap-2 sm:pr-4 sm:border-r sm:border-slate-200 shrink-0">
          <NalakathLogo size="sm" variant="circle" />
          <div>
            <span className="text-xs sm:text-sm font-black tracking-tight text-slate-900 block leading-tight uppercase">
              {t('brandTitle')}
            </span>
            <span className="text-[9px] text-rose-600 font-bold tracking-wider block">
              {t('since1998')}
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider">
            {t('liveOps')}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Language Switcher (Always visible on mobile & desktop) */}
        <LanguageSwitcher />

        {/* Desktop Quick Role Switcher */}
        <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium text-slate-600 border border-slate-200/60">
          <span className="px-1.5 text-[10px] text-slate-500 font-bold uppercase">Role:</span>
          <button
            onClick={() => handleRoleSwitch('owner')}
            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
              profile?.role === 'owner'
                ? 'bg-white text-blue-700 shadow-xs font-bold'
                : 'hover:text-slate-900'
            }`}
          >
            {t('owner')}
          </button>
          <button
            onClick={() => handleRoleSwitch('dispatcher')}
            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
              profile?.role === 'dispatcher'
                ? 'bg-white text-blue-700 shadow-xs font-bold'
                : 'hover:text-slate-900'
            }`}
          >
            {t('dispatcher')}
          </button>
          <button
            onClick={() => handleRoleSwitch('driver')}
            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
              profile?.role === 'driver'
                ? 'bg-white text-emerald-700 shadow-xs font-bold'
                : 'hover:text-slate-900'
            }`}
          >
            {t('driver')}
          </button>
        </div>

        {/* User Badge */}
        {profile && (
          <div className="flex items-center gap-2">
            <div className="text-right hidden md:block">
              <div className="text-xs font-bold text-slate-900 leading-none">
                {profile.full_name}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-mono">{profile.phone}</div>
            </div>
            <StatusBadge status={profile.role} size="sm" />
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          title={t('logout')}
          className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
