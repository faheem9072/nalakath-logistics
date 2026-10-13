'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { Vehicle, Driver, Route, Team, AssignmentStatus } from '@/types/database';
import { AssignmentWithDetails } from '@/types/models';
import { dataRepo } from '@/lib/data-service';

export interface EditAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  assignment: AssignmentWithDetails | null;
  vehicles: Vehicle[];
  drivers: Driver[];
  routes: Route[];
  teams: Team[];
}

export function EditAssignmentModal({
  isOpen,
  onClose,
  onSuccess,
  assignment,
  vehicles,
  drivers,
  routes,
  teams,
}: EditAssignmentModalProps) {
  const [dutyDate, setDutyDate] = useState('');
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [routeId, setRouteId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('12:00');
  const [status, setStatus] = useState<AssignmentStatus>('scheduled');
  const [notes, setNotes] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (assignment) {
      setDutyDate(assignment.duty_date);
      setDriverId(assignment.driver_id);
      setVehicleId(assignment.vehicle_id);
      setRouteId(assignment.route_id || '');
      setTeamId(assignment.team_id || '');
      setStartTime(assignment.planned_start_time.slice(0, 5));
      setEndTime(assignment.planned_end_time.slice(0, 5));
      setStatus(assignment.status);
      setNotes(assignment.notes || '');
      setError(null);
    }
  }, [assignment]);

  if (!assignment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (endTime <= startTime) {
        throw new Error('End time must be after start time');
      }

      await dataRepo.updateAssignment(assignment.id, {
        duty_date: dutyDate,
        driver_id: driverId,
        vehicle_id: vehicleId,
        route_id: routeId || null,
        team_id: teamId || null,
        planned_start_time: startTime,
        planned_end_time: endTime,
        status,
        notes: notes.trim() || null,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update assignment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Duty Allocation"
      description="Modify schedule date, shift window, assigned driver, vehicle, and operational status."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="danger">{error}</Alert>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Duty Date"
            type="date"
            value={dutyDate}
            onChange={(e) => setDutyDate(e.target.value)}
            required
          />
          <Input
            label="Shift Start Time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
          <Input
            label="Shift End Time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Assigned Driver
            </label>
            <Select value={driverId} onChange={(e) => setDriverId(e.target.value)} required>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name} ({d.employee_code}) {d.status !== 'active' ? `[${d.status}]` : ''}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Assigned Vehicle
            </label>
            <Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} required>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registration_number} — {v.make_model} ({v.capacity} Seats){' '}
                  {v.status !== 'active' ? `[${v.status}]` : ''}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Route Corridor
            </label>
            <Select value={routeId} onChange={(e) => setRouteId(e.target.value)}>
              <option value="">No specific corridor (Flexible)</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} — {r.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Client / Team
            </label>
            <Select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">No specific team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Operational Status
            </label>
            <Select value={status} onChange={(e) => setStatus(e.target.value as AssignmentStatus)}>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>
        </div>

        <Input
          label="Operational Notes / Instructions"
          placeholder="Shift notes, special client instructions..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
