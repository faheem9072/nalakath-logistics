'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { dataRepo } from '@/lib/data-service';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Gauge, Play, ChevronDown, ChevronUp } from 'lucide-react';

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
  const { t } = useLanguage();
  const [startOdometer, setStartOdometer] = useState<string>(String(defaultOdometer));
  const [actualDestination, setActualDestination] = useState<string>(plannedDestination || '');
  const [notes, setNotes] = useState<string>('');
  const [showExtra, setShowExtra] = useState<boolean>(false);
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
      title={`${t('startTripTitle')} — Trip #${tripNumber}`}
      description={t('startTripDesc')}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="danger">{error}</Alert>}

        <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 text-center space-y-2.5">
          <label className="block text-xs font-black text-blue-900 uppercase tracking-wider">
            {t('startOdoLabel')} <span className="text-rose-500">*</span>
          </label>
          <div className="relative max-w-xs mx-auto">
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              value={startOdometer}
              onChange={(e) => setStartOdometer(e.target.value)}
              onFocus={(e) => e.target.select()}
              required
              autoFocus
              className="w-full text-center text-3xl sm:text-4xl font-black font-mono tracking-wider py-3 px-3 bg-white border-2 border-blue-500 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 text-slate-900 shadow-inner"
            />
          </div>
          <p className="text-xs text-slate-600 flex items-center justify-center gap-1 font-medium">
            <Gauge className="w-3.5 h-3.5 text-blue-600" />
            <span>{t('lastRecordedOdo')} <strong className="font-mono text-slate-900">{defaultOdometer.toLocaleString()} km</strong></span>
          </p>
        </div>

        {/* Optional details toggle */}
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
                label={t('destinationLabel')}
                placeholder={t('destinationPlaceholder')}
                value={actualDestination}
                onChange={(e) => setActualDestination(e.target.value)}
              />
              <Input
                label={t('notesLabel')}
                placeholder={t('notesPlaceholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          )}
        </div>

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
            variant="primary"
            size="lg"
            isLoading={isLoading}
            leftIcon={<Play className="w-5 h-5 fill-white" />}
            className="w-full py-3 text-base font-black min-h-[46px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md"
          >
            {t('beginTripBtn')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
