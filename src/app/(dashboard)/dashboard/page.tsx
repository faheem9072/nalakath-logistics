'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DriversListView } from '@/components/dashboard/DriversListView';
import { VehiclesListView } from '@/components/dashboard/VehiclesListView';
import { MoveIQBottomNav } from '@/components/moveiq/MoveIQBottomNav';

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'drivers' | 'vehicles'>('drivers');

  useEffect(() => {
    if (tabParam === 'vehicles') {
      setActiveTab('vehicles');
    } else if (tabParam === 'drivers') {
      setActiveTab('drivers');
    }
  }, [tabParam]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'drivers' | 'vehicles');
    router.replace(`/dashboard?tab=${tab}`);
  };

  return (
    <div className="space-y-4">
      {activeTab === 'drivers' ? (
        <DriversListView />
      ) : (
        <VehiclesListView />
      )}

      {/* Floating Bottom Navigation bar switching between Drivers & Vehicles */}
      <MoveIQBottomNav
        role="owner"
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-xs text-gray-400">
          Loading Nalakath Dashboard...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
