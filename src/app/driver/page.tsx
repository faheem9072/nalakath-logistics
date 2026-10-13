'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { dataRepo } from '@/lib/data-service';
import { AssignmentWithDetails } from '@/types/models';
import { Trip, Profile } from '@/types/database';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { StartTripModal } from '@/components/driver-portal/StartTripModal';
import { CompleteTripModal } from '@/components/driver-portal/CompleteTripModal';
import {
  Truck,
  Clock,
  MapPin,
  CheckCircle2,
  Play,
  CheckCircle,
  History,
  LogOut,
} from 'lucide-react';
import Link from 'next/link';

export default function DriverPortalPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [formattedToday, setFormattedToday] = useState<string>('');

  // Modals state
  const [startTripModalDuty, setStartTripModalDuty] = useState<AssignmentWithDetails | null>(
    null
  );
  const [completeTripModalTrip, setCompleteTripModalTrip] = useState<Trip | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const p = await dataRepo.getCurrentProfile();
      setProfile(p);
      if (p) {
        const list = await dataRepo.getDriverAssignments(p.phone);
        setAssignments(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setFormattedToday(
      new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    );
    loadData();
  }, []);

  const handleConfirmDuty = async (assignmentId: string) => {
    setActionError(null);
    try {
      await dataRepo.confirmDuty(assignmentId);
      await loadData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to confirm duty');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-12">
      {/* Mobile App Bar */}
      <header className="bg-slate-900 text-white sticky top-0 z-20 shadow-md">
        <div className="max-w-md mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm">
              FF
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight">Driver Portal</div>
              <div className="text-[11px] text-slate-400 font-mono">
                {profile?.full_name || 'Driver'} • {profile?.phone}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="text-[11px] bg-slate-800 text-slate-300 px-2 py-1 rounded hover:bg-slate-700"
            >
              Admin View
            </Link>
            <button
              onClick={async () => {
                await dataRepo.logout();
                router.push('/login');
              }}
              className="p-1.5 text-slate-400 hover:text-rose-400"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Mobile Container */}
      <main className="max-w-md mx-auto px-4 py-5 space-y-4">
        {actionError && <Alert variant="danger">{actionError}</Alert>}

        {/* Date and Status Bar */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="text-xs">
            <span className="text-slate-400 font-medium">Duty Date:</span>{' '}
            <span className="font-bold text-slate-900">
              {formattedToday || 'Today'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Online</span>
          </div>
        </div>

        {/* Assignments Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Assigned Duties ({assignments.length})
            </h2>
            <button
              onClick={loadData}
              className="text-xs text-blue-600 font-medium hover:underline cursor-pointer"
            >
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-sm text-slate-400 animate-pulse">
              Loading driver assignments...
            </div>
          ) : assignments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center space-y-2">
                <Truck className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="font-semibold text-slate-700 text-sm">No Duties Assigned Today</h3>
                <p className="text-xs text-slate-400">
                  You have no scheduled transport duties right now. Contact fleet dispatch if you
                  expect an assignment.
                </p>
              </CardContent>
            </Card>
          ) : (
            assignments.map((assignment) => {
              const isScheduled = assignment.status === 'scheduled';
              const isConfirmed = assignment.driver_confirmed_at !== null;
              const activeTrip = assignment.trips?.find((t) => t.status === 'in_progress');
              const completedTrips =
                assignment.trips?.filter((t) => t.status === 'completed') || [];

              return (
                <Card
                  key={assignment.id}
                  className="border-slate-300 shadow-sm overflow-hidden"
                >
                  {/* Top Status Header */}
                  <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono">
                        {assignment.planned_start_time.slice(0, 5)} –{' '}
                        {assignment.planned_end_time.slice(0, 5)}
                      </span>
                    </div>
                    <StatusBadge status={assignment.status} size="sm" />
                  </div>

                  <CardContent className="p-4 space-y-4">
                    {/* Vehicle Registration - Large for driver */}
                    <div className="flex items-center justify-between bg-blue-50/70 p-3 rounded-xl border border-blue-100">
                      <div>
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                          Assigned Vehicle
                        </span>
                        <span className="text-lg font-black text-slate-900 font-mono tracking-wider">
                          {assignment.vehicle.registration_number}
                        </span>
                        <span className="text-xs text-slate-500 block">
                          {assignment.vehicle.make_model}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                          Current Odo
                        </span>
                        <span className="text-sm font-bold text-slate-700 font-mono">
                          {assignment.vehicle.current_odometer.toLocaleString()} km
                        </span>
                      </div>
                    </div>

                    {/* Route Details */}
                    {assignment.route && (
                      <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <MapPin className="w-3.5 h-3.5 text-blue-600" />
                          <span>{assignment.route.name}</span>
                        </div>
                        <div className="text-slate-500 pl-5">
                          {assignment.route.origin} → {assignment.route.destination}
                        </div>
                        <div className="text-slate-400 pl-5 text-[11px]">
                          Est: {assignment.route.planned_distance_km} km
                        </div>
                      </div>
                    )}

                    {/* Action Buttons based on State */}
                    <div className="space-y-2 pt-1">
                      {isScheduled && !isConfirmed && (
                        <Button
                          variant="primary"
                          size="lg"
                          className="w-full text-base py-3 font-bold shadow-md"
                          onClick={() => handleConfirmDuty(assignment.id)}
                          leftIcon={<CheckCircle2 className="w-5 h-5" />}
                        >
                          Confirm Duty Assignment
                        </Button>
                      )}

                      {/* If duty confirmed or in progress, allow starting or completing trips */}
                      {isConfirmed && !activeTrip && assignment.status !== 'completed' && (
                        <Button
                          variant="primary"
                          size="lg"
                          className="w-full text-base py-3 font-bold shadow-md bg-indigo-600 hover:bg-indigo-700"
                          onClick={() => setStartTripModalDuty(assignment)}
                          leftIcon={<Play className="w-5 h-5" />}
                        >
                          {completedTrips.length === 0
                            ? 'Start Trip #1'
                            : `Start Trip #${completedTrips.length + 1}`}
                        </Button>
                      )}

                      {activeTrip && (
                        <div className="space-y-2">
                          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs space-y-1">
                            <div className="font-bold text-amber-900 flex items-center justify-between">
                              <span>Trip #{activeTrip.trip_number} Currently In Progress</span>
                              <span className="animate-pulse text-amber-600">● LIVE</span>
                            </div>
                            <div className="text-amber-800">
                              Start Odometer: <strong>{activeTrip.start_odometer} km</strong>
                            </div>
                          </div>

                          <Button
                            variant="success"
                            size="lg"
                            className="w-full text-base py-3 font-bold shadow-md"
                            onClick={() => setCompleteTripModalTrip(activeTrip)}
                            leftIcon={<CheckCircle className="w-5 h-5" />}
                          >
                            Complete Trip #{activeTrip.trip_number}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Trips list under this duty */}
                    {completedTrips.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5" />
                          <span>Logged Trips Under This Duty</span>
                        </div>
                        <div className="space-y-1.5">
                          {completedTrips.map((t) => {
                            const dist =
                              t.start_odometer && t.end_odometer
                                ? (t.end_odometer - t.start_odometer).toFixed(1)
                                : '—';
                            return (
                              <div
                                key={t.id}
                                className="flex items-center justify-between text-xs bg-slate-50 px-3 py-2 rounded border border-slate-100"
                              >
                                <span className="font-medium text-slate-700">
                                  Trip #{t.trip_number}
                                </span>
                                <span className="font-mono text-slate-500 text-[11px]">
                                  {t.start_odometer} → {t.end_odometer} km
                                </span>
                                <span className="font-bold text-emerald-600 font-mono">
                                  +{dist} km
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </main>

      {/* Start Trip Modal */}
      {startTripModalDuty && (
        <StartTripModal
          isOpen={!!startTripModalDuty}
          onClose={() => setStartTripModalDuty(null)}
          onSuccess={loadData}
          assignmentId={startTripModalDuty.id}
          defaultOdometer={startTripModalDuty.vehicle.current_odometer}
          plannedDestination={startTripModalDuty.route?.destination}
          tripNumber={(startTripModalDuty.trips?.length || 0) + 1}
        />
      )}

      {/* Complete Trip Modal */}
      {completeTripModalTrip && (
        <CompleteTripModal
          isOpen={!!completeTripModalTrip}
          onClose={() => setCompleteTripModalTrip(null)}
          onSuccess={loadData}
          trip={completeTripModalTrip}
        />
      )}
    </div>
  );
}
