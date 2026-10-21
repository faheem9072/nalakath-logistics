'use client';

import React, { useState, useEffect } from 'react';
import { dataRepo, DriverMonthlySummary } from '@/lib/data-service';
import { Driver, Trip } from '@/types/database';
import { MoveIQDarkCard } from '@/components/moveiq/MoveIQDarkCard';
import {
  ArrowLeft,
  Calendar,
  Truck,
  Gauge,
  Phone,
  Pencil,
  Trash2,
  CheckCircle,
  Clock,
  Archive,
  X,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface DriverDetailViewProps {
  driverId: string;
  onBack: () => void;
  onDriverUpdated?: () => void;
}

export function DriverDetailView({
  driverId,
  onBack,
  onDriverUpdated,
}: DriverDetailViewProps) {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [summary, setSummary] = useState<DriverMonthlySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Edit Driver Modal
  const [isEditDriverOpen, setIsEditDriverOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSubmittingDriver, setIsSubmittingDriver] = useState(false);
  const [driverEditError, setDriverEditError] = useState<string | null>(null);

  // Edit Trip Modal (Owner Correction)
  const [editingTrip, setEditingTrip] = useState<DriverMonthlySummary['tripDetails'][0] | null>(null);
  const [tripStartOdo, setTripStartOdo] = useState('');
  const [tripEndOdo, setTripEndOdo] = useState('');
  const [tripNotes, setTripNotes] = useState('');
  const [isSubmittingTrip, setIsSubmittingTrip] = useState(false);
  const [tripError, setTripError] = useState<string | null>(null);

  const loadDriverData = async () => {
    setIsLoading(true);
    try {
      const drivers = await dataRepo.getDrivers();
      const current = drivers.find((d) => d.id === driverId);
      if (current) {
        setDriver(current);
        setEditName(current.full_name);
        setEditPhone(current.phone);
      }

      const res = await dataRepo.getDriverMonthlySummary(
        driverId,
        selectedMonth === 'ALL' ? undefined : selectedMonth
      );
      setSummary(res);
    } catch (err) {
      console.error('Failed to load driver summary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDriverData();
  }, [driverId, selectedMonth]);

  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driver) return;
    setDriverEditError(null);
    setIsSubmittingDriver(true);
    try {
      await dataRepo.updateDriver(driver.id, {
        full_name: editName.trim(),
        phone: editPhone.trim(),
      });
      setIsEditDriverOpen(false);
      await loadDriverData();
      if (onDriverUpdated) onDriverUpdated();
    } catch (err: unknown) {
      setDriverEditError(err instanceof Error ? err.message : 'Failed to update driver');
    } finally {
      setIsSubmittingDriver(false);
    }
  };

  const handleArchiveDriver = async () => {
    if (!driver) return;
    if (confirm(`Archive driver "${driver.full_name}"? Driver will be marked inactive.`)) {
      await dataRepo.archiveDriver(driver.id);
      if (onDriverUpdated) onDriverUpdated();
      onBack();
    }
  };

  const handleOpenEditTrip = (trip: DriverMonthlySummary['tripDetails'][0]) => {
    setEditingTrip(trip);
    setTripStartOdo(trip.startOdo !== null ? String(trip.startOdo) : '');
    setTripEndOdo(trip.endOdo !== null ? String(trip.endOdo) : '');
    setTripNotes(trip.notes || '');
    setTripError(null);
  };

  const handleSaveTripCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrip) return;
    const startNum = parseFloat(tripStartOdo);
    const endNum = parseFloat(tripEndOdo);

    if (isNaN(startNum) || startNum < 0) {
      setTripError('Please enter a valid Start KM');
      return;
    }
    if (isNaN(endNum) || endNum < startNum) {
      setTripError('End KM must be greater than or equal to Start KM');
      return;
    }

    setIsSubmittingTrip(true);
    try {
      await dataRepo.updateTrip(editingTrip.tripId, {
        start_odometer: startNum,
        end_odometer: endNum,
        driver_notes: tripNotes.trim() || null,
      });
      setEditingTrip(null);
      await loadDriverData();
      if (onDriverUpdated) onDriverUpdated();
    } catch (err: unknown) {
      setTripError(err instanceof Error ? err.message : 'Failed to correct trip');
    } finally {
      setIsSubmittingTrip(false);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (confirm('Delete this trip entry? This cannot be undone.')) {
      await dataRepo.deleteTrip(tripId);
      await loadDriverData();
      if (onDriverUpdated) onDriverUpdated();
    }
  };

  if (!driver) {
    return (
      <div className="p-6 text-center text-gray-500">
        Loading driver details...
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Top Navigation & Month Selector Bar */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="w-11 h-11 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex items-center justify-center text-gray-800 hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
          aria-label="Back to drivers"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Month Selector Pill */}
        <div className="flex items-center gap-1.5 bg-white border border-gray-200/80 px-3.5 py-2 rounded-full shadow-2xs">
          <Calendar className="w-4 h-4 text-gray-500" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-xs font-bold text-[#121316] focus:outline-none cursor-pointer"
          >
            <option value="2026-10">October 2026</option>
            <option value="2026-09">September 2026</option>
            <option value="2026-08">August 2026</option>
            <option value="ALL">All Time</option>
          </select>
        </div>

        {/* Edit Driver Header Action */}
        <button
          type="button"
          onClick={() => setIsEditDriverOpen(true)}
          className="w-11 h-11 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex items-center justify-center text-gray-800 hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
          aria-label="Edit driver"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>

      {/* Driver Header Summary Card */}
      <div className="bg-white rounded-[28px] p-5 border border-gray-100 shadow-2xs space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gray-100 text-gray-600 mb-1">
              <span>{driver.employee_code}</span>
            </div>
            <h1 className="text-xl font-black text-[#121316] tracking-tight">
              {driver.full_name}
            </h1>
            <p className="text-xs text-gray-500 font-mono mt-0.5 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-gray-400" />
              <span>{driver.phone}</span>
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                driver.status === 'active'
                  ? 'bg-[#D4F65B] text-black'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {driver.status === 'active' ? 'Active' : 'Inactive'}
            </span>
            <button
              type="button"
              onClick={handleArchiveDriver}
              className="text-[11px] text-gray-400 hover:text-rose-600 flex items-center gap-1 cursor-pointer pt-1"
            >
              <Archive className="w-3 h-3" />
              <span>Archive</span>
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Summary Clearly at Top (Used for Salary Calculation) */}
      <MoveIQDarkCard
        title="Monthly Summary"
        subtitle={`Used for salary calculation (${selectedMonth === 'ALL' ? 'All Months' : selectedMonth})`}
      >
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          <div className="bg-[#1E1F24] rounded-2xl p-3.5 text-center">
            <p className="text-[11px] font-medium text-gray-400">Trips</p>
            <p className="text-2xl font-black text-white mt-1">
              {summary?.totalTripsCount || 0}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">completed</span>
          </div>

          <div className="bg-[#1E1F24] rounded-2xl p-3.5 text-center">
            <p className="text-[11px] font-medium text-gray-400">Days Worked</p>
            <p className="text-2xl font-black text-[#D4F65B] mt-1">
              {summary?.totalDaysWorked || 0}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">duty days</span>
          </div>

          <div className="bg-[#1E1F24] rounded-2xl p-3.5 text-center">
            <p className="text-[11px] font-medium text-gray-400">Total KM</p>
            <p className="text-2xl font-black text-white mt-1">
              {summary?.totalKilometers || 0}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">km run</span>
          </div>
        </div>
      </MoveIQDarkCard>

      {/* Which vehicles he drove (Some use one vehicle, some many) */}
      <div className="bg-white rounded-[28px] p-5 border border-gray-100 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-[#121316] uppercase tracking-wider">
            Vehicles Driven This Month
          </h2>
          <span className="text-xs font-bold text-gray-400">
            {summary?.vehiclesBreakdown.length || 0} Vehicles
          </span>
        </div>

        {summary?.vehiclesBreakdown.length === 0 ? (
          <p className="text-xs text-gray-400 py-3 text-center">
            No vehicle trips recorded for this month.
          </p>
        ) : (
          <div className="space-y-2">
            {summary?.vehiclesBreakdown.map((item) => (
              <div
                key={item.vehicle.id}
                className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-gray-100 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-800 shrink-0">
                    <Truck className="w-5 h-5 text-[#121316]" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-[#121316]">
                      {item.vehicle.registration_number}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {item.vehicle.make_model} • {item.vehicle.company || 'Delhivery'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-black text-[#121316]">
                    {item.totalKm} km
                  </p>
                  <p className="text-[11px] text-gray-400 font-medium">
                    {item.tripsCount} {item.tripsCount === 1 ? 'trip' : 'trips'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trip List with Owner Correction */}
      <div className="bg-white rounded-[28px] p-5 border border-gray-100 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-[#121316] uppercase tracking-wider">
            Trip List ({summary?.tripDetails.length || 0})
          </h2>
          <span className="text-[11px] text-gray-400 font-medium">
            Tap edit to correct
          </span>
        </div>

        {summary?.tripDetails.length === 0 ? (
          <p className="text-xs text-gray-400 py-6 text-center">
            No trips logged for this month.
          </p>
        ) : (
          <div className="space-y-2.5">
            {summary?.tripDetails.map((trip) => (
              <div
                key={trip.tripId}
                className="p-3.5 rounded-2xl border border-gray-100 bg-[#F8F9FA] space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-900">
                        {trip.dutyDate}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs font-mono font-bold text-[#121316]">
                        {trip.vehicleRegistration}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                      {trip.destination}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditTrip(trip)}
                      className="p-1.5 rounded-xl text-gray-500 hover:text-black hover:bg-white transition-colors cursor-pointer"
                      title="Correct trip"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTrip(trip.tripId)}
                      className="p-1.5 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-white transition-colors cursor-pointer"
                      title="Delete trip"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Odometer & KM breakdown */}
                <div className="flex items-center justify-between pt-1 border-t border-gray-200/60 text-xs">
                  <div className="text-gray-500">
                    Odo: <span className="font-mono">{trip.startOdo ?? '—'}</span> →{' '}
                    <span className="font-mono">{trip.endOdo ?? '—'}</span>
                  </div>
                  <div className="font-bold text-[#121316]">
                    {trip.distance} km
                  </div>
                </div>

                {trip.notes && (
                  <p className="text-[11px] text-gray-500 italic bg-white p-2 rounded-xl">
                    &quot;{trip.notes}&quot;
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Driver Modal */}
      {isEditDriverOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-[32px] p-6 max-w-sm w-full space-y-4 shadow-2xl border border-gray-100 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#121316]">
                Edit Driver Details
              </h3>
              <button
                type="button"
                onClick={() => setIsEditDriverOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {driverEditError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{driverEditError}</span>
              </div>
            )}

            <form onSubmit={handleSaveDriver} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                  required
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditDriverOpen(false)}
                  className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDriver}
                  className="flex-1 h-11 rounded-xl bg-[#121316] text-white font-bold text-xs hover:bg-black cursor-pointer"
                >
                  {isSubmittingDriver ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Trip Modal (Owner Correction) */}
      {editingTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-[32px] p-6 max-w-sm w-full space-y-4 shadow-2xl border border-gray-100 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#121316]">
                Correct Trip Entry
              </h3>
              <button
                type="button"
                onClick={() => setEditingTrip(null)}
                className="p-1 rounded-full text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              {editingTrip.dutyDate} • {editingTrip.vehicleRegistration}
            </p>

            {tripError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{tripError}</span>
              </div>
            )}

            <form onSubmit={handleSaveTripCorrection} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Start KM
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={tripStartOdo}
                    onChange={(e) => setTripStartOdo(e.target.value)}
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    End KM
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={tripEndOdo}
                    onChange={(e) => setTripEndOdo(e.target.value)}
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Trip Notes / Correction Reason
                </label>
                <input
                  type="text"
                  value={tripNotes}
                  onChange={(e) => setTripNotes(e.target.value)}
                  placeholder="Optional notes"
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm text-[#121316] focus:outline-none focus:border-gray-400"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTrip(null)}
                  className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTrip}
                  className="flex-1 h-11 rounded-xl bg-[#121316] text-white font-bold text-xs hover:bg-black cursor-pointer"
                >
                  {isSubmittingTrip ? 'Updating...' : 'Save Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
