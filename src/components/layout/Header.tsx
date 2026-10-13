'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { dataRepo } from '@/lib/data-service';
import { Profile } from '@/types/database';
import { StatusBadge } from '@/components/ui/Badge';
import { LogOut, ShieldCheck } from 'lucide-react';

export function Header() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

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
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Operational
          </span>
        </div>
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 pl-4 border-l border-slate-200">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>RLS & Concurrency Enforced</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Quick Role Switcher for instant testing */}
        <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium text-slate-600 border border-slate-200/60">
          <span className="px-2 text-[11px] text-slate-500 font-semibold uppercase">Role:</span>
          <button
            onClick={() => handleRoleSwitch('owner')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              profile?.role === 'owner'
                ? 'bg-white text-blue-700 shadow-xs font-semibold'
                : 'hover:text-slate-900'
            }`}
          >
            Owner
          </button>
          <button
            onClick={() => handleRoleSwitch('dispatcher')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              profile?.role === 'dispatcher'
                ? 'bg-white text-blue-700 shadow-xs font-semibold'
                : 'hover:text-slate-900'
            }`}
          >
            Dispatcher
          </button>
          <button
            onClick={() => handleRoleSwitch('driver')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              profile?.role === 'driver'
                ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                : 'hover:text-slate-900'
            }`}
          >
            Driver
          </button>
        </div>

        {/* User Card */}
        {profile && (
          <div className="flex items-center gap-3 pl-2">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-slate-900 leading-none">
                {profile.full_name}
              </div>
              <div className="text-xs text-slate-500 mt-1 font-mono">{profile.phone}</div>
            </div>
            <StatusBadge status={profile.role} size="sm" />
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          title="Sign out"
          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
