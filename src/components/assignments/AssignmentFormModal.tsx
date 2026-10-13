'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { Vehicle, Driver, Route, Team } from '@/types/database';
import { dataRepo } from '@/lib/data-service';
import { getTodayDateString } from '@/lib/mock/mock-store';

export interface AssignmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vehicles: Vehicle[];
  drivers: Driver[];
  routes: Route[];
  teams: Team[];
}

export function AssignmentFormModal({
  isOpen,
  onClose,
  onSuccess,
  vehicles,
  drivers,
  routes,
  teams,
}: AssignmentFormModalProps) {
  const [dutyDate, setDutyDate] = useState('');
  const [driverId, setDriverId] = useState(drivers[0]?.id || '');
  const [vehicleId, setVehicleId] = useState(
    vehicles.find((v) => v.status === 'active')?.id || vehicles[0]?.id || ''
  );
  const [routeId, setRouteId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('12:00');
  const [notes, setNotes] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !dutyDate) {
      setDutyDate(getTodayDateString());
    }
  }, [isOpen, dutyDate]);

  // Auto-set route when driver is fixed-route
  useEffect(() => {
    const selectedDriver = drivers.find((d) => d.id === driverId);
    if (selectedDriver && selectedDriver.is_fixed_route && selectedDriver.default_route_id) {
      setRouteId(selectedDriver.default_route_id);
      const r = routes.find((x) => x.id === selectedDriver.default_route_id);
      if (r && r.team_id) {
        setTeamId(r.team_id);
      }
    }
  }, [driverId, drivers, routes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (endTime <= startTime) {
        throw new Error('End time must be after start time');
      }

      await dataRepo.createAssignment({
        duty_date: dutyDate,
        driver_id: driverId,
        vehicle_id: vehicleId,
        route_id: routeId || null,
        team_id: teamId || null,
        planned_start_time: startTime,
        planned_end_time: endTime,
        notes: notes || null,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create assignment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Daily Assignment"
      description="Allocate vehicle and driver duty with automatic conflict & maintenance checking."
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
            label="Start Time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
          <Input
            label="End Time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Assigned Driver <span className="text-rose-500">*</span>
            </label>
            <Select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              required
            >
              <option value="">Select a driver...</option>
              {drivers.map((d) => (
                <option
                  key={d.id}
                  value={d.id}
                  disabled={d.status !== 'active'}
                >
                  {d.full_name} ({d.employee_code})
                  {d.is_fixed_route ? ' [Fixed Route]' : ''}
                  {d.status !== 'active' ? ` [${d.status.toUpperCase()}]` : ''}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Assigned Vehicle <span className="text-rose-500">*</span>
            </label>
            <Select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              required
            >
              <option value="">Select a vehicle...</option>
              {vehicles.map((v) => (
                <option
                  key={v.id}
                  value={v.id}
                  disabled={v.status !== 'active'}
                >
                  {v.registration_number} — {v.make_model} ({v.capacity} seats)
                  {v.status !== 'active' ? ` [${v.status.toUpperCase()}]` : ''}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Planned Route (Optional)
            </label>
            <Select
              value={routeId}
              onChange={(e) => {
                setRouteId(e.target.value);
                const r = routes.find((x) => x.id === e.target.value);
                if (r && r.team_id) setTeamId(r.team_id);
              }}
            >
              <option value="">No fixed route (Ad-hoc / Open)</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} — {r.name} ({r.planned_distance_km} km)
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Client / Department (Optional)
            </label>
            <Select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
            >
              <option value="">General Corporate Logistics</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <Input
          label="Operational Notes"
          placeholder="E.g., Morning employee pickup batch, requires airport entry permit..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Allocate Duty
          </Button>
        </div>
      </form>
    </Modal>
  );
}
