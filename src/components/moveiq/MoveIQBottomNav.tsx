'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Truck, Building2, Settings, PlayCircle, Receipt } from 'lucide-react';

interface MoveIQBottomNavProps {
  role?: 'owner' | 'driver';
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function MoveIQBottomNav({
  role = 'owner',
  activeTab,
  onTabChange,
}: MoveIQBottomNavProps) {
  const pathname = usePathname();

  const ownerItems = [
    {
      id: 'drivers',
      label: 'Drivers',
      href: '/drivers',
      icon: Users,
    },
    {
      id: 'vehicles',
      label: 'Vehicles',
      href: '/vehicles',
      icon: Truck,
    },
    {
      id: 'companies',
      label: 'Companies',
      href: '/companies',
      icon: Building2,
    },
    {
      id: 'settings',
      label: 'Settings',
      href: '/settings',
      icon: Settings,
    },
  ];

  const driverItems = [
    {
      id: 'trip',
      label: 'Drive',
      href: '/driver',
      icon: PlayCircle,
    },
    {
      id: 'history',
      label: 'My Trips',
      href: '/driver?tab=history',
      icon: Receipt,
    },
  ];

  const items = role === 'driver' ? driverItems : ownerItems;

  return (
    <nav className="fixed bottom-3 left-4 right-4 max-w-md mx-auto z-40 bg-white/95 backdrop-blur-md border border-gray-200/80 shadow-2xl rounded-[32px] p-1.5 flex items-center justify-around safe-area-bottom">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          activeTab !== undefined
            ? activeTab === item.id
            : pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href)) ||
              (item.id === 'drivers' && pathname === '/dashboard');

        const content = (
          <div
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              isActive
                ? 'bg-[#121316] text-white shadow-md scale-100'
                : 'text-gray-400 hover:text-gray-800 hover:bg-gray-100/80 active:scale-95'
            }`}
            title={item.label}
            aria-label={item.label}
          >
            <Icon className="w-5 h-5" strokeWidth={isActive ? 2.2 : 1.8} />
          </div>
        );

        if (onTabChange) {
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className="focus:outline-none"
            >
              {content}
            </button>
          );
        }

        return (
          <Link key={item.id} href={item.href} className="focus:outline-none">
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
