'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { dataRepo } from '@/lib/data-service';

import { NalakathLogo } from '@/components/brand/NalakathLogo';

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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center space-y-3">
        <NalakathLogo size="md" variant="circle" />
        <p className="text-xs font-bold text-slate-400 animate-pulse">Loading Nalakath Logistics...</p>
      </div>
    </div>
  );
}
