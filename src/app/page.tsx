'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { dataRepo } from '@/lib/data-service';

import { KoreLogo } from '@/components/brand/KoreLogo';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    dataRepo.getCurrentProfile().then((profile) => {
      if (profile?.role === 'driver') {
        router.replace('/driver');
      } else if (profile?.role === 'owner') {
        router.replace('/drivers');
      } else {
        router.replace('/login');
      }
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-[#121316] flex items-center justify-center">
      <div className="text-center space-y-4">
        <img
          src="/nalakath-logo.png"
          alt="Nalakath Logistics"
          className="w-20 h-20 rounded-full mx-auto object-contain border border-white/20 shadow-lg"
        />
        <div className="space-y-1">
          <h1 className="text-xl font-black text-white tracking-wider">NALAKATH LOGISTICS</h1>
          <p className="text-xs font-bold text-[#D4F65B] tracking-wider uppercase animate-pulse">Loading...</p>
        </div>
      </div>
    </div>
  );
}
