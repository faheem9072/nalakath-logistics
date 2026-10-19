import React, { Suspense } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { VehicleDetailView } from '@/components/dashboard/VehicleDetailView';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return [
    { id: '3057' },
    { id: '2266' },
    { id: '3443' },
    { id: '5682' },
    { id: '7384' },
    { id: '5839' },
    { id: '6587' },
    { id: '4474' },
    { id: '5801' },
    { id: '7543' },
    { id: '1524' },
    { id: 'veh-del-3057' },
    { id: 'veh-del-3443' },
    { id: 'veh-del-7384' },
    { id: 'veh-del-5839' },
    { id: 'veh-del-6587' },
    { id: 'veh-del-2266' },
    { id: 'veh-del-4474' },
    { id: 'veh-sfx-5682' },
    { id: 'veh-sfx-5801' },
    { id: 'veh-sfx-7543' },
    { id: 'veh-sfx-1524' },
  ];
}

async function VehicleDetailWrapper({ params }: PageProps) {
  const resolvedParams = await params;
  const id = resolvedParams?.id ? decodeURIComponent(resolvedParams.id) : '3057';
  return <VehicleDetailView initialVehicleQuery={id} showBackBtn={false} />;
}

export default function VehicleDetailPage({ params }: PageProps) {
  return (
    <PageContainer
      title="Vehicle Operations Detail"
      subtitle="Detailed driver assignments, month-end mileage, and audited expenses."
      action={
        <Link href="/vehicles">
          <Button
            variant="outline"
            size="md"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Vehicle List
          </Button>
        </Link>
      }
    >
      <Suspense
        fallback={
          <div className="py-20 text-center text-sm text-slate-400 animate-pulse bg-white rounded-2xl border border-slate-200">
            Loading vehicle details...
          </div>
        }
      >
        <VehicleDetailWrapper params={params} />
      </Suspense>
    </PageContainer>
  );
}
