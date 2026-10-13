'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { dataRepo } from '@/lib/data-service';

export interface StartTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  assignmentId: string;
  defaultOdometer: number;
  plannedDestination?: string;
  tripNumber: number;
}

export function StartTripModal({
  isOpen,
  onClose,
  onSuccess,
  assignmentId,
  defaultOdometer,
  plannedDestination,
  tripNumber,
}: StartTripModalProps) {
  const [startOdometer, setStartOdometer] = useState<string>(String(defaultOdometer));
  const [actualDestination, setActualDestination] = useState<string>(plannedDestination || '');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const odo = parseFloat(startOdometer);
    if (isNaN(odo) || odo < 0) {
      setError('Please enter a valid numeric odometer reading');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await dataRepo.startTrip({
        assignmentId,
        startOdometer: odo,
        actualDestination: actualDestination.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start trip');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Start Trip #${tripNumber}`}
      description="Record starting odometer reading to officially begin transit."
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="danger">{error}</Alert>}

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Start Odometer Reading (km) <span className="text-rose-500">*</span>
          </label>
          <Input
            type="number"
            step="0.1"
            value={startOdometer}
            onChange={(e) => setStartOdometer(e.target.value)}
            required
            autoFocus
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Last recorded vehicle odometer: {defaultOdometer.toLocaleString()} km
          </p>
        </div>

        <Input
          label="Actual Destination (if changed)"
          placeholder="E.g., North Facility via Bypass"
          value={actualDestination}
          onChange={(e) => setActualDestination(e.target.value)}
        />

        <Input
          label="Departure Notes"
          placeholder="E.g., Left depot on time, weather clear..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Begin Trip
          </Button>
        </div>
      </form>
    </Modal>
  );
}
