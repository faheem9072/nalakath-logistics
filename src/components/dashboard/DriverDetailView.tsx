'use client';

import React, { useState, useEffect } from 'react';
import { dataRepo, DriverMonthlySummary } from '@/lib/data-service';
import { db, isFirebaseConfigured } from '@/lib/firebase/config';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { Driver, Vehicle } from '@/types/database';
import { MoveIQDarkCard } from '@/components/moveiq/MoveIQDarkCard';
import {
  ArrowLeft,
  Calendar,
  Truck,
  Phone,
  Pencil,
  Trash2,
  CheckCircle2,
  Archive,
  X,
  AlertCircle,
  Plus,
  KeyRound,
  ShieldCheck,
  FileSpreadsheet,
  Zap,
  Clock,
} from 'lucide-react';
import { triggerExcelDownload } from '@/lib/utils/download-excel';

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
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);

  // Edit Driver Modal
  const [isEditDriverOpen, setIsEditDriverOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPin, setEditPin] = useState('1234');
  const [editIsActive, setEditIsActive] = useState(true);
  const [isSubmittingDriver, setIsSubmittingDriver] = useState(false);
  const [driverEditError, setDriverEditError] = useState<string | null>(null);

  // Edit Trip Modal (Owner Correction)
  const [editingTrip, setEditingTrip] = useState<DriverMonthlySummary['tripDetails'][0] | null>(null);
  const [tripVehicleId, setTripVehicleId] = useState('');
  const [tripStartPlace, setTripStartPlace] = useState('');
  const [tripEndPlace, setTripEndPlace] = useState('');
  const [tripStartOdo, setTripStartOdo] = useState('');
  const [tripEndOdo, setTripEndOdo] = useState('');
  const [tripStartTime, setTripStartTime] = useState('');
  const [tripEndTime, setTripEndTime] = useState('');
  const [tripNotes, setTripNotes] = useState('');
  const [isSubmittingTrip, setIsSubmittingTrip] = useState(false);
  const [tripError, setTripError] = useState<string | null>(null);

  // Add Missed Trip Modal
  const [isAddTripOpen, setIsAddTripOpen] = useState(false);
  const [addTripVehId, setAddTripVehId] = useState('');
  const [addTripStartPlace, setAddTripStartPlace] = useState('Calicut Logistics Central');
  const [addTripEndPlace, setAddTripEndPlace] = useState('Kochi Terminal');
  const [addTripDate, setAddTripDate] = useState('2026-10-18');
  const [addTripStartTime, setAddTripStartTime] = useState('08:00');
  const [addTripEndTime, setAddTripEndTime] = useState('18:00');
  const [addTripStartKm, setAddTripStartKm] = useState('');
  const [addTripEndKm, setAddTripEndKm] = useState('');
  const [addTripNotes, setAddTripNotes] = useState('');
  const [addTripError, setAddTripError] = useState<string | null>(null);
  const [isSubmittingAddTrip, setIsSubmittingAddTrip] = useState(false);
  const [isTogglingSecondTrip, setIsTogglingSecondTrip] = useState(false);

  const showSavedNotice = (msg: string) => {
    setSavedMessage(msg);
    setTimeout(() => setSavedMessage(null), 3500);
  };

  const loadDriverData = async () => {
    setIsLoading(true);
    try {
      const [drivers, allVehicles] = await Promise.all([
        dataRepo.getDrivers(),
        dataRepo.getVehicles(),
      ]);
      setVehicles(allVehicles);

      const current = drivers.find((d) => d.id === driverId);
      if (current) {
        setDriver(current);
        if (!isEditDriverOpen) {
          setEditName(current.full_name);
          setEditPhone(current.phone);
          setEditPin(current.pin || '1234');
          setEditIsActive(current.is_active !== false);
        }
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
    const unsub = dataRepo.subscribe(loadDriverData);
    const interval = setInterval(loadDriverData, 4000);

    let unsubFirestore: (() => void) | undefined;
    if (isFirebaseConfigured && db) {
      try {
        unsubFirestore = onSnapshot(doc(db, 'drivers', driverId), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setDriver((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                full_name: data.full_name ?? prev.full_name,
                phone: data.phone ?? prev.phone,
                pin: data.pin ?? prev.pin,
                is_active: data.is_active ?? prev.is_active,
                status: data.status ?? prev.status,
                allow_next_trip_override: data.allow_next_trip_override ?? prev.allow_next_trip_override,
              };
            });
          }
        });
      } catch (err) {
        console.warn('Firestore driver listener failed:', err);
      }
    }

    return () => {
      unsub();
      clearInterval(interval);
      if (unsubFirestore) unsubFirestore();
    };
  }, [driverId, selectedMonth, isEditDriverOpen]);

  const handleToggleSecondTrip = async () => {
    if (!driver) return;
    setIsTogglingSecondTrip(true);
    const newOverride = driver.allow_next_trip_override === 1 ? 0 : 1;
    const nowIso = new Date().toISOString();

    try {
      if (isFirebaseConfigured && db) {
        const driverRef = doc(db, 'drivers', driver.id);
        await setDoc(
          driverRef,
          {
            id: driver.id,
            allow_next_trip_override: newOverride,
            updated_at: nowIso,
          },
          { merge: true }
        );
      }

      await dataRepo
        .allowDriverNextTripOverride(driver.id, newOverride === 1)
        .catch((err) => console.warn('dataRepo.allowDriverNextTripOverride sync:', err));

      setDriver((prev) => (prev ? { ...prev, allow_next_trip_override: newOverride } : null));
      showSavedNotice(
        newOverride === 1
          ? '2nd Trip permission granted! Driver can now start next trip immediately.'
          : '2nd Trip permission revoked. Standard rest policy restored.'
      );
      if (onDriverUpdated) onDriverUpdated();
    } catch (err: unknown) {
      console.error('Failed to toggle second trip permission:', err);
      alert(err instanceof Error ? err.message : 'Failed to update 2nd trip permission');
    } finally {
      setIsTogglingSecondTrip(false);
    }
  };

  const handleOpenEditDriver = () => {
    if (driver) {
      setEditName(driver.full_name);
      setEditPhone(driver.phone);
      setEditPin(driver.pin || '1234');
      setEditIsActive(driver.is_active !== false);
      setDriverEditError(null);
      setIsEditDriverOpen(true);
    }
  };

  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driver) return;
    setDriverEditError(null);
    setIsSubmittingDriver(true);

    const targetId = driver.id;
    const name = editName.trim();
    const phone = editPhone.trim();
    const pin = editPin.trim() || '1234';
    const isActive = editIsActive;
    const nowIso = new Date().toISOString();

    try {
      if (isFirebaseConfigured && db) {
        const driverRef = doc(db, 'drivers', targetId);
        await setDoc(
          driverRef,
          {
            id: targetId,
            full_name: name,
            phone: phone,
            pin: pin,
            is_active: isActive,
            status: isActive ? (driver.status || 'idle') : 'inactive',
            updated_at: nowIso,
          },
          { merge: true }
        );
      }

      await dataRepo
        .updateDriver(targetId, {
          full_name: name,
          phone,
          pin,
          is_active: isActive,
        })
        .catch((err) => console.warn('dataRepo.updateDriver secondary sync:', err));

      setIsEditDriverOpen(false);
      showSavedNotice('Driver details saved successfully!');
      await loadDriverData();
      if (onDriverUpdated) onDriverUpdated();
    } catch (err: unknown) {
      console.error('Failed to save driver to Firestore:', err);
      setDriverEditError(err instanceof Error ? err.message : 'Failed to update driver');
    } finally {
      setIsSubmittingDriver(false);
    }
  };

  const handleArchiveDriver = async () => {
    if (!driver) return;
    if (confirm(`Archive driver "${driver.full_name}"? Past trips and history will be preserved.`)) {
      try {
        if (isFirebaseConfigured && db) {
          const driverRef = doc(db, 'drivers', driver.id);
          await setDoc(driverRef, {
            id: driver.id,
            is_active: false,
            status: 'inactive',
            updated_at: new Date().toISOString(),
          }, { merge: true });
        }
        await dataRepo.archiveDriver(driver.id).catch(() => {});
        showSavedNotice('Driver archived. Past trips preserved.');
        if (onDriverUpdated) onDriverUpdated();
        onBack();
      } catch (err) {
        console.error('Failed to archive driver in Firestore:', err);
        alert('Failed to archive driver: ' + (err instanceof Error ? err.message : String(err)));
      }
    }
  };

  const handleOpenEditTrip = (trip: DriverMonthlySummary['tripDetails'][0]) => {
    setEditingTrip(trip);
    const matchedVeh = vehicles.find((v) => v.registration_number === trip.vehicleRegistration);
    setTripVehicleId(matchedVeh?.id || vehicles[0]?.id || '');
    setTripStartPlace(trip.routeName || 'Calicut Logistics Central');
    setTripEndPlace(trip.destination || 'Kerala Corridor');
    setTripStartOdo(trip.startOdo !== null ? String(trip.startOdo) : '');
    setTripEndOdo(trip.endOdo !== null ? String(trip.endOdo) : '');
    setTripStartTime(trip.startTime ? trip.startTime.slice(0, 16) : '');
    setTripEndTime(trip.endTime ? trip.endTime.slice(0, 16) : '');
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
        vehicle_id: tripVehicleId || undefined,
        start_place: tripStartPlace.trim() || undefined,
        end_place: tripEndPlace.trim() || undefined,
        start_odometer: startNum,
        end_odometer: endNum,
        start_time: tripStartTime || undefined,
        end_time: tripEndTime || undefined,
        driver_notes: tripNotes.trim() || null,
      });
      setEditingTrip(null);
      showSavedNotice('Trip entry corrected and saved!');
      await loadDriverData();
      if (onDriverUpdated) onDriverUpdated();
    } catch (err: unknown) {
      setTripError(err instanceof Error ? err.message : 'Failed to correct trip');
    } finally {
      setIsSubmittingTrip(false);
    }
  };

  const handleOpenAddMissedTrip = () => {
    setAddTripVehId(vehicles[0]?.id || '');
    setAddTripStartPlace('Calicut Logistics Central');
    setAddTripEndPlace('Kochi Terminal');
    setAddTripDate(`${selectedMonth === 'ALL' ? '2026-10' : selectedMonth}-18`);
    setAddTripStartTime('08:00');
    setAddTripEndTime('18:00');
    setAddTripStartKm('');
    setAddTripEndKm('');
    setAddTripNotes('Manual entry by owner');
    setAddTripError(null);
    setIsAddTripOpen(true);
  };

  const handleSaveAddMissedTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTripVehId) {
      setAddTripError('Please select a vehicle');
      return;
    }
    const startNum = parseFloat(addTripStartKm);
    const endNum = parseFloat(addTripEndKm);

    if (isNaN(startNum) || startNum < 0) {
      setAddTripError('Please enter a valid Starting KM');
      return;
    }
    if (isNaN(endNum) || endNum <= startNum) {
      setAddTripError('Ending KM must be strictly greater than Starting KM');
      return;
    }

    setIsSubmittingAddTrip(true);
    try {
      const startDateTime = `${addTripDate}T${addTripStartTime}:00`;
      const endDateTime = `${addTripDate}T${addTripEndTime}:00`;

      await dataRepo.addManualTrip({
        driver_id: driverId,
        vehicle_id: addTripVehId,
        start_odometer: startNum,
        end_odometer: endNum,
        start_time: startDateTime,
        end_time: endDateTime,
        route_name: addTripStartPlace.trim(),
        destination: addTripEndPlace.trim(),
        driver_notes: addTripNotes.trim() || 'Added manually by owner',
      });
      setIsAddTripOpen(false);
      showSavedNotice('Missed trip saved successfully!');
      await loadDriverData();
      if (onDriverUpdated) onDriverUpdated();
    } catch (err: unknown) {
      setAddTripError(err instanceof Error ? err.message : 'Failed to add missed trip');
    } finally {
      setIsSubmittingAddTrip(false);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (confirm('Delete this trip entry? This cannot be undone.')) {
      await dataRepo.deleteTrip(tripId);
      showSavedNotice('Trip deleted successfully!');
      await loadDriverData();
      if (onDriverUpdated) onDriverUpdated();
    }
  };

  const handleDownloadExcel = async () => {
    if (!summary) return;
    setIsDownloadingExcel(true);
    try {
      await triggerExcelDownload('driver', summary, selectedMonth);
      showSavedNotice('Salary Excel report downloaded successfully!');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to download Excel file');
    } finally {
      setIsDownloadingExcel(false);
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

        <div className="flex items-center gap-1.5">
          {/* Download Excel Button */}
          <button
            type="button"
            onClick={handleDownloadExcel}
            disabled={isDownloadingExcel}
            className="h-11 px-3 sm:px-3.5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex items-center gap-1.5 text-xs font-bold text-gray-800 hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
            title="Download salary Excel report for this month"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="hidden sm:inline">{isDownloadingExcel ? 'Exporting...' : 'Download Excel'}</span>
          </button>

          {/* Edit Driver Header Action */}
          <button
            type="button"
            onClick={handleOpenEditDriver}
            className="w-11 h-11 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex items-center justify-center text-gray-800 hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
            aria-label="Edit driver"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Saved Notification Banner */}
      {savedMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-800 font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{savedMessage}</span>
        </div>
      )}

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
              <span className="text-gray-300">•</span>
              <KeyRound className="w-3.5 h-3.5 text-gray-400" />
              <span>PIN: {driver.pin || '1234'}</span>
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                driver.is_active !== false && driver.status === 'active'
                  ? 'bg-[#D4F65B] text-black'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {driver.is_active !== false ? 'Active' : 'Inactive'}
            </span>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleOpenEditDriver}
                className="text-[11px] font-bold text-gray-700 hover:text-black flex items-center gap-1 cursor-pointer bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-xl transition-all"
                title="Edit driver phone and login PIN"
              >
                <Pencil className="w-3 h-3" />
                <span>Edit Credentials</span>
              </button>
              <button
                type="button"
                onClick={handleArchiveDriver}
                className="text-[11px] text-gray-400 hover:text-rose-600 flex items-center gap-1 cursor-pointer px-1 py-1"
                title="Archive driver"
              >
                <Archive className="w-3 h-3" />
                <span>Archive</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2nd Trip Permission (Owner Authorization Card) */}
      <div className="bg-gradient-to-br from-[#121316] to-[#1A1C20] rounded-[28px] p-5 border border-[#27282F] shadow-lg text-white space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#D4F65B]/15 border border-[#D4F65B]/30 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-[#D4F65B] fill-[#D4F65B]" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight text-white">
                2nd Trip Authorization
              </h2>
              <p className="text-[11px] text-gray-400">
                Continuous trip permission & cooldown override
              </p>
            </div>
          </div>

          <div>
            {driver.allow_next_trip_override === 1 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-[#D4F65B] text-black shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                <span>2nd Trip Allowed</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-[#22242A] text-gray-400 border border-gray-700">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span>Rest Cooldown Active</span>
              </span>
            )}
          </div>
        </div>

        <div className="bg-[#18191E] rounded-2xl p-3.5 border border-[#25272F] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-gray-300 space-y-1">
            <p className="font-semibold text-white">
              {driver.allow_next_trip_override === 1
                ? 'Permission is ACTIVE: Driver can start a second trip immediately.'
                : 'Standard 6-hour safety cooldown is currently enforced for this driver.'}
            </p>
            <p className="text-[11px] text-gray-400">
              {driver.allow_next_trip_override === 1
                ? 'The driver will not be blocked by the rest timer on their driver app.'
                : 'Turn ON authorization if this driver needs to take an emergency or back-to-back delivery.'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggleSecondTrip}
            disabled={isTogglingSecondTrip}
            className={`cursor-pointer px-4 py-2.5 rounded-xl font-black text-xs transition-all active:scale-95 shrink-0 flex items-center justify-center gap-2 ${
              driver.allow_next_trip_override === 1
                ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                : 'bg-[#D4F65B] hover:bg-[#c4e64d] text-black shadow-sm'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${driver.allow_next_trip_override === 1 ? 'text-rose-300' : 'fill-black'}`} />
            <span>
              {isTogglingSecondTrip
                ? 'Updating...'
                : driver.allow_next_trip_override === 1
                ? 'Revoke Authorization'
                : 'Authorize 2nd Trip Now'}
            </span>
          </button>
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

      {/* Which vehicles he drove */}
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

      {/* Trip List with Owner Full Edit & Missed Trip Addition */}
      <div className="bg-white rounded-[28px] p-5 border border-gray-100 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-[#121316] uppercase tracking-wider">
              Trip List ({summary?.tripDetails.length || 0})
            </h2>
            <p className="text-[11px] text-gray-400">
              Tap edit to change any detail or add missed trip
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={isDownloadingExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-[#121316] text-xs font-bold hover:bg-gray-50 transition-colors cursor-pointer shadow-2xs"
              title="Download salary Excel report for this month"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isDownloadingExcel ? 'Exporting...' : 'Download Excel'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddMissedTrip}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#121316] text-white text-xs font-bold hover:bg-black transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#D4F65B]" />
              <span>Add Missed Trip</span>
            </button>
          </div>
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
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-gray-900">
                        {trip.dutyDate}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs font-mono font-bold text-[#121316]">
                        {trip.vehicleRegistration}
                      </span>
                      {trip.editedByOwnerAt && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          edited by owner • {new Date(trip.editedByOwnerAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 font-medium mt-0.5">
                      {trip.routeName || 'Calicut Logistics Central'} → {trip.destination || 'Kerala Corridor'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditTrip(trip)}
                      className="p-1.5 rounded-xl text-gray-500 hover:text-black hover:bg-white transition-colors cursor-pointer"
                      title="Edit trip details"
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

      {/* Edit Driver Modal (Name, Phone, PIN reset, Active/Inactive) */}
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

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Login PIN (Reset)
                </label>
                <input
                  type="text"
                  value={editPin}
                  onChange={(e) => setEditPin(e.target.value)}
                  placeholder="e.g. 1234"
                  maxLength={6}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-mono font-bold text-[#121316] focus:outline-none focus:border-gray-400"
                  required
                />
              </div>

              <div className="space-y-1 pt-1">
                <label className="text-xs font-bold text-gray-700 uppercase block">
                  Driver Status
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                    <input
                      type="radio"
                      checked={editIsActive}
                      onChange={() => setEditIsActive(true)}
                    />
                    <span>Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-500">
                    <input
                      type="radio"
                      checked={!editIsActive}
                      onChange={() => setEditIsActive(false)}
                    />
                    <span>Inactive</span>
                  </label>
                </div>
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

      {/* Edit Trip Modal (Owner Full Control: vehicle, start/end place, start/end KM, start/end time, notes) */}
      {editingTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-[32px] p-6 max-w-sm w-full space-y-4 shadow-2xl border border-gray-100 animate-in fade-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#121316]">
                Edit Trip (Owner Control)
              </h3>
              <button
                type="button"
                onClick={() => setEditingTrip(null)}
                className="p-1 rounded-full text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {tripError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{tripError}</span>
              </div>
            )}

            <form onSubmit={handleSaveTripCorrection} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Vehicle
                </label>
                <select
                  value={tripVehicleId}
                  onChange={(e) => setTripVehicleId(e.target.value)}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400 cursor-pointer"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registration_number} ({v.make_model})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Start Place
                  </label>
                  <input
                    type="text"
                    value={tripStartPlace}
                    onChange={(e) => setTripStartPlace(e.target.value)}
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                    placeholder="Origin"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    End Place
                  </label>
                  <input
                    type="text"
                    value={tripEndPlace}
                    onChange={(e) => setTripEndPlace(e.target.value)}
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                    placeholder="Destination"
                  />
                </div>
              </div>

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

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Start Time
                  </label>
                  <input
                    type="text"
                    value={tripStartTime}
                    onChange={(e) => setTripStartTime(e.target.value)}
                    placeholder="YYYY-MM-DDTHH:MM"
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-mono text-[#121316] focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    End Time
                  </label>
                  <input
                    type="text"
                    value={tripEndTime}
                    onChange={(e) => setTripEndTime(e.target.value)}
                    placeholder="YYYY-MM-DDTHH:MM"
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-mono text-[#121316] focus:outline-none focus:border-gray-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Driver Notes / Reason
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
                  {isSubmittingTrip ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Missed Trip Modal */}
      {isAddTripOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-[32px] p-6 max-w-sm w-full space-y-4 shadow-2xl border border-gray-100 animate-in fade-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#121316]">
                Add Missed Trip Manually
              </h3>
              <button
                type="button"
                onClick={() => setIsAddTripOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Add a past trip completed by <strong>{driver.full_name}</strong>.
            </p>

            {addTripError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{addTripError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAddMissedTrip} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Vehicle Driven
                </label>
                <select
                  value={addTripVehId}
                  onChange={(e) => setAddTripVehId(e.target.value)}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400 cursor-pointer"
                  required
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registration_number} ({v.make_model})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Start Place
                  </label>
                  <input
                    type="text"
                    value={addTripStartPlace}
                    onChange={(e) => setAddTripStartPlace(e.target.value)}
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    End Place
                  </label>
                  <input
                    type="text"
                    value={addTripEndPlace}
                    onChange={(e) => setAddTripEndPlace(e.target.value)}
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Trip Date
                  </label>
                  <input
                    type="date"
                    value={addTripDate}
                    onChange={(e) => setAddTripDate(e.target.value)}
                    className="w-full h-11 px-2 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={addTripStartTime}
                    onChange={(e) => setAddTripStartTime(e.target.value)}
                    className="w-full h-11 px-2 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={addTripEndTime}
                    onChange={(e) => setAddTripEndTime(e.target.value)}
                    className="w-full h-11 px-2 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Start KM
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 15000"
                    value={addTripStartKm}
                    onChange={(e) => setAddTripStartKm(e.target.value)}
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
                    placeholder="e.g. 15120"
                    value={addTripEndKm}
                    onChange={(e) => setAddTripEndKm(e.target.value)}
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Notes
                </label>
                <input
                  type="text"
                  value={addTripNotes}
                  onChange={(e) => setAddTripNotes(e.target.value)}
                  placeholder="Optional driver or trip notes"
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm text-[#121316] focus:outline-none focus:border-gray-400"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddTripOpen(false)}
                  className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAddTrip}
                  className="flex-1 h-11 rounded-xl bg-[#121316] text-white font-bold text-xs hover:bg-black cursor-pointer"
                >
                  {isSubmittingAddTrip ? 'Saving...' : 'Add Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Driver Credentials Modal */}
      {isEditDriverOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-[32px] p-6 max-w-sm w-full space-y-4 shadow-2xl border border-gray-100 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#121316]">
                Edit Driver Credentials
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
                  Driver Name
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
                <label className="text-xs font-bold text-gray-700 uppercase flex items-center justify-between">
                  <span>Mobile Number (Login ID)</span>
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                  required
                />
                <p className="text-[11px] text-gray-400">Driver logs in with this mobile number.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase flex items-center justify-between">
                  <span>Login Password / PIN (4 digits)</span>
                  <span className="text-[10px] text-gray-400 font-normal">Change/Reset</span>
                </label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="1234"
                  value={editPin}
                  onChange={(e) => setEditPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold font-mono text-[#121316] focus:outline-none focus:border-gray-400"
                  required
                />
                <p className="text-[11px] text-gray-400">Driver uses this 4-digit PIN as their password.</p>
              </div>

              <div className="space-y-1 pt-1">
                <label className="text-xs font-bold text-gray-700 uppercase block">
                  Driver Status
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                    <input
                      type="radio"
                      checked={editIsActive}
                      onChange={() => setEditIsActive(true)}
                    />
                    <span>Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-500">
                    <input
                      type="radio"
                      checked={!editIsActive}
                      onChange={() => setEditIsActive(false)}
                    />
                    <span>Inactive</span>
                  </label>
                </div>
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
                  {isSubmittingDriver ? 'Saving...' : 'Save Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
