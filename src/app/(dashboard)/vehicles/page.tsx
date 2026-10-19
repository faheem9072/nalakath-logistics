'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { StatusBadge } from '@/components/ui/Badge';
import { dataRepo } from '@/lib/data-service';
import { Vehicle, VehicleType, VehicleStatus, ClientCompany } from '@/types/database';
import { VehicleDetailView } from '@/components/dashboard/VehicleDetailView';
import {
  Plus,
  Search,
  Truck,
  Pencil,
  BarChart3,
  MapPin,
  Users,
  Eye,
  Building2,
  X,
} from 'lucide-react';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState<'all' | 'Delhivery' | 'Shadowfax'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Vehicle Detail Inspection Modal
  const [inspectVehicleReg, setInspectVehicleReg] = useState<string | null>(null);

  // Add Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [regNo, setRegNo] = useState('');
  const [makeModel, setMakeModel] = useState('');
  const [company, setCompany] = useState<ClientCompany>('Delhivery');
  const [routeLocation, setRouteLocation] = useState('');
  const [vType, setVType] = useState<VehicleType>('truck');
  const [capacity, setCapacity] = useState('2');
  const [odometer, setOdometer] = useState('0');
  const [notes, setNotes] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editRegNo, setEditRegNo] = useState('');
  const [editMakeModel, setEditMakeModel] = useState('');
  const [editCompany, setEditCompany] = useState<ClientCompany>('Delhivery');
  const [editRouteLocation, setEditRouteLocation] = useState('');
  const [editVType, setEditVType] = useState<VehicleType>('truck');
  const [editCapacity, setEditCapacity] = useState('2');
  const [editOdometer, setEditOdometer] = useState('0');
  const [editStatus, setEditStatus] = useState<VehicleStatus>('active');
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const loadVehicles = async () => {
    setIsLoading(true);
    try {
      const list = await dataRepo.getVehicles();
      setVehicles(list);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const handleOpenEdit = (v: Vehicle) => {
    setEditingVehicle(v);
    setEditRegNo(v.registration_number);
    setEditMakeModel(v.make_model);
    setEditCompany((v.company as ClientCompany) || 'Delhivery');
    setEditRouteLocation(v.route_location || '');
    setEditVType(v.vehicle_type);
    setEditCapacity(v.capacity.toString());
    setEditOdometer(v.current_odometer.toString());
    setEditStatus(v.status);
    setEditNotes(v.notes || '');
    setEditError(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;
    setEditError(null);
    setIsEditSubmitting(true);
    try {
      await dataRepo.updateVehicle(editingVehicle.id, {
        registration_number: editRegNo.trim().toUpperCase(),
        make_model: editMakeModel.trim(),
        company: editCompany,
        route_location: editRouteLocation.trim() || undefined,
        vehicle_type: editVType,
        capacity: parseInt(editCapacity) || 2,
        current_odometer: parseFloat(editOdometer) || 0,
        status: editStatus,
        notes: editNotes.trim() || null,
      });
      setEditingVehicle(null);
      loadVehicles();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Failed to update vehicle');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSubmitting(true);
    try {
      await dataRepo.createVehicle({
        registration_number: regNo.trim().toUpperCase(),
        make_model: makeModel.trim(),
        company,
        route_location: routeLocation.trim() || 'Ad-hoc',
        vehicle_type: vType,
        capacity: parseInt(capacity) || 2,
        current_odometer: parseFloat(odometer) || 0,
        status: 'active',
        notes: notes.trim() || null,
      });
      setIsAddOpen(false);
      setRegNo('');
      setMakeModel('');
      setRouteLocation('');
      loadVehicles();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to create vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (vehicle: Vehicle) => {
    const nextStatus: VehicleStatus =
      vehicle.status === 'active'
        ? 'maintenance'
        : vehicle.status === 'maintenance'
        ? 'inactive'
        : 'active';

    try {
      await dataRepo.updateVehicle(vehicle.id, { status: nextStatus });
      loadVehicles();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = vehicles.filter((v) => {
    if (statusFilter !== 'all' && v.status !== statusFilter) return false;
    if (companyFilter !== 'all' && v.company !== companyFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase().replace(/[\s-]/g, '');
      const reg = v.registration_number.toLowerCase().replace(/[\s-]/g, '');
      const model = v.make_model.toLowerCase();
      const route = (v.route_location || '').toLowerCase();
      const drivers = (v.default_driver_names || []).join(' ').toLowerCase();
      const companyStr = (v.company || '').toLowerCase();
      return (
        reg.includes(q) ||
        model.includes(search.toLowerCase()) ||
        route.includes(search.toLowerCase()) ||
        drivers.includes(search.toLowerCase()) ||
        companyStr.includes(search.toLowerCase())
      );
    }
    return true;
  });

  const countDelhivery = vehicles.filter((v) => v.company === 'Delhivery').length;
  const countShadowfax = vehicles.filter((v) => v.company === 'Shadowfax').length;

  return (
    <PageContainer
      title="Fleet Vehicles"
      subtitle="Complete vehicle inventory grouped by Client Company (Delhivery & Shadowfax), route assignments, and driver history."
      action={
        <Button
          variant="primary"
          onClick={() => setIsAddOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Vehicle
        </Button>
      }
    >
      {/* Search & Company Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Company Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2 shrink-0">
              Company:
            </span>
            <button
              onClick={() => setCompanyFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                companyFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({vehicles.length})
            </button>
            <button
              onClick={() => setCompanyFilter('Delhivery')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                companyFilter === 'Delhivery'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>Delhivery ({countDelhivery})</span>
            </button>
            <button
              onClick={() => setCompanyFilter('Shadowfax')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                companyFilter === 'Shadowfax'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>Shadowfax ({countShadowfax})</span>
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
            >
              <option value="all">All Statuses ({vehicles.length})</option>
              <option value="active">Active Only</option>
              <option value="maintenance">Maintenance Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Search Input with Partial Match Hint */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search vehicle number (e.g. '3057', '2266', '3443', '5682'), driver, or route..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-20 py-2 text-xs sm:text-sm font-mono font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-slate-400 animate-pulse">
          Loading fleet vehicles...
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="p-12 text-center text-slate-500 text-sm">
            <Truck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            No vehicles match your search or company filter.
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                <tr>
                  <th className="px-5 py-3.5">Registration</th>
                  <th className="px-5 py-3.5">Company</th>
                  <th className="px-5 py-3.5">Route / Location</th>
                  <th className="px-5 py-3.5">Default Driver(s)</th>
                  <th className="px-5 py-3.5">Make & Model</th>
                  <th className="px-5 py-3.5">Current Odometer</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map((v) => {
                  const isDelhivery = v.company === 'Delhivery';
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setInspectVehicleReg(v.registration_number)}
                            className="hover:text-blue-600 hover:underline text-left cursor-pointer"
                            title="Click to view full detail & expenses"
                          >
                            {v.registration_number}
                          </button>
                          {v.is_adhoc && (
                            <span className="text-[10px] font-sans font-bold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded">
                              Ad-hoc
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            isDelhivery
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isDelhivery ? 'bg-rose-500' : 'bg-amber-500'
                            }`}
                          />
                          <span>{v.company || 'Delhivery'}</span>
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs font-medium text-slate-800">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{v.route_location || 'Ad-hoc'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs">
                        <div className="font-semibold text-slate-900">
                          {(v.default_driver_names || []).join(', ') || 'Unassigned'}
                        </div>
                        {v.is_adhoc && (
                          <span className="text-[10px] text-blue-600 block">
                            Rotating drivers
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-xs text-slate-800">{v.make_model}</div>
                        <span className="text-[11px] text-slate-400 capitalize">
                          {v.vehicle_type} • {v.capacity} Seats/Ton
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs font-bold text-slate-900">
                        {v.current_odometer.toLocaleString()} km
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={v.status} size="sm" />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setInspectVehicleReg(v.registration_number)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                            title="Inspect month drivers & expenses"
                          >
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs py-1 px-2"
                            onClick={() => handleOpenEdit(v)}
                            title="Edit vehicle"
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant={v.status === 'maintenance' ? 'success' : 'outline'}
                            className="text-xs py-1 px-2"
                            onClick={() => handleToggleStatus(v)}
                          >
                            {v.status === 'active'
                              ? 'Maint.'
                              : v.status === 'maintenance'
                              ? 'Activate'
                              : 'Restore'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspect Vehicle Detail Modal */}
      {inspectVehicleReg && (
        <Modal
          isOpen={!!inspectVehicleReg}
          onClose={() => setInspectVehicleReg(null)}
          title={`Vehicle Detail — ${inspectVehicleReg}`}
          maxWidth="2xl"
        >
          <div className="py-2">
            <VehicleDetailView
              initialVehicleQuery={inspectVehicleReg}
              showBackBtn={false}
            />
          </div>
        </Modal>
      )}

      {/* Add Vehicle Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Fleet Vehicle"
        description="Register a new commercial vehicle into the operations database with client company association."
        maxWidth="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {modalError && <Alert variant="danger">{modalError}</Alert>}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Registration Number"
              placeholder="KL-84-B-3057"
              value={regNo}
              onChange={(e) => setRegNo(e.target.value.toUpperCase())}
              required
              autoFocus
            />
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Client Company
              </label>
              <Select
                value={company}
                onChange={(e) => setCompany(e.target.value as ClientCompany)}
              >
                <option value="Delhivery">Delhivery</option>
                <option value="Shadowfax">Shadowfax</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Make & Model"
              placeholder="Tata Ace Gold / Bolero"
              value={makeModel}
              onChange={(e) => setMakeModel(e.target.value)}
              required
            />
            <Input
              label="Route / Location"
              placeholder="e.g. Ad-hoc, Mukkam / Calicut"
              value={routeLocation}
              onChange={(e) => setRouteLocation(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Vehicle Type
              </label>
              <Select
                value={vType}
                onChange={(e) => setVType(e.target.value as VehicleType)}
              >
                <option value="truck">Truck</option>
                <option value="van">Van</option>
                <option value="bus">Bus</option>
                <option value="mini_bus">Mini Bus</option>
                <option value="car">Car</option>
              </Select>
            </div>

            <Input
              label="Capacity"
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              required
            />

            <Input
              label="Initial Odometer (km)"
              type="number"
              step="0.1"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              required
            />
          </div>

          <Input
            label="Operational Notes"
            placeholder="E.g., Ad-hoc rotating vehicle..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Register Vehicle
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Vehicle Modal */}
      {editingVehicle && (
        <Modal
          isOpen={!!editingVehicle}
          onClose={() => setEditingVehicle(null)}
          title="Edit Vehicle Specifications"
          maxWidth="md"
        >
          <form onSubmit={handleUpdate} className="space-y-4">
            {editError && <Alert variant="danger">{editError}</Alert>}

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Registration Number"
                value={editRegNo}
                onChange={(e) => setEditRegNo(e.target.value.toUpperCase())}
                required
              />
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Client Company
                </label>
                <Select
                  value={editCompany}
                  onChange={(e) => setEditCompany(e.target.value as ClientCompany)}
                >
                  <option value="Delhivery">Delhivery</option>
                  <option value="Shadowfax">Shadowfax</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Make & Model"
                value={editMakeModel}
                onChange={(e) => setEditMakeModel(e.target.value)}
                required
              />
              <Input
                label="Route / Location"
                value={editRouteLocation}
                onChange={(e) => setEditRouteLocation(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <Select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as VehicleStatus)}
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </div>

              <Input
                label="Capacity"
                type="number"
                value={editCapacity}
                onChange={(e) => setEditCapacity(e.target.value)}
                required
              />

              <Input
                label="Odometer (km)"
                type="number"
                step="0.1"
                value={editOdometer}
                onChange={(e) => setEditOdometer(e.target.value)}
                required
              />
            </div>

            <Input
              label="Operational Notes"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
            />

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingVehicle(null)}
                disabled={isEditSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isEditSubmitting}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </PageContainer>
  );
}
