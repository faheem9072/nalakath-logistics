'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { dataRepo } from '@/lib/data-service';
import { Trip, ExpenseType } from '@/types/database';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  CheckCircle,
  Gauge,
  Fuel,
  Receipt,
  Wrench,
  Clock,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  FileText,
} from 'lucide-react';

export interface CompleteTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  trip: Trip | null;
  vehicleReg?: string;
  driverName?: string;
}

interface PendingExpense {
  id: string;
  expense_type: ExpenseType;
  amount: number;
  litres?: number;
  note?: string;
}

export function CompleteTripModal({
  isOpen,
  onClose,
  onSuccess,
  trip,
  vehicleReg,
  driverName,
}: CompleteTripModalProps) {
  const { lang, t } = useLanguage();
  const [endOdometer, setEndOdometer] = useState<string>('');
  const [distanceInput, setDistanceInput] = useState<string>('');
  const [durationText, setDurationText] = useState<string>('12 hrs 0 mins');
  const [notes, setNotes] = useState<string>('');
  const [isFinalTrip, setIsFinalTrip] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Expense inline creation state
  const [expenses, setExpenses] = useState<PendingExpense[]>([]);
  const [activeExpenseForm, setActiveExpenseForm] = useState<ExpenseType | 'Parking' | null>(null);
  const [expAmount, setExpAmount] = useState<string>('');
  const [expLitres, setExpLitres] = useState<string>('');
  const [expNote, setExpNote] = useState<string>('');
  const [showNotes, setShowNotes] = useState<boolean>(false);

  const startOdo = trip?.start_odometer ?? 0;

  useEffect(() => {
    if (isOpen && trip) {
      const initialEnd = trip.start_odometer ? String(trip.start_odometer) : '';
      setEndOdometer(initialEnd);
      setDistanceInput('');
      setNotes('');
      setError(null);
      setIsFinalTrip(true);
      setExpenses([]);
      setActiveExpenseForm(null);
      setExpAmount('');
      setExpLitres('');
      setExpNote('');

      // Calculate elapsed duration if start_time exists
      if (trip.start_time) {
        const start = new Date(trip.start_time).getTime();
        const now = Date.now();
        const diffMs = Math.max(0, now - start);
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        setDurationText(`${hours > 0 ? `${hours} hrs ` : ''}${mins} mins`);
      } else {
        setDurationText('12 hrs 0 mins');
      }
    }
  }, [isOpen, trip]);

  if (!trip) return null;

  // Handle distance or odometer changes
  const handleOdometerChange = (val: string) => {
    setEndOdometer(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= startOdo) {
      setDistanceInput((num - startOdo).toFixed(1));
    } else {
      setDistanceInput('');
    }
  };

  const handleDistanceChange = (val: string) => {
    setDistanceInput(val);
    const dist = parseFloat(val);
    if (!isNaN(dist) && dist >= 0) {
      setEndOdometer((startOdo + dist).toFixed(1));
    }
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(expAmount);
    if (isNaN(amt) || amt <= 0) {
      return;
    }

    const type: ExpenseType =
      activeExpenseForm === 'Parking' ? 'Other' : (activeExpenseForm as ExpenseType) || 'Other';

    const newExp: PendingExpense = {
      id: `pe-${Date.now()}`,
      expense_type: type,
      amount: amt,
      litres: type === 'Fuel' && expLitres ? parseFloat(expLitres) : undefined,
      note:
        activeExpenseForm === 'Parking'
          ? `Parking: ${expNote.trim() || 'Parking Charge'}`
          : expNote.trim() || undefined,
    };

    setExpenses((prev) => [...prev, newExp]);
    setActiveExpenseForm(null);
    setExpAmount('');
    setExpLitres('');
    setExpNote('');
  };

  const handleRemoveExpense = (id: string) => {
    setExpenses((prev) => prev.filter((x) => x.id !== id));
  };

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

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
        notes: notes.trim() ? `Duration: ${durationText} | ${notes.trim()}` : `Duration: ${durationText}`,
        isFinalTripOfDuty: isFinalTrip,
        expenses: expenses.map((exp) => ({
          expense_type: exp.expense_type,
          amount: exp.amount,
          litres: exp.litres,
          note: exp.note,
        })),
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to complete trip');
    } finally {
      setIsLoading(false);
    }
  };

  // Format usage time display like Delhivery screenshot
  const formatTimeSnippet = (iso?: string | null) => {
    if (!iso) return 'Today';
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const ticketId = trip.id.replace('trip-', '').slice(-7).toUpperCase();
  const usageTimeDisplay = `${formatTimeSnippet(trip.start_time)} to ${formatTimeSnippet(new Date().toISOString())}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lang === 'ml' ? 'വണ്ടി ട്രിപ്പ് പൂർത്തിയാക്കുക' : 'Active Vehicle Usage'}
      description={
        lang === 'ml'
          ? 'ഡൽഹിവെറി മോഡൽ ട്രിപ്പ് കൺഫർമേഷൻ & ചിലവുകൾ ക്ലിയർ ചെയ്യൽ'
          : 'Confirm usage distance, duration, and clear trip expenses'
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="danger">{error}</Alert>}

        {/* Delhivery Profile / Active Vehicle Header Card */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-[11px] font-bold text-slate-500">
              {driverName ? `Hello, ${driverName}` : 'Active Vehicle Duty'}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black font-mono text-slate-900 tracking-tight">
                {vehicleReg || 'KL-07-CN-4602'}
              </span>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                Adhoc
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Start Meter
            </span>
            <span className="text-sm font-mono font-black text-slate-700">
              {startOdo.toLocaleString()} km
            </span>
          </div>
        </div>

        {/* Usage Section Header */}
        <div className="text-xs font-bold text-slate-600 px-1">
          {lang === 'ml' ? 'ട്രിപ്പ് വിവരങ്ങൾ (Confirm Usage)' : 'Recent Usage (Confirm within 3 days)'}
        </div>

        {/* Big Clean Delhivery Usage Box */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 space-y-4 shadow-xs">
          {/* Total Distance Input */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              {lang === 'ml' ? 'ആകെ ഓടിയ ദൂരം (Total Distance KM)' : 'Total Distance'}
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                placeholder="117.01"
                value={distanceInput}
                onChange={(e) => handleDistanceChange(e.target.value)}
                className="w-full text-2xl sm:text-3xl font-black font-mono px-3.5 py-3 bg-slate-50/70 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 shadow-inner"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 uppercase">
                KM
              </span>
            </div>
            {/* End Odometer reference */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 px-1">
              <span>{lang === 'ml' ? 'അവസാന റീഡിംഗ് (End KM):' : 'End Odometer:'}</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.1"
                  value={endOdometer}
                  onChange={(e) => handleOdometerChange(e.target.value)}
                  placeholder={String(startOdo)}
                  className="w-28 text-right font-mono font-bold text-xs py-1 px-2 border border-slate-300 rounded-lg bg-white"
                />
                <span className="font-mono text-slate-600">km</span>
              </div>
            </div>
          </div>

          {/* Total Duration Stepper / Display */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              {lang === 'ml' ? 'ആകെ സമയം (Total Duration)' : 'Total Duration'}
            </label>
            <div className="flex items-center justify-between border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5">
              <button
                type="button"
                onClick={() => {
                  const m = durationText.match(/(\d+)\s*hrs/);
                  const h = m ? Math.max(1, parseInt(m[1]) - 1) : 1;
                  setDurationText(`${h} hrs 0 mins`);
                }}
                className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold flex items-center justify-center text-lg active:scale-95 shadow-2xs cursor-pointer"
              >
                -
              </button>
              <span className="text-sm font-bold text-slate-800 font-mono">
                {durationText}
              </span>
              <button
                type="button"
                onClick={() => {
                  const m = durationText.match(/(\d+)\s*hrs/);
                  const h = m ? parseInt(m[1]) + 1 : 12;
                  setDurationText(`${h} hrs 0 mins`);
                }}
                className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold flex items-center justify-center text-lg active:scale-95 shadow-2xs cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          {/* Ticket ID & Usage Time snippet */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                Adhoc Ticket ID
              </span>
              <span className="font-mono font-bold text-slate-800">
                #{ticketId}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                Usage Time
              </span>
              <span className="text-[11px] font-semibold text-slate-700 leading-tight block">
                {usageTimeDisplay}
              </span>
            </div>
          </div>

          {/* ============================================================ */}
          {/* TRIP EXPENSES CLEARANCE SECTION (Fuel, Toll, Maintenance, Parking) */}
          {/* ============================================================ */}
          <div className="pt-3 border-t border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-slate-900 block">
                  {lang === 'ml' ? 'വണ്ടിയുടെ ചിലവുകൾ ക്ലിയർ ചെയ്യുക' : 'Trip Expenses & Clearances'}
                </span>
                <span className="text-[10px] text-slate-500">
                  {lang === 'ml'
                    ? 'സബ്മിറ്റ് ചെയ്യുന്നതിന് മുൻപ് ചിലവുകൾ രേഖപ്പെടുത്തുക'
                    : 'Add fuel, toll, maintenance & parking before submitting'}
                </span>
              </div>
              {totalExpenseAmount > 0 && (
                <span className="text-xs font-black font-mono text-emerald-700 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-full">
                  ₹{totalExpenseAmount.toLocaleString()}
                </span>
              )}
            </div>

            {/* 4 Quick Expense Buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setActiveExpenseForm(activeExpenseForm === 'Fuel' ? null : 'Fuel')}
                className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                  activeExpenseForm === 'Fuel'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                }`}
              >
                <Fuel className="w-4 h-4" />
                <span>{lang === 'ml' ? 'ഡീസൽ' : 'Fuel'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveExpenseForm(activeExpenseForm === 'Toll' ? null : 'Toll')}
                className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                  activeExpenseForm === 'Toll'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                    : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span>{lang === 'ml' ? 'ടോൾ' : 'Toll'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveExpenseForm(activeExpenseForm === 'Maintenance' ? null : 'Maintenance')
                }
                className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                  activeExpenseForm === 'Maintenance'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                }`}
              >
                <Wrench className="w-4 h-4" />
                <span>{lang === 'ml' ? 'പണി' : 'Repair'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveExpenseForm(activeExpenseForm === 'Parking' ? null : 'Parking')
                }
                className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                  activeExpenseForm === 'Parking'
                    ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>{lang === 'ml' ? 'പാർക്കിംഗ്' : 'Parking'}</span>
              </button>
            </div>

            {/* Inline Expense Input Card */}
            {activeExpenseForm && (
              <div className="bg-slate-50 border border-slate-300 rounded-xl p-3 space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>
                    ➕ {lang === 'ml' ? 'ചിലവ് ചേർക്കുക:' : 'Add Expense:'} {activeExpenseForm}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveExpenseForm(null)}
                    className="text-slate-400 hover:text-slate-700 text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      {lang === 'ml' ? 'തുക (Amount ₹) *' : 'Amount (₹) *'}
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 1500"
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      className="w-full text-sm font-mono font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>

                  {activeExpenseForm === 'Fuel' ? (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        {lang === 'ml' ? 'ലിറ്റർ (Litres)' : 'Litres'}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 15.5"
                        value={expLitres}
                        onChange={(e) => setExpLitres(e.target.value)}
                        className="w-full text-sm font-mono font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        {lang === 'ml' ? 'വിവരണം / സ്ഥലം' : 'Note / Garage / Plaza'}
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Toll plaza name"
                        value={expNote}
                        onChange={(e) => setExpNote(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>

                {activeExpenseForm === 'Fuel' && (
                  <div>
                    <input
                      type="text"
                      placeholder={lang === 'ml' ? 'പമ്പ് പേര് (ഉദാ: IOCL ബൈപാസ്)' : 'Pump name / Note'}
                      value={expNote}
                      onChange={(e) => setExpNote(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveExpenseForm(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleAddExpense}
                    disabled={!expAmount || parseFloat(expAmount) <= 0}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                  >
                    + Add to Trip
                  </Button>
                </div>
              </div>
            )}

            {/* List of Added Trip Expenses */}
            {expenses.length > 0 && (
              <div className="space-y-1.5">
                {expenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">
                        {exp.expense_type === 'Fuel'
                          ? '⛽ Fuel'
                          : exp.expense_type === 'Toll'
                          ? '🛣️ Toll'
                          : exp.expense_type === 'Maintenance'
                          ? '🔧 Maintenance'
                          : '🅿️ Parking/Other'}
                      </span>
                      {exp.litres ? (
                        <span className="text-[10px] text-slate-500 font-mono">
                          ({exp.litres} L)
                        </span>
                      ) : null}
                      {exp.note ? (
                        <span className="text-[11px] text-slate-500 truncate max-w-[120px]">
                          {exp.note}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-slate-900">
                        ₹{exp.amount.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExpense(exp.id)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Big Blue Confirm Button (Delhivery Style) */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-base font-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
          >
            <CheckCircle className="w-5 h-5" />
            <span>
              {isLoading
                ? (lang === 'ml' ? 'സബ്മിറ്റ് ചെയ്യുന്നു...' : 'Confirming...')
                : (lang === 'ml' ? 'കൺഫേം ചെയ്യുക (Confirm)' : 'Confirm')}
            </span>
          </button>
        </div>

        {/* Optional Notes & Final Trip checkbox */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowNotes(!showNotes)}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 mx-auto py-1"
          >
            <span>{showNotes ? '▲ Hide extra notes' : '▼ Add optional trip notes'}</span>
          </button>

          {showNotes && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <input
                type="text"
                placeholder={lang === 'ml' ? 'ട്രിപ്പ് കുറിപ്പുകൾ (ഓപ്ഷണൽ)' : 'Trip notes / route details'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFinalTrip}
                  onChange={(e) => setIsFinalTrip(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>{lang === 'ml' ? 'ഇന്നത്തെ അവസാന ട്രിപ്പ് (Final Duty Trip)' : 'Mark duty complete for today'}</span>
              </label>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

