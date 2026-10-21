'use client';

import React, { useState, useEffect } from 'react';
import { dataRepo } from '@/lib/data-service';
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
} from 'lucide-react';

interface VehicleWithStatus extends Vehicle {
  activeTripInfo?: {
    driverName: string;
    driverPhone: string;
    startOdo: number;
    startTime: string;
  } | null;
}

export function VehiclesListView() {
  const [vehicles, setVehicles] = useState<VehicleWithStatus[]>([]);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<'all' | 'Delhivery' | 'Shadowfax'>('all');
  const [selectedVehicleReg, setSelectedVehicleReg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
  const [editOdo, setEditOdo] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const loadVehicles = async () => {
    try {
      const allVehicles = await dataRepo.getVehicles();
      const enhanced: VehicleWithStatus[] = allVehicles.map((v) => {
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

      setVehicles(enhanced);
    } catch (err) {
      console.error('Failed to load vehicles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
    const interval = setInterval(loadVehicles, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (!regNo.trim() || !makeModel.trim()) {
      setAddError('Registration number and vehicle model are required');
      return;
    }

    setIsSubmittingAdd(true);
    try {
      await dataRepo.createVehicle({
        registration_number: regNo.trim().toUpperCase(),
        make_model: makeModel.trim(),
        company,
        route_location: routeLocation.trim() || undefined,
        vehicle_type: vehicleType,
        capacity: 2,
        current_odometer: parseFloat(odometer) || 0,
        status: 'active',
        notes: null,
      });
      setIsAddVehicleOpen(false);
      setRegNo('');
      setMakeModel('');
      setRouteLocation('');
      setOdometer('0');
      await loadVehicles();
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Failed to add vehicle');
    } finally {
      setIsSubmittingAdd(false);
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
    setEditOdo(String(v.current_odometer));
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;
    setEditError(null);
    setIsSubmittingEdit(true);
    try {
      await dataRepo.updateVehicle(editingVehicle.id, {
        registration_number: editRegNo.trim().toUpperCase(),
        make_model: editMakeModel.trim(),
        company: editCompany,
        route_location: editRouteLocation.trim() || undefined,
        vehicle_type: editType,
        current_odometer: parseFloat(editOdo) || editingVehicle.current_odometer,
      });
      setEditingVehicle(null);
      await loadVehicles();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Failed to update vehicle');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleArchiveVehicle = async (vehicleId: string, reg: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Archive vehicle "${reg}"? Vehicle will be marked inactive.`)) {
      await dataRepo.archiveVehicle(vehicleId);
      await loadVehicles();
    }
  };

  // If vehicle is tapped, render the VehicleDetailView
  if (selectedVehicleReg) {
    return (
      <VehicleDetailView
        vehicleQuery={selectedVehicleReg}
        onBack={() => setSelectedVehicleReg(null)}
        onVehicleUpdated={loadVehicles}
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
                onClick={() => setSelectedVehicleReg(v.registration_number)}
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
                    onClick={(e) => handleArchiveVehicle(v.id, v.registration_number, e)}
                    className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-gray-100 transition-colors cursor-pointer"
                    title="Archive vehicle"
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
