'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { dataRepo } from '@/lib/data-service';
import { Trip } from '@/types/database';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { CheckCircle, Gauge, ChevronDown, ChevronUp } from 'lucide-react';

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
  const { t } = useLanguage();
  const [endOdometer, setEndOdometer] = useState<string>(
    trip?.start_odometer ? String(trip.start_odometer) : ''
  );
  const [notes, setNotes] = useState<string>('');
  const [isFinalTrip, setIsFinalTrip] = useState<boolean>(true);
  const [showExtra, setShowExtra] = useState<boolean>(false);
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
      title={`${t('completeTripTitle')} — Trip #${trip.trip_number}`}
      description={t('completeTripDesc')}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="danger">{error}</Alert>}

        {/* Start odo info */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
          <span className="text-slate-500 font-bold uppercase tracking-wider">
            {t('startOdoDisplay')}
          </span>
          <span className="text-slate-900 font-black font-mono text-lg">
            {startOdo.toLocaleString()} km
          </span>
        </div>

        {/* Big End Odometer Input */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 text-center space-y-2.5">
          <label className="block text-xs font-black text-emerald-950 uppercase tracking-wider">
            {t('endOdoLabel')} <span className="text-rose-500">*</span>
          </label>
          <div className="relative max-w-xs mx-auto">
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              value={endOdometer}
              onChange={(e) => setEndOdometer(e.target.value)}
              onFocus={(e) => e.target.select()}
              required
              autoFocus
              className="w-full text-center text-3xl sm:text-4xl font-black font-mono tracking-wider py-3 px-3 bg-white border-2 border-emerald-500 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 text-slate-900 shadow-inner"
            />
          </div>

          {distancePreview !== null && (
            <div className="bg-white border border-emerald-300 py-2 px-3 rounded-xl text-sm text-emerald-800 font-bold flex items-center justify-center gap-1.5 shadow-2xs">
              <Gauge className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{t('calculatedDistance')}</span>
              <span className="font-mono text-base font-black text-emerald-700">
                +{distancePreview} km
              </span>
            </div>
          )}
        </div>

        {/* Final trip checkbox */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <label className="flex items-center gap-2.5 text-xs text-slate-800 font-bold cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isFinalTrip}
              onChange={(e) => setIsFinalTrip(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
            />
            <span>{t('finalTripCheckbox')}</span>
          </label>
          {!isFinalTrip && (
            <p className="text-[11px] text-amber-600 mt-1 pl-6">
              {t('notFinalTripNotice')}
            </p>
          )}
        </div>

        {/* Optional notes */}
        <div>
          <button
            type="button"
            onClick={() => setShowExtra(!showExtra)}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer mx-auto py-1"
          >
            <span>{t('optionalDetails')}</span>
            {showExtra ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showExtra && (
            <div className="mt-2 space-y-3 pt-2 border-t border-slate-100">
              <Input
                label={t('tripNotesLabel')}
                placeholder={t('tripNotesPlaceholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Action Buttons with high touch target */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full py-3 text-sm font-bold min-h-[46px] rounded-xl"
          >
            {t('cancelBtn')}
          </Button>
          <Button
            type="submit"
            variant="success"
            size="lg"
            isLoading={isLoading}
            leftIcon={<CheckCircle className="w-5 h-5" />}
            className="w-full py-3 text-base font-black min-h-[46px] bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md"
          >
            {t('finishTripBtn')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
