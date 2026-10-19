'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  LayoutDashboard,
  CalendarCheck2,
  Navigation,
  Truck,
  Users,
  Building2,
  MapPin,
  BarChart3,
  ShieldAlert,
  Smartphone,
  ChevronRight,
} from 'lucide-react';
import { NalakathLogo } from '@/components/brand/NalakathLogo';

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    { label: t('navDashboard'), href: '/dashboard', icon: LayoutDashboard },
    { label: t('driverMonthCalcTitle'), href: '/reports', icon: BarChart3 },
    { label: t('navVehicles'), href: '/vehicles', icon: Truck },
    { label: t('navAssignments'), href: '/assignments', icon: CalendarCheck2 },
    { label: t('navDrivers'), href: '/drivers', icon: Users },
  ];

  return (
    <aside className="hidden lg:flex w-64 bg-slate-900 text-slate-300 flex-col shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-black/40">
        <div className="flex items-center gap-3">
          <NalakathLogo size="sm" variant="circle" />
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black text-white tracking-tight uppercase">
                {t('brandTitle')}
              </h1>
              <span className="text-[9px] font-bold text-rose-500 bg-rose-950/80 px-1 py-0.2 rounded border border-rose-800/80">
                1998
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Logistics Fleet
            </p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Operations
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={clsx(
                    'w-4 h-4 shrink-0 transition-colors',
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                  )}
                />
                <span>{item.label}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-200" />}
            </Link>
          );
        })}

        {/* Driver Portal Link */}
        <div className="pt-5 px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Driver View
        </div>
        <Link
          href="/driver"
          className={clsx(
            'flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors border border-slate-800',
            pathname === '/driver'
              ? 'bg-emerald-600 text-white'
              : 'text-emerald-400 bg-emerald-950/20 hover:bg-emerald-900/40 hover:text-emerald-300'
          )}
        >
          <div className="flex items-center gap-3">
            <Smartphone className="w-4 h-4 shrink-0" />
            <span>{t('driverApp')}</span>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
            PWA
          </span>
        </Link>
      </nav>

      {/* Fleet Summary Mini Badge */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span>Fleet Capacity</span>
          <span className="text-emerald-400 font-semibold">50 Vehicles</span>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div className="bg-blue-500 h-full rounded-full" style={{ width: '85%' }} />
        </div>
      </div>
    </aside>
  );
}
