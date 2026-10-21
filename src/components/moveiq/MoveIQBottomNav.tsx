'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Truck, Activity, Receipt, PlayCircle } from 'lucide-react';

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
  ];

  const driverItems = [
    {
      id: 'trip',
      label: 'Today',
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
            : pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

        const content = (
          <div
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl transition-all cursor-pointer ${
              isActive
                ? 'bg-[#121316] text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-5 h-5" strokeWidth={isActive ? 2.2 : 1.8} />
            <span
              className={`text-xs font-bold transition-all ${
                isActive ? 'inline-block' : 'hidden sm:inline-block text-gray-600'
              }`}
            >
              {item.label}
            </span>
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
