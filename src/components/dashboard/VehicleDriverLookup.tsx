'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Vehicle, Driver, Route, Trip, Assignment } from '@/types/database';
import { VehicleDetailView } from '@/components/dashboard/VehicleDetailView';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  Search,
  Phone,
  Clock,
  Navigation,
  Gauge,
  AlertCircle,
  Plus,
  X,
  MapPin,
  Users,
  BarChart3,
  ExternalLink,
} from 'lucide-react';

interface VehicleDriverLookupProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  assignments: Assignment[];
  routes: Route[];
  trips: Trip[];
  onOpenNewAssignment: (vehicleId?: string) => void;
}

export function VehicleDriverLookup({
  vehicles,
  drivers,
  assignments,
  routes,
  trips,
  onOpenNewAssignment,
}: VehicleDriverLookupProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    vehicles[0]?.id || ''
  );
  const [companyFilter, setCompanyFilter] = useState<'All' | 'Delhivery' | 'Shadowfax'>('All');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Active searched or selected vehicle with partial match (e.g. "3057")
  const currentVehicle =
    vehicles.find((v) => {
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase().replace(/[\s-]/g, '');
        const reg = v.registration_number.toLowerCase().replace(/[\s-]/g, '');
        const model = v.make_model.toLowerCase();
        const route = (v.route_location || '').toLowerCase();
        return (
          reg.includes(q) ||
          model.includes(searchQuery.trim().toLowerCase()) ||
          route.includes(searchQuery.trim().toLowerCase())
        );
      }
      return v.id === selectedVehicleId;
    }) || vehicles[0];

  // Find today's assignment for this vehicle
  const todayAssignment = currentVehicle
    ? assignments.find((a) => a.vehicle_id === currentVehicle.id)
    : null;

  // Find assigned driver
  const assignedDriver = todayAssignment
    ? drivers.find((d) => d.id === todayAssignment.driver_id)
    : null;

  // Find assigned route
  const assignedRoute = todayAssignment
    ? routes.find((r) => r.id === todayAssignment.route_id)
    : null;

  // Find trips for this assignment
  const assignmentTrips = todayAssignment
    ? trips.filter((t) => t.assignment_id === todayAssignment.id)
    : [];

  const activeTrip = assignmentTrips.find((t) => t.status === 'in_progress');
  const completedTrips = assignmentTrips.filter((t) => t.status === 'completed');

  // Calculate total distance run today
  const totalKmRun = completedTrips.reduce((acc, t) => {
    if (t.start_odometer !== null && t.end_odometer !== null) {
      return acc + (t.end_odometer - t.start_odometer);
    }
    return acc;
  }, 0);

  const filteredChips = vehicles.filter((v) => {
    if (companyFilter !== 'All' && v.company !== companyFilter) return false;
    return true;
  });

  const isDelhivery = currentVehicle?.company === 'Delhivery';

  return (
    <Card className="border-2 border-blue-600/30 shadow-md bg-white overflow-hidden rounded-2xl">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-3.5 sm:p-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-600/40 text-blue-300 border border-blue-500/30">
                <Search className="w-4 h-4" />
              </span>
              <h2 className="text-sm sm:text-base font-black tracking-tight uppercase">
                {t('lookupTitle')}
              </h2>
            </div>
            {todayAssignment && (
              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{t('dutyLiveBadge')}</span>
              </span>
            )}
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Type any vehicle number (e.g. <strong className="text-white">&quot;3057&quot;</strong>, &quot;2266&quot;, &quot;3443&quot;, &quot;5682&quot;) to view today&apos;s driver, live trips, and full monthly operations expenses:
          </p>

          {/* Search Input Box */}
          <div className="relative w-full">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder={t('lookupPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-10 py-2.5 text-sm sm:text-base font-mono font-bold bg-slate-800/90 text-white placeholder-slate-400 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 p-0.5 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Company Filter Tabs on Quick Chips */}
        <div className="pt-3 border-t border-slate-800/80 mt-2 space-y-2">
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Company:
            </span>
            {(['All', 'Delhivery', 'Shadowfax'] as const).map((comp) => (
              <button
                key={comp}
                onClick={() => setCompanyFilter(comp)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  companyFilter === comp
                    ? comp === 'Delhivery'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : comp === 'Shadowfax'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {comp}
              </button>
            ))}
          </div>

          {/* Quick Vehicle Select Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {filteredChips.map((v) => {
              const isSelected = currentVehicle?.id === v.id;
              const hasDuty = assignments.some((a) => a.vehicle_id === v.id);

              return (
                <button
                  key={v.id}
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedVehicleId(v.id);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                    isSelected
                      ? v.company === 'Delhivery'
                        ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-400'
                        : 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-400'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <span>{v.registration_number}</span>
                  {hasDuty && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Details Box for the Found Vehicle */}
      <CardContent className="p-3.5 sm:p-5 space-y-4">
        {!currentVehicle ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            {t('vehicleNotFound')}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Top Vehicle Header Card */}
            <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                    {t('selectedVehicleLabel')}
                  </span>
                  {/* Company Pill */}
                  <span
                    className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border ${
                      isDelhivery
                        ? 'bg-rose-50 text-rose-700 border-rose-300'
                        : 'bg-amber-50 text-amber-700 border-amber-300'
                    }`}
                  >
                    Company: {currentVehicle.company || 'Delhivery'}
                  </span>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      currentVehicle.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {currentVehicle.status === 'active'
                      ? t('activeVehicles')
                      : t('maintenanceVehicles')}
                  </span>
                </div>

                <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-wider">
                  {currentVehicle.registration_number}
                </div>
                <div className="text-xs font-semibold text-slate-600">
                  {currentVehicle.make_model} • {currentVehicle.capacity} Capacity
                </div>
                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3 pt-1">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <strong>Route:</strong> {currentVehicle.route_location || 'Ad-hoc'}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <strong>Default:</strong> {(currentVehicle.default_driver_names || []).join(', ') || 'Unassigned'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-2 shrink-0">
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    {t('currentOdoLabel')}
                  </span>
                  <span className="font-mono font-black text-slate-900 text-base sm:text-lg">
                    {currentVehicle.current_odometer.toLocaleString()} km
                  </span>
                </div>

                {/* Inspect Monthly Detail & Expenses Button */}
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setIsDetailModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                  leftIcon={<BarChart3 className="w-3.5 h-3.5" />}
                >
                  View Details & Monthly Expenses
                </Button>
              </div>
            </div>

            {/* Today's Driver Card & Trip Status */}
            {todayAssignment && assignedDriver ? (
              <div className="space-y-3">
                {/* Driver Info Card with 1-Tap Call */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200/90 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-sm">
                      {assignedDriver.full_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider block">
                        {t('todayDriverTitle')}
                      </span>
                      <div className="text-base sm:text-lg font-black text-slate-900">
                        {assignedDriver.full_name}
                      </div>
                      <div className="text-xs font-mono text-slate-600">
                        {assignedDriver.employee_code} • {assignedDriver.phone}
                      </div>
                    </div>
                  </div>

                  <a
                    href={`tel:${assignedDriver.phone}`}
                    className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    <Phone className="w-4 h-4" />
                    <span>{t('callDriverBtn')} ({assignedDriver.full_name.split(' ')[0]})</span>
                  </a>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-600" />
                      <span>{t('dutyTimeLabel')}</span>
                    </span>
                    <span className="text-xs font-black font-mono text-slate-800 block mt-1">
                      {todayAssignment.planned_start_time.slice(0, 5)} – {todayAssignment.planned_end_time.slice(0, 5)}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                      <Navigation className="w-3 h-3 text-blue-600" />
                      <span>{t('shiftRouteTh')}</span>
                    </span>
                    <span className="text-xs font-bold text-slate-800 block mt-1 truncate">
                      {assignedRoute?.name || todayAssignment.notes || 'Ad-hoc route'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {t('todayStatusLabel')}
                    </span>
                    <div className="mt-1">
                      {activeTrip ? (
                        <span className="text-xs font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full inline-block animate-pulse">
                          {t('liveDrivingBadge')}
                        </span>
                      ) : completedTrips.length > 0 ? (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-block">
                          {t('dutyCompletedBadge')}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full inline-block">
                          {t('dutyConfirmedBadge')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-emerald-600" />
                      <span>{t('distanceRunLabel')}</span>
                    </span>
                    <span className="text-sm font-black font-mono text-emerald-600 block mt-1">
                      {totalKmRun > 0 ? `${totalKmRun.toFixed(1)} km` : t('notStartedYet')}
                    </span>
                  </div>
                </div>

                {/* Trip Logs */}
                {assignmentTrips.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      {t('todayTripLogsTitle')} ({assignmentTrips.length})
                    </span>
                    <div className="space-y-1.5">
                      {assignmentTrips.map((tItem) => {
                        const dist =
                          tItem.start_odometer && tItem.end_odometer
                            ? (tItem.end_odometer - tItem.start_odometer).toFixed(1)
                            : null;

                        return (
                          <div
                            key={tItem.id}
                            className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">
                                Trip #{tItem.trip_number}
                              </span>
                              {tItem.status === 'in_progress' ? (
                                <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.2 rounded animate-pulse">
                                  IN TRANSIT
                                </span>
                              ) : (
                                <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.2 rounded">
                                  COMPLETED
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-slate-600 text-xs">
                              {tItem.start_odometer} km{' '}
                              {tItem.end_odometer ? `→ ${tItem.end_odometer} km` : ''}
                            </div>
                            {dist && (
                              <span className="font-black text-emerald-600 font-mono text-xs">
                                +{dist} km
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-amber-50/80 border-2 border-amber-200 rounded-xl p-4 text-center space-y-2.5">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    {t('noDriverAssignedTitle')}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {t('noDriverAssignedSubtitle')}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  className="font-bold text-xs"
                  onClick={() => onOpenNewAssignment(currentVehicle.id)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  {t('assignDutyToVehicleBtn')}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Full Vehicle Detail & Monthly Expenses Modal */}
      {isDetailModalOpen && currentVehicle && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Vehicle Detail — ${currentVehicle.registration_number}`}
          maxWidth="2xl"
        >
          <div className="py-2">
            <VehicleDetailView
              initialVehicleQuery={currentVehicle.registration_number}
              showBackBtn={false}
            />
          </div>
        </Modal>
      )}
    </Card>
  );
}
