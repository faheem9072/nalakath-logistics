'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { AssignmentWithDetails } from '@/types/models';
import { Vehicle, Driver } from '@/types/database';
import { dataRepo } from '@/lib/data-service';

export interface ReassignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  assignment: AssignmentWithDetails | null;
  vehicles: Vehicle[];
  drivers: Driver[];
}

export function ReassignModal({
  isOpen,
  onClose,
  onSuccess,
  assignment,
  vehicles,
  drivers,
}: ReassignModalProps) {
  const [newDriverId, setNewDriverId] = useState('');
  const [newVehicleId, setNewVehicleId] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!assignment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason for reassignment (required for operational audit log)');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await dataRepo.reassignAssignment({
        assignmentId: assignment.id,
        newDriverId: newDriverId || undefined,
        newVehicleId: newVehicleId || undefined,
        reason: reason.trim(),
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Reassignment failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reassign Duty Assignment"
      description={`Duty Date: ${assignment.duty_date} (${assignment.planned_start_time.slice(0, 5)} - ${assignment.planned_end_time.slice(0, 5)})`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="danger">{error}</Alert>}

        {/* Current State summary */}
        <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs space-y-1">
          <div className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
            Current Allocation
          </div>
          <div className="text-slate-800 font-medium">
            <strong>Driver:</strong> {assignment.driver.full_name} ({assignment.driver.employee_code})
          </div>
          <div className="text-slate-800 font-medium">
            <strong>Vehicle:</strong> {assignment.vehicle.registration_number} (
            {assignment.vehicle.make_model})
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            New Driver (Leave unchanged if keeping current)
          </label>
          <Select
            value={newDriverId}
            onChange={(e) => setNewDriverId(e.target.value)}
          >
            <option value="">Keep current ({assignment.driver.full_name})</option>
            {drivers
              .filter((d) => d.id !== assignment.driver.id)
              .map((d) => (
                <option key={d.id} value={d.id} disabled={d.status !== 'active'}>
                  {d.full_name} ({d.employee_code}) {d.status !== 'active' ? `[${d.status}]` : ''}
                </option>
              ))}
          </Select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            New Vehicle (Leave unchanged if keeping current)
          </label>
          <Select
            value={newVehicleId}
            onChange={(e) => setNewVehicleId(e.target.value)}
          >
            <option value="">
              Keep current ({assignment.vehicle.registration_number})
            </option>
            {vehicles
              .filter((v) => v.id !== assignment.vehicle.id)
              .map((v) => (
                <option key={v.id} value={v.id} disabled={v.status !== 'active'}>
                  {v.registration_number} ({v.make_model}){' '}
                  {v.status !== 'active' ? `[${v.status}]` : ''}
                </option>
              ))}
          </Select>
        </div>

        <Input
          label="Audit Reason for Reassignment"
          placeholder="E.g., Original vehicle mechanical issue, driver emergency leave..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Confirm Reassignment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
