'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { dataRepo } from '@/lib/data-service';

function LoginRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');

  useEffect(() => {
    dataRepo.getCurrentProfile().then((profile) => {
      if (profile?.role === 'owner') {
        router.replace('/drivers');
        return;
      }
      if (profile?.role === 'driver') {
        router.replace('/driver');
        return;
      }

      if (roleParam === 'owner') {
        router.replace('/owner/login');
      } else {
        router.replace('/driver/login');
      }
    });
  }, [roleParam, router]);

  return (
    <div className="min-h-screen bg-[#F2F4F7] flex items-center justify-center p-4">
      <div className="text-center space-y-3">
        <img
          src="/nalakath-logo.png"
          alt="Nalakath Logistics"
          className="w-14 h-14 rounded-full mx-auto object-contain border border-gray-200 shadow-sm animate-pulse"
        />
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Redirecting to Portal...
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F2F4F7] flex items-center justify-center p-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider animate-pulse">
            Loading Nalakath Portal...
          </div>
        </div>
      }
    >
      <LoginRedirectContent />
    </Suspense>
  );
}
