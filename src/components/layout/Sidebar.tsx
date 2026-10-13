'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
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

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Daily Assignments', href: '/assignments', icon: CalendarCheck2 },
  { label: 'Trips & Log', href: '/trips', icon: Navigation },
  { label: 'Vehicles', href: '/vehicles', icon: Truck },
  { label: 'Drivers', href: '/drivers', icon: Users },
  { label: 'Teams & Clients', href: '/teams', icon: Building2 },
  { label: 'Routes', href: '/routes', icon: MapPin },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Audit Log', href: '/audit-logs', icon: ShieldAlert },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 font-bold text-lg">
            FF
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">FleetFlow</h1>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              Fleet Operations
            </p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Operations
        </div>
        {NAV_ITEMS.map((item) => {
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
            <span>Driver Mobile Portal</span>
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
