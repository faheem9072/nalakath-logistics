'use client';

import React, { useState, useEffect, useRef } from 'react';
import { dataRepo } from '@/lib/data-service';
import { db, isFirebaseConfigured } from '@/lib/firebase/config';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { Vehicle, ClientCompany, VehicleType } from '@/types/database';
import { MoveIQSearchBar } from '@/components/moveiq/MoveIQSearchBar';
import { MoveIQFilterChips } from '@/components/moveiq/MoveIQFilterChips';
import { MoveIQLimeHeroCard } from '@/components/moveiq/MoveIQLimeHeroCard';
import { VehicleDetailView } from '@/components/dashboard/VehicleDetailView';
import {
  Truck,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  X,
  AlertCircle,
  Building2,
  Radio,
  CheckCircle2,
} from 'lucide-react';

interface VehicleWithStatus extends Vehicle {
  activeTripInfo?: {
    driverName: string;
    driverPhone: string;
    startOdo: number;
    startTime: string;
  } | null;
  company_name?: string;
  syncStatus?: 'saving' | 'saved';
}

export function VehiclesListView() {
  const [vehicles, setVehicles] = useState<VehicleWithStatus[]>([]);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<'all' | 'Delhivery' | 'Shadowfax'>('all');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedVehicleReg, setSelectedVehicleReg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Keep a ref of raw vehicles for active trip updates
  const rawVehiclesRef = useRef<VehicleWithStatus[]>([]);

  // Add Vehicle Modal
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [regNo, setRegNo] = useState('');
  const [makeModel, setMakeModel] = useState('');
  const [company, setCompany] = useState<ClientCompany>('Delhivery');
  const [routeLocation, setRouteLocation] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('truck');
  const [odometer, setOdometer] = useState('0');
  const [addError, setAddError] = useState<string | null>(null);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Edit Vehicle Modal
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editRegNo, setEditRegNo] = useState('');
  const [editMakeModel, setEditMakeModel] = useState('');
  const [editCompany, setEditCompany] = useState<ClientCompany>('Delhivery');
  const [editRouteLocation, setEditRouteLocation] = useState('');
  const [editType, setEditType] = useState<VehicleType>('truck');
  const [editInitialKm, setEditInitialKm] = useState('');
  const [editOdo, setEditOdo] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const showSavedNotice = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 3500);
  };

  const enhanceVehicles = (list: VehicleWithStatus[]): VehicleWithStatus[] => {
    return list.map((v) => {
      const live = dataRepo.getActiveTripForVehicle(v.id);
      if (live) {
        return {
          ...v,
          activeTripInfo: {
            driverName: live.driver.full_name,
            driverPhone: live.driver.phone,
            startOdo: live.trip.start_odometer || v.current_odometer,
            startTime: live.trip.start_time || 'Just now',
          },
        };
      }
      return {
        ...v,
        activeTripInfo: null,
      };
    });
  };

  const loadVehiclesData = async () => {
    try {
      const allVehicles = await dataRepo.getVehicles();
      rawVehiclesRef.current = allVehicles as VehicleWithStatus[];
      setVehicles(enhanceVehicles(allVehicles as VehicleWithStatus[]));
    } catch (err) {
      console.error('Failed to load vehicles from repo:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVehiclesData();
    const unsubRepo = dataRepo.subscribe(() => {
      loadVehiclesData();
    });

    return () => {
      unsubRepo();
    };
  }, []);

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingAdd) return;
    setAddError(null);
    if (!regNo.trim() || !makeModel.trim()) {
      setAddError('Registration number and vehicle model are required');
      return;
    }

    setIsSubmittingAdd(true);

    const cleanReg = regNo.trim().toUpperCase();
    const odoVal = parseFloat(odometer) || 0;
    const tempId = `veh-${Date.now()}`;

    const optimisticVeh: VehicleWithStatus = {
      id: tempId,
      registration_number: cleanReg,
      make_model: makeModel.trim(),
      company,
      company_name: company,
      route_location: routeLocation.trim() || '',
      vehicle_type: vehicleType,
      capacity: 2,
      initial_km: odoVal,
      current_odometer: odoVal,
      status: 'active',
      is_active: true,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      syncStatus: 'saving',
    };

    // 1. Instantly display on screen (0ms)
    rawVehiclesRef.current = [optimisticVeh, ...rawVehiclesRef.current];
    setVehicles(enhanceVehicles(rawVehiclesRef.current));
    setIsAddVehicleOpen(false);
    setRegNo('');
    setMakeModel('');
    setRouteLocation('');
    setOdometer('0');
    setIsSubmittingAdd(false);

    try {
      const realVeh = await dataRepo.createVehicle({
        registration_number: cleanReg,
        make_model: makeModel.trim(),
        company,
        route_location: routeLocation.trim() || undefined,
        vehicle_type: vehicleType,
        capacity: 2,
        initial_km: odoVal,
        current_odometer: odoVal,
        status: 'active',
        notes: null,
      });

      rawVehiclesRef.current = rawVehiclesRef.current.map((v) =>
        v.id === tempId ? { ...v, ...realVeh, syncStatus: 'saved' } : v
      );
      setVehicles(enhanceVehicles(rawVehiclesRef.current));
      showSavedNotice('New vehicle added successfully!');

      setTimeout(() => {
        rawVehiclesRef.current = rawVehiclesRef.current.map((v) =>
          v.id === realVeh.id ? { ...v, syncStatus: undefined } : v
        );
        setVehicles(enhanceVehicles(rawVehiclesRef.current));
      }, 2500);
    } catch (err: unknown) {
      console.error('Failed to add vehicle:', err);
      // Rollback
      rawVehiclesRef.current = rawVehiclesRef.current.filter((v) => v.id !== tempId);
      setVehicles(enhanceVehicles(rawVehiclesRef.current));
      const msg = err instanceof Error ? err.message : 'Failed to add vehicle';
      showSavedNotice(msg);
      alert(msg);
    }
  };

  const handleOpenEdit = (v: Vehicle, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingVehicle(v);
    setEditRegNo(v.registration_number);
    setEditMakeModel(v.make_model);
    setEditCompany((v.company as ClientCompany) || 'Delhivery');
    setEditRouteLocation(v.route_location || '');
    setEditType(v.vehicle_type);
    setEditInitialKm(String(v.initial_km ?? v.current_odometer));
    setEditOdo(String(v.current_odometer));
    setEditIsActive(v.is_active !== false && v.status !== 'inactive');
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle || isSubmittingEdit) return;
    setEditError(null);
    setIsSubmittingEdit(true);

    const docId = editingVehicle.id;
    const cleanReg = editRegNo.trim().toUpperCase();
    const cleanModel = editMakeModel.trim();
    const cleanLocation = editRouteLocation.trim();
    const initialKmVal = parseFloat(editInitialKm) || 0;
    const currentOdoVal = parseFloat(editOdo) || editingVehicle.current_odometer;

    const previousVeh = rawVehiclesRef.current.find((v) => v.id === docId);

    // 1. Instantly display changes on screen (0ms)
    rawVehiclesRef.current = rawVehiclesRef.current.map((v) =>
      v.id === docId
        ? {
            ...v,
            registration_number: cleanReg,
            make_model: cleanModel,
            company: editCompany,
            company_name: editCompany,
            route_location: cleanLocation,
            vehicle_type: editType,
            initial_km: initialKmVal,
            current_odometer: currentOdoVal,
            is_active: editIsActive,
            status: editIsActive ? 'active' : 'inactive',
            syncStatus: 'saving',
          }
        : v
    );
    setVehicles(enhanceVehicles(rawVehiclesRef.current));
    setEditingVehicle(null);
    setIsSubmittingEdit(false);

    try {
      await dataRepo.updateVehicle(docId, {
        registration_number: cleanReg,
        make_model: cleanModel,
        company: editCompany,
        route_location: cleanLocation || undefined,
        vehicle_type: editType,
        initial_km: initialKmVal,
        current_odometer: currentOdoVal,
        is_active: editIsActive,
      });

      rawVehiclesRef.current = rawVehiclesRef.current.map((v) =>
        v.id === docId ? { ...v, syncStatus: 'saved' } : v
      );
      setVehicles(enhanceVehicles(rawVehiclesRef.current));
      showSavedNotice('Vehicle details saved!');

      setTimeout(() => {
        rawVehiclesRef.current = rawVehiclesRef.current.map((v) =>
          v.id === docId ? { ...v, syncStatus: undefined } : v
        );
        setVehicles(enhanceVehicles(rawVehiclesRef.current));
      }, 2500);
    } catch (err: unknown) {
      console.error('Failed to save vehicle:', err);
      // Rollback
      if (previousVeh) {
        rawVehiclesRef.current = rawVehiclesRef.current.map((v) =>
          v.id === docId ? { ...previousVeh, syncStatus: undefined } : v
        );
        setVehicles(enhanceVehicles(rawVehiclesRef.current));
      }
      const msg = err instanceof Error ? err.message : 'Failed to update vehicle';
      showSavedNotice(msg);
      alert(msg);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string, reg: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const counts = await dataRepo.getLinkedCounts('vehicle', vehicleId).catch(() => ({ tripsCount: 0, expensesCount: 0 }));
      let linkedParts: string[] = [];
      if (counts.tripsCount > 0) linkedParts.push(`${counts.tripsCount} trips`);
      if (counts.expensesCount > 0) linkedParts.push(`${counts.expensesCount} expenses`);
      let linkedText = linkedParts.length > 0 ? ` This will also delete ${linkedParts.join(' and ')}.` : '';
      const confirmMsg = `Delete vehicle ${reg}?${linkedText} This cannot be undone.`;

      if (!window.confirm(confirmMsg)) return;

      const res = await dataRepo.deleteVehicle(vehicleId);
      if (res && res.deletedRows === 0) {
        alert(`Error: Vehicle "${reg}" was not found or already deleted.`);
        return;
      }

      setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
      showSavedNotice(`Vehicle "${reg}" deleted successfully!`);
      await loadVehiclesData();
    } catch (err) {
      console.error('Failed to delete vehicle:', err);
      alert('Failed to delete vehicle: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // If vehicle is tapped, render the VehicleDetailView
  if (selectedVehicleId || selectedVehicleReg) {
    return (
      <VehicleDetailView
        vehicleId={selectedVehicleId || undefined}
        vehicleQuery={selectedVehicleReg || undefined}
        onBack={() => {
          setSelectedVehicleId(null);
          setSelectedVehicleReg(null);
        }}
        onVehicleUpdated={loadVehiclesData}
      />
    );
  }

  // Filter vehicles
  const delhiveryCount = vehicles.filter((v) => (v.company || '').toLowerCase() === 'delhivery').length;
  const shadowfaxCount = vehicles.filter((v) => (v.company || '').toLowerCase() === 'shadowfax').length;
  const onRoadCount = vehicles.filter((v) => !!v.activeTripInfo).length;

  const filtered = vehicles.filter((v) => {
    if (companyFilter !== 'all' && (v.company || '').toLowerCase() !== companyFilter.toLowerCase()) {
      return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const regMatch = v.registration_number.toLowerCase().includes(q);
      const modelMatch = v.make_model.toLowerCase().includes(q);
      const routeMatch = (v.route_location || '').toLowerCase().includes(q);
      const driverMatch = v.activeTripInfo?.driverName.toLowerCase().includes(q);
      return regMatch || modelMatch || routeMatch || driverMatch;
    }
    return true;
  });

  return (
    <div className="space-y-4 pb-20">
      {/* Search Bar with '+' Add Vehicle Button */}
      <MoveIQSearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search vehicle number or route..."
        onPlusClick={() => setIsAddVehicleOpen(true)}
      />

      {savedNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* Hero Lime Card: "Vehicle on the road" (Exact MoveIQ look) */}
      <MoveIQLimeHeroCard
        title="Vehicle on the road"
        subtitle="Expedite cargo fleet with real-time tracking"
        badge="Live Operations"
        actionText="Track active vehicles"
        activeCount={onRoadCount}
        totalCount={vehicles.length}
        onAction={() => {
          // Quick filter or toggle
        }}
      />

      {/* Filter Chips: All, Delhivery, Shadowfax (Like MoveIQ "Assigned 53 / Completed 56") */}
      <MoveIQFilterChips
        options={[
          { id: 'all', label: 'All Vehicles', count: vehicles.length },
          { id: 'Delhivery', label: 'Delhivery', count: delhiveryCount },
          { id: 'Shadowfax', label: 'Shadowfax', count: shadowfaxCount },
        ]}
        activeId={companyFilter}
        onSelect={(id) => setCompanyFilter(id as typeof companyFilter)}
      />

      {/* Vehicles List */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-[28px] p-8 text-center text-gray-400 border border-gray-100 shadow-2xs">
            <Truck className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-semibold text-gray-600">No vehicles match your search.</p>
            <p className="text-xs text-gray-400 mt-1">Try another registration number or filter chip.</p>
          </div>
        ) : (
          filtered.map((v) => {
            const isOnTrip = !!v.activeTripInfo;

            return (
              <div
                key={v.id}
                onClick={() => {
                  setSelectedVehicleId(v.id);
                  setSelectedVehicleReg(v.registration_number);
                }}
                className="bg-white rounded-[26px] p-4 sm:p-5 border border-gray-100 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3 group active:scale-[0.99]"
              >
                {/* Left: Icon & Vehicle Info */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-[#121316] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Truck className="w-6 h-6 text-white" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-[#121316] text-sm sm:text-base tracking-tight truncate">
                        {v.registration_number}
                      </h3>
                      {v.syncStatus === 'saving' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse shrink-0">
                          Saving...
                        </span>
                      )}
                      {v.syncStatus === 'saved' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          Saved
                        </span>
                      )}
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                        {v.company || 'Delhivery'}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 font-medium truncate mt-0.5">
                      {v.make_model} • {v.vehicle_type}
                    </p>

                    {/* Status Chip (On trip: Driver / Idle / Maintenance) */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {isOnTrip ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D4F65B] text-black">
                          <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                          <span>On trip: {v.activeTripInfo?.driverName}</span>
                        </span>
                      ) : v.status === 'maintenance' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                          Maintenance
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
                          Idle
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 font-mono">
                        {v.current_odometer.toLocaleString()} km
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions & Arrow */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleOpenEdit(v, e)}
                    className="p-2 rounded-xl text-gray-400 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
                    title="Edit vehicle"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteVehicle(v.id, v.registration_number, e)}
                    className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-gray-100 transition-colors cursor-pointer"
                    title="Delete vehicle"
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

      {/* Add Vehicle Modal */}
      {isAddVehicleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-[32px] p-6 max-w-sm w-full space-y-4 shadow-2xl border border-gray-100 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#121316]">
                Add New Vehicle
              </h3>
              <button
                type="button"
                onClick={() => setIsAddVehicleOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddVehicle} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Registration Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. KL 84 B 9999"
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold uppercase text-[#121316] focus:outline-none focus:border-gray-400"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Make & Model
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tata Ace Gold Cargo"
                  value={makeModel}
                  onChange={(e) => setMakeModel(e.target.value)}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Client
                  </label>
                  <select
                    value={company}
                    onChange={(e) => setCompany(e.target.value as ClientCompany)}
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-bold text-[#121316] focus:outline-none focus:border-gray-400"
                  >
                    <option value="Delhivery">Delhivery</option>
                    <option value="Shadowfax">Shadowfax</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Type
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-bold text-[#121316] focus:outline-none focus:border-gray-400"
                  >
                    <option value="truck">Truck</option>
                    <option value="van">Van</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Route / Hub Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Calicut Central Hub"
                  value={routeLocation}
                  onChange={(e) => setRouteLocation(e.target.value)}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm text-[#121316] focus:outline-none focus:border-gray-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Initial Odometer (KM)
                </label>
                <input
                  type="number"
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-mono text-[#121316] focus:outline-none focus:border-gray-400"
                  required
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddVehicleOpen(false)}
                  className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="flex-1 h-11 rounded-xl bg-[#121316] text-white font-bold text-xs hover:bg-black cursor-pointer"
                >
                  {isSubmittingAdd ? 'Saving...' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Vehicle Modal */}
      {editingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-[32px] p-6 max-w-sm w-full space-y-4 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#121316]">
                Edit Vehicle Details
              </h3>
              <button
                type="button"
                onClick={() => setEditingVehicle(null)}
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
                  Registration Number
                </label>
                <input
                  type="text"
                  value={editRegNo}
                  onChange={(e) => setEditRegNo(e.target.value)}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold uppercase text-[#121316] focus:outline-none focus:border-gray-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Make & Model
                </label>
                <input
                  type="text"
                  value={editMakeModel}
                  onChange={(e) => setEditMakeModel(e.target.value)}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Client
                  </label>
                  <select
                    value={editCompany}
                    onChange={(e) => setEditCompany(e.target.value as ClientCompany)}
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-bold text-[#121316] focus:outline-none focus:border-gray-400"
                  >
                    <option value="Delhivery">Delhivery</option>
                    <option value="Shadowfax">Shadowfax</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Type
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as VehicleType)}
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-bold text-[#121316] focus:outline-none focus:border-gray-400"
                  >
                    <option value="truck">Truck</option>
                    <option value="van">Van</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Route / Hub Location
                </label>
                <input
                  type="text"
                  value={editRouteLocation}
                  onChange={(e) => setEditRouteLocation(e.target.value)}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm text-[#121316] focus:outline-none focus:border-gray-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Initial KM
                  </label>
                  <input
                    type="number"
                    value={editInitialKm}
                    onChange={(e) => setEditInitialKm(e.target.value)}
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-mono text-[#121316] focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Odometer (KM)
                  </label>
                  <input
                    type="number"
                    value={editOdo}
                    onChange={(e) => setEditOdo(e.target.value)}
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-mono text-[#121316] focus:outline-none focus:border-gray-400"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Status
                </label>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700">
                    <input
                      type="radio"
                      name="vehicle_status"
                      checked={editIsActive}
                      onChange={() => setEditIsActive(true)}
                      className="accent-[#121316]"
                    />
                    <span>Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700">
                    <input
                      type="radio"
                      name="vehicle_status"
                      checked={!editIsActive}
                      onChange={() => setEditIsActive(false)}
                      className="accent-[#121316]"
                    />
                    <span>Inactive</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingVehicle(null)}
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
