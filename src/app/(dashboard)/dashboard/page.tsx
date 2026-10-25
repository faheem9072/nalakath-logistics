'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab');

  useEffect(() => {
    if (tabParam === 'vehicles') {
      router.replace('/vehicles');
    } else if (tabParam === 'companies') {
      router.replace('/companies');
    } else if (tabParam === 'settings') {
      router.replace('/settings');
    } else {
      router.replace('/drivers');
    }
  }, [tabParam, router]);

  return (
    <div className="py-12 text-center text-xs text-gray-400">
      Loading Kore Dashboard...
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-xs text-gray-400">
          Loading Kore Dashboard...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
