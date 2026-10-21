'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  LayoutDashboard,
  Truck,
  BarChart3,
  CalendarCheck2,
} from 'lucide-react';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { lang, t } = useLanguage();

  const mobileNavItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Driver Work',
      href: '/reports',
      icon: BarChart3,
    },
    {
      label: 'Vehicle Exp',
      href: '/vehicles',
      icon: Truck,
    },
    {
      label: 'Duty',
      href: '/assignments',
      icon: CalendarCheck2,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 lg:hidden shadow-2xl safe-area-bottom">
      <div className="grid grid-cols-4 h-16 max-w-md mx-auto items-center px-1">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 transition-colors ${
                isActive
                  ? 'text-blue-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-[10px] tracking-tight truncate max-w-[75px] text-center font-bold">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
