'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { dataRepo } from '@/lib/data-service';
import { Trip } from '@/types/database';

export interface CompleteTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  trip: Trip | null;
}

export function CompleteTripModal({
  isOpen,
  onClose,
  onSuccess,
  trip,
}: CompleteTripModalProps) {
  const [endOdometer, setEndOdometer] = useState<string>(
    trip?.start_odometer ? String(trip.start_odometer) : ''
  );
  const [notes, setNotes] = useState<string>('');
  const [isFinalTrip, setIsFinalTrip] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!trip) return null;

  const startOdo = trip.start_odometer || 0;
  const currentEndOdo = parseFloat(endOdometer);
  const distancePreview =
    !isNaN(currentEndOdo) && currentEndOdo >= startOdo
      ? Number((currentEndOdo - startOdo).toFixed(1))
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const end = parseFloat(endOdometer);
    if (isNaN(end) || end < 0) {
      setError('Please enter a valid numeric odometer reading');
      return;
    }

    if (end < startOdo) {
      setError(
        `Ending odometer (${end}) cannot be less than starting odometer (${startOdo})`
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await dataRepo.completeTrip({
        tripId: trip.id,
        endOdometer: end,
        notes: notes.trim() || undefined,
        isFinalTripOfDuty: isFinalTrip,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to complete trip');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Complete Trip #${trip.trip_number}`}
      description="Record ending odometer reading to complete this trip."
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="danger">{error}</Alert>}

        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
          <span className="text-slate-500 font-semibold uppercase">
            Trip Start Odometer
          </span>
          <span className="text-slate-900 font-bold font-mono text-sm">
            {startOdo.toLocaleString()} km
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            End Odometer Reading (km) <span className="text-rose-500">*</span>
          </label>
          <Input
            type="number"
            step="0.1"
            value={endOdometer}
            onChange={(e) => setEndOdometer(e.target.value)}
            required
            autoFocus
          />
          {distancePreview !== null && (
            <p className="text-xs text-emerald-600 font-semibold mt-1.5 flex items-center gap-1">
              <span>Calculated Trip Distance:</span>
              <span className="font-mono text-sm">{distancePreview} km</span>
            </p>
          )}
        </div>

        <Input
          label="Trip Completion Notes"
          placeholder="E.g., Delivered all passengers safely, heavy traffic on bypass..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="pt-2">
          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isFinalTrip}
              onChange={(e) => setIsFinalTrip(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
            />
            <span>This is the final trip of this daily duty (Mark duty Completed)</span>
          </label>
          {!isFinalTrip && (
            <p className="text-[11px] text-amber-600 mt-1 pl-6">
              Duty will stay open so you can start additional trips later today.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="success" isLoading={isLoading}>
            Finish Trip
          </Button>
        </div>
      </form>
    </Modal>
  );
}
