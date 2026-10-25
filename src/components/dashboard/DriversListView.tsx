'use client';

import React, { useState, useEffect } from 'react';
import { dataRepo } from '@/lib/data-service';
import { Driver, Vehicle } from '@/types/database';
import { MoveIQSearchBar } from '@/components/moveiq/MoveIQSearchBar';
import { MoveIQFilterChips } from '@/components/moveiq/MoveIQFilterChips';
import { MoveIQLimeHeroCard } from '@/components/moveiq/MoveIQLimeHeroCard';
import { DriverDetailView } from '@/components/dashboard/DriverDetailView';
import {
  Users,
  Phone,
  Truck,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  X,
  AlertCircle,
  Radio,
  Zap,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';

interface DriverWithStatus extends Driver {
  activeTripInfo?: {
    vehicleRegistration: string;
    vehicleModel: string;
    startOdo: number;
    startTime: string;
  } | null;
}

export function DriversListView() {
  const [drivers, setDrivers] = useState<DriverWithStatus[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'on_trip' | 'idle'>('all');
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Add Driver Modal
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addPin, setAddPin] = useState('1234');
  const [addError, setAddError] = useState<string | null>(null);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Edit Driver Modal
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPin, setEditPin] = useState('1234');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const showSavedNotice = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 3500);
  };

  const loadData = async () => {
    try {
      const [allDrivers, allVehicles] = await Promise.all([
        dataRepo.getDrivers(),
        dataRepo.getVehicles(),
      ]);

      setVehicles(allVehicles);

      const enhanced: DriverWithStatus[] = allDrivers.map((d) => {
        const live = dataRepo.getActiveTripForDriver(d.id);
        if (live) {
          return {
            ...d,
            activeTripInfo: {
              vehicleRegistration: live.vehicle.registration_number,
              vehicleModel: live.vehicle.make_model,
              startOdo: live.trip.start_odometer || live.vehicle.current_odometer,
              startTime: live.trip.start_time || 'Just now',
            },
          };
        }
        return {
          ...d,
          activeTripInfo: null,
        };
      });

      setDrivers(enhanced);
    } catch (err) {
      console.error('Failed to load drivers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = dataRepo.subscribe(loadData);
    const interval = setInterval(loadData, 3000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (!addName.trim() || !addPhone.trim()) {
      setAddError('Name and phone number are required');
      return;
    }

    setIsSubmittingAdd(true);
    try {
      await dataRepo.createDriver({
        full_name: addName.trim(),
        phone: addPhone.trim(),
        pin: addPin.trim() || '1234',
      });
      setIsAddDriverOpen(false);
      setAddName('');
      setAddPhone('');
      setAddPin('1234');
      showSavedNotice('New driver registered successfully!');
      await loadData();
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Failed to add driver');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleOpenEdit = (d: Driver, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDriver(d);
    setEditName(d.full_name);
    setEditPhone(d.phone);
    setEditPin(d.pin || '1234');
    setEditIsActive(d.is_active !== false);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver) return;
    setEditError(null);
    setIsSubmittingEdit(true);
    try {
      await dataRepo.updateDriver(editingDriver.id, {
        full_name: editName.trim(),
        phone: editPhone.trim(),
        pin: editPin.trim() || '1234',
        is_active: editIsActive,
      });
      setEditingDriver(null);
      showSavedNotice('Driver details saved!');
      await loadData();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Failed to edit driver');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleArchiveDriver = async (driverId: string, driverName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Archive driver "${driverName}"? Driver will be marked inactive.`)) {
      await dataRepo.archiveDriver(driverId);
      showSavedNotice('Driver marked inactive. Past trips preserved.');
      await loadData();
    }
  };

  const handleAllowSecondTrip = async (driverId: string, driverName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await dataRepo.allowDriverNextTripOverride(driverId);
      showSavedNotice(`2nd Trip enabled for ${driverName}! They can start their next trip immediately.`);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to enable 2nd trip');
    }
  };

  // If a driver is selected, render their Detail View!
  if (selectedDriverId) {
    return (
      <DriverDetailView
        driverId={selectedDriverId}
        onBack={() => setSelectedDriverId(null)}
        onDriverUpdated={loadData}
      />
    );
  }

  // Filter drivers
  const activeCount = drivers.filter((d) => !!d.activeTripInfo).length;
  const idleCount = drivers.length - activeCount;

  const filtered = drivers.filter((d) => {
    if (statusFilter === 'on_trip' && !d.activeTripInfo) return false;
    if (statusFilter === 'idle' && d.activeTripInfo) return false;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const nameMatch = d.full_name.toLowerCase().includes(q);
      const phoneMatch = d.phone.includes(q);
      const vehicleMatch = d.activeTripInfo?.vehicleRegistration.toLowerCase().includes(q);
      return nameMatch || phoneMatch || vehicleMatch;
    }
    return true;
  });

  return (
    <div className="space-y-4 pb-20">
      {/* Search Bar with '+' Add Driver Button */}
      <MoveIQSearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search driver by name or phone..."
        onPlusClick={() => setIsAddDriverOpen(true)}
      />

      {savedNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* Hero Lime Card (MoveIQ: "Vehicle on the road" style) */}
      <MoveIQLimeHeroCard
        title="Fleet on the road"
        subtitle="Live tracking drivers and vehicles currently on trips"
        badge="Live Operations"
        actionText="View all drivers"
        activeCount={activeCount}
        totalCount={drivers.length}
        onAction={() => setStatusFilter(statusFilter === 'on_trip' ? 'all' : 'on_trip')}
      />

      {/* Filter Chips like MoveIQ: "Assigned 53 / Completed 56" */}
      <MoveIQFilterChips
        options={[
          { id: 'all', label: 'All Drivers', count: drivers.length },
          { id: 'on_trip', label: 'On Trip', count: activeCount },
          { id: 'idle', label: 'Idle', count: idleCount },
        ]}
        activeId={statusFilter}
        onSelect={(id) => setStatusFilter(id as typeof statusFilter)}
      />

      {/* Drivers List */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-[28px] p-8 text-center text-gray-400 border border-gray-100 shadow-2xs">
            <Users className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-semibold text-gray-600">No drivers match your search.</p>
            <p className="text-xs text-gray-400 mt-1">Try another keyword or filter chip.</p>
          </div>
        ) : (
          filtered.map((d) => {
            const isOnTrip = !!d.activeTripInfo;

            return (
              <div
                key={d.id}
                onClick={() => setSelectedDriverId(d.id)}
                className="bg-white rounded-[26px] p-4 sm:p-5 border border-gray-100 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3 group active:scale-[0.99]"
              >
                {/* Left: Avatar + Driver Info */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-2xl bg-[#121316] text-white flex items-center justify-center font-bold text-base shrink-0 shadow-2xs">
                    {d.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-[#121316] text-sm sm:text-base tracking-tight truncate">
                        {d.full_name}
                      </h3>
                      {/* Status Chip (On trip / 2nd Trip Allowed / Resting / Idle) */}
                      {isOnTrip ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D4F65B] text-black shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                          <span>On trip</span>
                        </span>
                      ) : (d as unknown as { allow_next_trip_override?: number }).allow_next_trip_override === 1 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>2nd Trip Allowed</span>
                        </span>
                      ) : (d as unknown as { is_in_cooldown?: boolean }).is_in_cooldown ? (
                        <button
                          type="button"
                          onClick={(e) => handleAllowSecondTrip(d.id, d.full_name, e)}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white active:scale-95 transition-all shrink-0 cursor-pointer shadow-2xs"
                          title="Click to allow immediate 2nd trip without waiting"
                        >
                          <Zap className="w-3 h-3 fill-white" />
                          <span>Allow 2nd Trip</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500 shrink-0">
                          Idle
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <p className="text-xs text-gray-500 font-mono flex items-center gap-1 shrink-0">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span>{d.phone}</span>
                      </p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-gray-700 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md shrink-0">
                        <KeyRound className="w-2.5 h-2.5 text-gray-400" />
                        <span>PIN: {d.pin || '1234'}</span>
                      </span>
                    </div>

                    {/* Vehicle currently on */}
                    <div className="flex items-center gap-1 text-xs mt-1">
                      <Truck className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      {isOnTrip ? (
                        <span className="font-bold text-[#121316] truncate">
                          {d.activeTripInfo?.vehicleRegistration}{' '}
                          <span className="text-gray-400 font-normal">
                            ({d.activeTripInfo?.vehicleModel})
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-400 font-normal">
                          No vehicle active
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions & Arrow */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleOpenEdit(d, e)}
                    className="p-2 rounded-xl text-gray-400 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
                    title="Edit driver phone and login PIN"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleArchiveDriver(d.id, d.full_name, e)}
                    className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-gray-100 transition-colors cursor-pointer"
                    title="Archive driver"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-black group-hover:translate-x-0.5 transition-all ml-1" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Driver Modal */}
      {isAddDriverOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-[32px] p-6 max-w-sm w-full space-y-4 shadow-2xl border border-gray-100 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#121316]">
                Add New Driver
              </h3>
              <button
                type="button"
                onClick={() => setIsAddDriverOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Register driver mobile number so they can log in to the driver PWA.
            </p>

            {addError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddDriver} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Driver Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Shameem"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase flex items-center justify-between">
                  <span>Mobile Number (Login ID)</span>
                  <span className="text-[10px] text-gray-400 font-normal">Required</span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9400123456"
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                  required
                />
                <p className="text-[11px] text-gray-400">Driver logs in using this phone number.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase flex items-center justify-between">
                  <span>Login Password / PIN (4 digits)</span>
                  <span className="text-[10px] text-gray-400 font-normal">Default: 1234</span>
                </label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="1234"
                  value={addPin}
                  onChange={(e) => setAddPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold font-mono text-[#121316] focus:outline-none focus:border-gray-400"
                  required
                />
                <p className="text-[11px] text-gray-400">Driver uses this 4-digit PIN as their password.</p>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddDriverOpen(false)}
                  className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="flex-1 h-11 rounded-xl bg-[#121316] text-white font-bold text-xs hover:bg-black cursor-pointer"
                >
                  {isSubmittingAdd ? 'Registering...' : 'Add Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Driver Modal */}
      {editingDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-[32px] p-6 max-w-sm w-full space-y-4 shadow-2xl border border-gray-100 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#121316]">
                Edit Driver Details
              </h3>
              <button
                type="button"
                onClick={() => setEditingDriver(null)}
                className="p-1 rounded-full text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3">
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
                <p className="text-[11px] text-gray-400">Driver logs in using this phone number.</p>
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
                <p className="text-[11px] text-gray-400">Driver uses this 4-digit PIN as their login password.</p>
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
                  onClick={() => setEditingDriver(null)}
                  className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="flex-1 h-11 rounded-xl bg-[#121316] text-white font-bold text-xs hover:bg-black cursor-pointer"
                >
                  {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
