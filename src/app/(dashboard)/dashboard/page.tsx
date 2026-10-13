'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { dataRepo } from '@/lib/data-service';
import { DashboardMetrics, AssignmentWithDetails } from '@/types/models';
import { Vehicle, Driver, Route, Team, AssignmentEvent } from '@/types/database';
import { AssignmentFormModal } from '@/components/assignments/AssignmentFormModal';
import {
  Truck,
  Users,
  CalendarCheck2,
  Navigation,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  Wrench,
  ShieldAlert,
} from 'lucide-react';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [todayAssignments, setTodayAssignments] = useState<AssignmentWithDetails[]>([]);
  const [events, setEvents] = useState<AssignmentEvent[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [m, a, ev, v, d, r, t] = await Promise.all([
        dataRepo.getDashboardMetrics(),
        dataRepo.getAssignmentsWithDetails(),
        dataRepo.getAssignmentEvents(),
        dataRepo.getVehicles(),
        dataRepo.getDrivers(),
        dataRepo.getRoutes(),
        dataRepo.getTeams(),
      ]);
      setMetrics(m);
      setTodayAssignments(a);
      setEvents(ev.slice(0, 8));
      setVehicles(v);
      setDrivers(d);
      setRoutes(r);
      setTeams(t);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <PageContainer
      title="Fleet Operations Control Center"
      subtitle="Real-time vehicle allocations, live transit trips, and duty confirmations."
      action={
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Assignment
          </Button>
          <Link href="/reports">
            <Button variant="outline" size="md">
              Monthly Reports
            </Button>
          </Link>
        </div>
      }
    >
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Vehicles Metric */}
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Vehicles</span>
              <Truck className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {metrics?.totalVehicles ?? '—'}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-1 border-t border-slate-100">
              <span className="text-emerald-600 font-semibold">
                {metrics?.activeVehicles ?? 0} Active
              </span>
              <span>•</span>
              <span className="text-amber-600 font-semibold flex items-center gap-1">
                <Wrench className="w-3 h-3" /> {metrics?.maintenanceVehicles ?? 0} Maint.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Drivers Metric */}
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Drivers</span>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {metrics?.totalDrivers ?? '—'}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-1 border-t border-slate-100">
              <span className="text-emerald-600 font-semibold">
                {metrics?.activeDrivers ?? 0} On Duty / Active
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Today's Duties & Confirmations */}
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Today&apos;s Duties
              </span>
              <CalendarCheck2 className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {metrics?.todayAssignmentsCount ?? '—'}
            </div>
            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              {metrics?.pendingConfirmationsCount ? (
                <span className="text-amber-600 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {metrics.pendingConfirmationsCount} Pending Driver Confirmation
                </span>
              ) : (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> All Drivers Confirmed
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Live Trips */}
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Trips</span>
              <Navigation className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono flex items-center gap-2">
              <span>{metrics?.activeTripsCount ?? '—'}</span>
              {metrics?.activeTripsCount ? (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold animate-pulse">
                  IN TRANSIT
                </span>
              ) : null}
            </div>
            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              <span className="text-slate-600 font-medium">
                {metrics?.completedTripsCount ?? 0} Completed today
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Two-Column Operational Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Today's Active Duties */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Today&apos;s Fleet Assignments</span>
            </h2>
            <Link
              href="/assignments"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>Manage All Duties</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {todayAssignments.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-sm text-slate-500">
                  No assignments created for today yet. Click &quot;New Assignment&quot; to allocate duties.
                </CardContent>
              </Card>
            ) : (
              todayAssignments.slice(0, 5).map((a) => (
                <Card key={a.id} className="hover:border-slate-300 transition-colors">
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 font-mono">
                          {a.vehicle.registration_number}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs font-semibold text-slate-700">
                          {a.driver.full_name}
                        </span>
                        <StatusBadge status={a.status} size="sm" />
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-3">
                        <span>
                          {a.planned_start_time.slice(0, 5)} - {a.planned_end_time.slice(0, 5)}
                        </span>
                        {a.route && <span>• Route: {a.route.code}</span>}
                        {a.team && <span>• {a.team.name}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/assignments`}>
                        <Button variant="outline" size="sm">
                          Details
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Recent Operational Activity / Audit Trail */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-slate-600" />
              <span>Operational Activity</span>
            </h2>
            <Link
              href="/audit-logs"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Full Log
            </Link>
          </div>

          <Card>
            <CardContent className="p-4 space-y-3">
              {events.length === 0 ? (
                <div className="text-xs text-slate-400 py-4 text-center">
                  No operational events logged yet.
                </div>
              ) : (
                events.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-start gap-2.5 text-xs pb-3 border-b border-slate-100 last:border-0 last:pb-0"
                  >
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 uppercase text-[10px]">
                          {e.event_type}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(e.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-0.5">{e.reason}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Quick Shortcuts */}
          <Card className="bg-slate-900 text-white border-slate-800">
            <CardContent className="p-4 space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Fleet Management
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Link
                  href="/vehicles"
                  className="bg-slate-800 hover:bg-slate-700 p-2.5 rounded-lg flex items-center justify-between font-medium"
                >
                  <span>Vehicles ({vehicles.length})</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
                <Link
                  href="/drivers"
                  className="bg-slate-800 hover:bg-slate-700 p-2.5 rounded-lg flex items-center justify-between font-medium"
                >
                  <span>Drivers ({drivers.length})</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
                <Link
                  href="/routes"
                  className="bg-slate-800 hover:bg-slate-700 p-2.5 rounded-lg flex items-center justify-between font-medium"
                >
                  <span>Routes ({routes.length})</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
                <Link
                  href="/teams"
                  className="bg-slate-800 hover:bg-slate-700 p-2.5 rounded-lg flex items-center justify-between font-medium"
                >
                  <span>Clients ({teams.length})</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* New Assignment Modal */}
      <AssignmentFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
        vehicles={vehicles}
        drivers={drivers}
        routes={routes}
        teams={teams}
      />
    </PageContainer>
  );
}
