'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { dataRepo } from '@/lib/data-service';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    dataRepo.getCurrentProfile().then((profile) => {
      if (!profile) {
        router.push('/login');
      } else if (profile.role === 'driver') {
        router.push('/driver');
      } else {
        router.push('/dashboard');
      }
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg mx-auto animate-pulse">
          FF
        </div>
        <p className="text-sm font-medium text-slate-600">Loading FleetFlow...</p>
      </div>
    </div>
  );
}
