'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { dataRepo } from '@/lib/data-service';
import { MoveIQTopBar } from '@/components/moveiq/MoveIQTopBar';
import { MoveIQBottomNav } from '@/components/moveiq/MoveIQBottomNav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    const verifyOwnerAccess = async () => {
      try {
        const profile = await dataRepo.getCurrentProfile();
        if (!isMounted) return;

        if (!profile) {
          // Unauthenticated -> redirect to owner login
          setIsAuthorized(false);
          router.replace('/login?role=owner');
          return;
        }

        if (profile.role === 'driver') {
          // Driver tried to access owner dashboard -> strictly lock out to driver portal
          setIsAuthorized(false);
          router.replace('/driver');
          return;
        }

        if (profile.role === 'owner') {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
          router.replace('/login?role=owner');
        }
      } catch (err) {
        if (!isMounted) return;
        setIsAuthorized(false);
        router.replace('/login?role=owner');
      }
    };

    verifyOwnerAccess();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // While checking authorization, show a clean loading gate (prevent flashing owner content)
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-[#121316] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <img
            src="/nalakath-logo.png"
            alt="Nalakath Logistics"
            className="w-16 h-16 rounded-full mx-auto object-contain border border-white/20 shadow-lg animate-pulse"
          />
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Verifying Access...
          </p>
        </div>
      </div>
    );
  }

  // If unauthorized (driver or not logged in), render nothing while redirecting
  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F2F4F7] text-[#121316] flex flex-col justify-between">
      {/* Container simulating smartphone/mobile viewport frame cleanly on all devices */}
      <div className="w-full max-w-md mx-auto min-h-screen flex flex-col bg-[#F2F4F7] sm:shadow-2xl sm:border sm:border-gray-200/80 sm:my-3 sm:rounded-[36px] sm:overflow-hidden relative">
        {/* MoveIQ Top Bar */}
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
