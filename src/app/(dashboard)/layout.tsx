'use client';

import React from 'react';
import { MoveIQTopBar } from '@/components/moveiq/MoveIQTopBar';
import { MoveIQBottomNav } from '@/components/moveiq/MoveIQBottomNav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F2F4F7] text-[#121316] flex flex-col justify-between">
      {/* Container simulating smartphone/mobile viewport frame cleanly on all devices */}
      <div className="w-full max-w-md mx-auto min-h-screen flex flex-col bg-[#F2F4F7] sm:shadow-2xl sm:border sm:border-gray-200/80 sm:my-3 sm:rounded-[36px] sm:overflow-hidden relative">
        {/* MoveIQ Top Bar: Bell with green dot, Logo in center, Avatar on right */}
        <MoveIQTopBar />

        {/* Main Content Area */}
        <main className="flex-1 px-4 py-3 overflow-y-auto no-scrollbar pb-2">
          {children}

          {/* Subtle Nalakath Footer */}
          <footer className="text-center py-4 text-[11px] font-medium text-gray-400">
            Nalakath Logistics • Developed by Kore
          </footer>
        </main>

        {/* MoveIQ Bottom Navigation: Drivers, Vehicles */}
        <MoveIQBottomNav role="owner" />
      </div>
    </div>
  );
}
