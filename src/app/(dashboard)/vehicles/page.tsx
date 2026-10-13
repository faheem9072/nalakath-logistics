'use client';

import React, { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { StatusBadge } from '@/components/ui/Badge';
import { dataRepo } from '@/lib/data-service';
import { Vehicle, VehicleType, VehicleStatus } from '@/types/database';
import { Plus, Search, Truck, Pencil } from 'lucide-react';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Add Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [regNo, setRegNo] = useState('');
  const [makeModel, setMakeModel] = useState('');
  const [vType, setVType] = useState<VehicleType>('bus');
  const [capacity, setCapacity] = useState('32');
  const [odometer, setOdometer] = useState('0');
  const [notes, setNotes] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editRegNo, setEditRegNo] = useState('');
  const [editMakeModel, setEditMakeModel] = useState('');
  const [editVType, setEditVType] = useState<VehicleType>('bus');
  const [editCapacity, setEditCapacity] = useState('32');
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
        vehicle_type: editVType,
        capacity: parseInt(editCapacity) || 20,
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
        vehicle_type: vType,
        capacity: parseInt(capacity) || 20,
        current_odometer: parseFloat(odometer) || 0,
        status: 'active',
        notes: notes.trim() || null,
      });
      setIsAddOpen(false);
      setRegNo('');
      setMakeModel('');
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
    if (
      search &&
      !v.registration_number.toLowerCase().includes(search.toLowerCase()) &&
      !v.make_model.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <PageContainer
      title="Fleet Vehicles"
      subtitle="Complete vehicle inventory, capacity specifications, and maintenance statuses."
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
      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search registration or model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">All Statuses ({vehicles.length})</option>
            <option value="active">Active Only</option>
            <option value="maintenance">Maintenance Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-slate-400 animate-pulse">
          Loading fleet vehicles...
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-slate-500 text-sm">
            <Truck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            No vehicles match your search query.
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                <tr>
                  <th className="px-5 py-3.5">Registration</th>
                  <th className="px-5 py-3.5">Make & Model</th>
                  <th className="px-5 py-3.5">Type & Capacity</th>
                  <th className="px-5 py-3.5">Current Odometer</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-slate-900">
                      {v.registration_number}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-xs text-slate-900">{v.make_model}</div>
                      {v.notes && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{v.notes}</div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <span className="capitalize font-medium text-slate-700">
                        {v.vehicle_type.replace('_', ' ')}
                      </span>
                      <span className="text-slate-400 mx-1">•</span>
                      <span className="text-slate-500">{v.capacity} Seats</span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs font-semibold text-slate-900">
                      {v.current_odometer.toLocaleString()} km
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={v.status} size="sm" />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs py-1"
                          onClick={() => handleOpenEdit(v)}
                          leftIcon={<Pencil className="w-3 h-3" />}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant={v.status === 'maintenance' ? 'success' : 'outline'}
                          className="text-xs py-1"
                          onClick={() => handleToggleStatus(v)}
                        >
                          {v.status === 'active'
                            ? 'Set Maint.'
                            : v.status === 'maintenance'
                            ? 'Activate'
                            : 'Restore'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Vehicle Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Fleet Vehicle"
        description="Register a new commercial vehicle into the operations database."
        maxWidth="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {modalError && <Alert variant="danger">{modalError}</Alert>}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Registration Number"
              placeholder="KL-07-CD-4103"
              value={regNo}
              onChange={(e) => setRegNo(e.target.value.toUpperCase())}
              required
              autoFocus
            />
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Vehicle Type
              </label>
              <Select
                value={vType}
                onChange={(e) => setVType(e.target.value as VehicleType)}
              >
                <option value="bus">Bus</option>
                <option value="mini_bus">Mini Bus</option>
                <option value="van">Van</option>
                <option value="truck">Truck</option>
                <option value="car">Car</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Make & Model"
              placeholder="Tata Starbus 32-Seater"
              value={makeModel}
              onChange={(e) => setMakeModel(e.target.value)}
              required
            />
            <Input
              label="Passenger / Cargo Capacity"
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              required
            />
          </div>

          <Input
            label="Initial Odometer Reading (km)"
            type="number"
            step="0.1"
            value={odometer}
            onChange={(e) => setOdometer(e.target.value)}
            required
          />

          <Input
            label="Operational Notes"
            placeholder="E.g., Allocated to airport branch..."
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
              Save Vehicle
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Vehicle Modal */}
      <Modal
        isOpen={!!editingVehicle}
        onClose={() => setEditingVehicle(null)}
        title="Edit Fleet Vehicle"
        description="Update vehicle specifications, current odometer, status, and operational notes."
        maxWidth="md"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          {editError && <Alert variant="danger">{editError}</Alert>}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Registration Number"
              placeholder="KL-07-CD-4103"
              value={editRegNo}
              onChange={(e) => setEditRegNo(e.target.value.toUpperCase())}
              required
            />
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Vehicle Type
              </label>
              <Select
                value={editVType}
                onChange={(e) => setEditVType(e.target.value as VehicleType)}
              >
                <option value="bus">Bus</option>
                <option value="mini_bus">Mini Bus</option>
                <option value="van">Van</option>
                <option value="truck">Truck</option>
                <option value="car">Car</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Make & Model"
              placeholder="Tata Starbus 32-Seater"
              value={editMakeModel}
              onChange={(e) => setEditMakeModel(e.target.value)}
              required
            />
            <Input
              label="Passenger / Cargo Capacity"
              type="number"
              value={editCapacity}
              onChange={(e) => setEditCapacity(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Current Odometer (km)"
              type="number"
              step="0.1"
              value={editOdometer}
              onChange={(e) => setEditOdometer(e.target.value)}
              required
            />
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Operational Status
              </label>
              <Select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as VehicleStatus)}
              >
                <option value="active">Active (In Service)</option>
                <option value="maintenance">Under Maintenance</option>
                <option value="inactive">Inactive / Retired</option>
              </Select>
            </div>
          </div>

          <Input
            label="Operational Notes"
            placeholder="E.g., Allocated to airport branch..."
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
    </PageContainer>
  );
}
