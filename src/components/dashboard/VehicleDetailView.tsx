'use client';

import React, { useState, useEffect } from 'react';
import { dataRepo } from '@/lib/data-service';
import { VehicleDetailReport, ExpenseWithDetails } from '@/types/models';
import { Vehicle, ExpenseType, ClientCompany, VehicleType, VehicleStatus, TripLocation } from '@/types/database';
import { MoveIQDarkCard } from '@/components/moveiq/MoveIQDarkCard';
import { TripMapModal } from '@/components/map/TripMapModal';
import {
  ArrowLeft,
  Calendar,
  Truck,
  IndianRupee,
  Fuel,
  Wrench,
  Receipt,
  Pencil,
  Trash2,
  Plus,
  Archive,
  X,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Layers,
  MapPin,
  Navigation,
} from 'lucide-react';

interface VehicleDetailViewProps {
  vehicleQuery?: string;
  initialVehicleQuery?: string;
  initialMonth?: string;
  onBack?: () => void;
  showBackBtn?: boolean;
  onVehicleUpdated?: () => void;
}

export function VehicleDetailView({
  vehicleQuery,
  initialVehicleQuery,
  initialMonth,
  onBack,
  showBackBtn = true,
  onVehicleUpdated,
}: VehicleDetailViewProps) {
  const effectiveQuery = vehicleQuery || initialVehicleQuery || '3057';
  const [report, setReport] = useState<VehicleDetailReport | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth || '2026-10');
  const [isLoading, setIsLoading] = useState(true);

  // Edit Vehicle Details Modal
  const [isEditVehicleOpen, setIsEditVehicleOpen] = useState(false);
  const [editRegNo, setEditRegNo] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editCompany, setEditCompany] = useState<ClientCompany>('Delhivery');
  const [editRouteLocation, setEditRouteLocation] = useState('');
  const [editType, setEditType] = useState<VehicleType>('truck');
  const [editOdo, setEditOdo] = useState('');
  const [isSubmittingVehicle, setIsSubmittingVehicle] = useState(false);
  const [vehicleEditError, setVehicleEditError] = useState<string | null>(null);

  // Edit Monthly Income Modal
  const [isEditIncomeOpen, setIsEditIncomeOpen] = useState(false);
  const [incomeAmountInput, setIncomeAmountInput] = useState('');
  const [isSubmittingIncome, setIsSubmittingIncome] = useState(false);

  // Add / Edit Expense Modal (Owner Correction)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expType, setExpType] = useState<ExpenseType>('Fuel');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState('2026-10-18');
  const [expLitres, setExpLitres] = useState('');
  const [expNote, setExpNote] = useState('');
  const [expError, setExpError] = useState<string | null>(null);
  const [isSubmittingExp, setIsSubmittingExp] = useState(false);

  // Map Modal for Travel History
  const [selectedMapTrip, setSelectedMapTrip] = useState<{
    tripId: string;
    dutyDate: string;
    driverName: string;
    vehicleRegistration: string;
    startPlace: string;
    endPlace: string;
    startOdometer: number | null;
    endOdometer: number | null;
    distanceKm: number;
    startLocation?: TripLocation | null;
    endLocation?: TripLocation | null;
  } | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await dataRepo.getVehicleDetail(effectiveQuery, selectedMonth);
      setReport(data);
      if (data) {
        setEditRegNo(data.vehicle.registration_number);
        setEditModel(data.vehicle.make_model);
        setEditCompany((data.vehicle.company as ClientCompany) || 'Delhivery');
        setEditRouteLocation(data.vehicle.route_location || '');
        setEditType(data.vehicle.vehicle_type);
        setEditOdo(String(data.vehicle.current_odometer));
        setIncomeAmountInput(String(data.monthlyIncome || 50000));
      }
    } catch (err) {
      console.error('Failed to load vehicle detail:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [effectiveQuery, selectedMonth]);

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report) return;
    setVehicleEditError(null);
    setIsSubmittingVehicle(true);
    try {
      await dataRepo.updateVehicle(report.vehicle.id, {
        registration_number: editRegNo.trim().toUpperCase(),
        make_model: editModel.trim(),
        company: editCompany,
        route_location: editRouteLocation.trim() || undefined,
        vehicle_type: editType,
        current_odometer: parseFloat(editOdo) || report.vehicle.current_odometer,
      });
      setIsEditVehicleOpen(false);
      await loadData();
      if (onVehicleUpdated) onVehicleUpdated();
    } catch (err: unknown) {
      setVehicleEditError(err instanceof Error ? err.message : 'Failed to update vehicle');
    } finally {
      setIsSubmittingVehicle(false);
    }
  };

  const handleArchiveVehicle = async () => {
    if (!report) return;
    if (confirm(`Archive vehicle "${report.vehicle.registration_number}"? Vehicle will be marked inactive.`)) {
      await dataRepo.archiveVehicle(report.vehicle.id);
      if (onVehicleUpdated) onVehicleUpdated();
      if (onBack) onBack();
    }
  };

  const handleSaveIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report) return;
    const amount = parseFloat(incomeAmountInput);
    if (isNaN(amount) || amount < 0) return;

    setIsSubmittingIncome(true);
    try {
      await dataRepo.setVehicleMonthlyIncome(report.vehicle.id, selectedMonth, amount);
      setIsEditIncomeOpen(false);
      await loadData();
      if (onVehicleUpdated) onVehicleUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingIncome(false);
    }
  };

  const handleOpenAddExpense = () => {
    setEditingExpenseId(null);
    setExpType('Fuel');
    setExpAmount('');
    setExpDate('2026-10-18');
    setExpLitres('');
    setExpNote('');
    setExpError(null);
    setIsExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (exp: ExpenseWithDetails) => {
    setEditingExpenseId(exp.id);
    setExpType(exp.expense_type);
    setExpAmount(String(exp.amount));
    setExpDate(exp.date);
    setExpLitres(exp.litres ? String(exp.litres) : '');
    setExpNote(exp.note || '');
    setExpError(null);
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report) return;
    const amt = parseFloat(expAmount);
    if (isNaN(amt) || amt <= 0) {
      setExpError('Please enter a valid amount');
      return;
    }

    setIsSubmittingExp(true);
    try {
      if (editingExpenseId) {
        await dataRepo.updateExpense(editingExpenseId, {
          expense_type: expType,
          amount: amt,
          date: expDate,
          litres: expType === 'Fuel' ? parseFloat(expLitres) || null : null,
          note: expNote.trim() || null,
        });
      } else {
        const driverId = report.driversWhoDrove[0]?.driverId || report.vehicle.default_driver_ids?.[0] || 'drv-refnise';
        await dataRepo.createExpense({
          vehicle_id: report.vehicle.id,
          driver_id: driverId,
          expense_type: expType,
          amount: amt,
          date: expDate,
          litres: expType === 'Fuel' ? parseFloat(expLitres) || null : null,
          note: expNote.trim() || null,
        });
      }
      setIsExpenseModalOpen(false);
      await loadData();
      if (onVehicleUpdated) onVehicleUpdated();
    } catch (err: unknown) {
      setExpError(err instanceof Error ? err.message : 'Failed to save expense');
    } finally {
      setIsSubmittingExp(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (confirm('Delete this expense entry?')) {
      await dataRepo.deleteExpense(id);
      await loadData();
      if (onVehicleUpdated) onVehicleUpdated();
    }
  };

  if (!report) {
    return (
      <div className="p-6 text-center text-gray-500">
        Loading vehicle report...
      </div>
    );
  }

  const { vehicle, expenses, monthlyIncome = 0, profitOrLoss = 0 } = report;
  const isProfit = profitOrLoss >= 0;

  return (
    <div className="space-y-4 pb-20">
      {/* Top Navigation & Month Selector */}
      <div className="flex items-center justify-between gap-2">
        {showBackBtn && onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="w-11 h-11 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex items-center justify-center text-gray-800 hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
            aria-label="Back to vehicles"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-11" />
        )}

        {/* Month Selector Pill */}
        <div className="flex items-center gap-1.5 bg-white border border-gray-200/80 px-3.5 py-2 rounded-full shadow-2xs">
          <Calendar className="w-4 h-4 text-gray-500" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-xs font-bold text-[#121316] focus:outline-none cursor-pointer"
          >
            <option value="2026-10">October 2026</option>
            <option value="2026-09">September 2026</option>
            <option value="2026-08">August 2026</option>
          </select>
        </div>

        {/* Edit Vehicle Header Action */}
        <button
          type="button"
          onClick={() => setIsEditVehicleOpen(true)}
          className="w-11 h-11 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex items-center justify-center text-gray-800 hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
          aria-label="Edit vehicle"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>

      {/* Full Vehicle Details Card */}
      <div className="bg-white rounded-[28px] p-5 border border-gray-100 shadow-2xs space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gray-100 text-gray-700">
                {vehicle.company || 'Delhivery'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500">
                {vehicle.vehicle_type}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#121316] tracking-tight">
              {vehicle.registration_number}
            </h1>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              {vehicle.make_model} • {vehicle.route_location || 'Ad-hoc route'}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                vehicle.status === 'active'
                  ? 'bg-[#D4F65B] text-black'
                  : vehicle.status === 'maintenance'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {vehicle.status === 'active'
                ? 'Active'
                : vehicle.status === 'maintenance'
                ? 'Maintenance'
                : 'Inactive'}
            </span>
            <span className="text-[11px] font-mono font-bold text-gray-500 pt-1">
              {vehicle.current_odometer.toLocaleString()} km
            </span>
            <button
              type="button"
              onClick={handleArchiveVehicle}
              className="text-[11px] text-gray-400 hover:text-rose-600 flex items-center gap-1 cursor-pointer pt-1"
            >
              <Archive className="w-3 h-3" />
              <span>Archive</span>
            </button>
          </div>
        </div>
      </div>

      {/* BIG Profit or Loss for the Month (Income Minus Expenses) */}
      <MoveIQDarkCard
        title="Monthly Profit & Loss"
        subtitle={`Contract performance for ${selectedMonth}`}
        action={
          <button
            type="button"
            onClick={() => setIsEditIncomeOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#22242B] hover:bg-[#2e313a] text-gray-200 text-xs font-bold rounded-full transition-colors cursor-pointer"
          >
            <Pencil className="w-3 h-3 text-[#D4F65B]" />
            <span>Edit Income</span>
          </button>
        }
      >
        <div className="space-y-4 pt-1">
          {/* Big Profit or Loss Banner */}
          <div
            className={`p-4 rounded-2xl flex items-center justify-between gap-3 ${
              isProfit
                ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-400'
                : 'bg-rose-950/70 border border-rose-500/40 text-rose-400'
            }`}
          >
            <div>
              <p className="text-xs uppercase tracking-wider font-extrabold text-gray-400">
                Net Result ({isProfit ? 'PROFIT' : 'LOSS'})
              </p>
              <p className="text-2xl sm:text-3xl font-black tracking-tight mt-0.5">
                {isProfit ? '+' : '-'} ₹{Math.abs(profitOrLoss).toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
              {isProfit ? (
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              ) : (
                <TrendingDown className="w-6 h-6 text-rose-400" />
              )}
            </div>
          </div>

          {/* Income vs Expenses Stats Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-[#1E1F24] rounded-2xl p-3.5">
              <span className="text-[11px] font-medium text-gray-400 block">
                Monthly Income / Rent
              </span>
              <p className="text-lg font-black text-white mt-1">
                ₹{monthlyIncome.toLocaleString()}
              </p>
              <span className="text-[10px] text-gray-500">Contract fixed/rent</span>
            </div>

            <div className="bg-[#1E1F24] rounded-2xl p-3.5">
              <span className="text-[11px] font-medium text-gray-400 block">
                Total Expenses
              </span>
              <p className="text-lg font-black text-[#D4F65B] mt-1">
                ₹{expenses.totals.grandTotal.toLocaleString()}
              </p>
              <span className="text-[10px] text-gray-500">Fuel, Toll & Maint</span>
            </div>
          </div>

          {/* Detailed Expense Breakdown pills */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-800 text-center">
            <div className="p-2 bg-[#1A1B20] rounded-xl">
              <p className="text-[10px] text-gray-400">Fuel</p>
              <p className="text-xs font-bold text-white mt-0.5">
                ₹{expenses.totals.fuel.toLocaleString()}
              </p>
            </div>
            <div className="p-2 bg-[#1A1B20] rounded-xl">
              <p className="text-[10px] text-gray-400">Toll</p>
              <p className="text-xs font-bold text-white mt-0.5">
                ₹{expenses.totals.toll.toLocaleString()}
              </p>
            </div>
            <div className="p-2 bg-[#1A1B20] rounded-xl">
              <p className="text-[10px] text-gray-400">Maintenance</p>
              <p className="text-xs font-bold text-white mt-0.5">
                ₹{expenses.totals.maintenance.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </MoveIQDarkCard>

      {/* Which drivers ran this vehicle this month */}
      <div className="bg-white rounded-[28px] p-5 border border-gray-100 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-[#121316] uppercase tracking-wider">
            Drivers Who Ran This Vehicle
          </h2>
          <span className="text-xs font-bold text-gray-400">
            {report.driversWhoDrove.length} Drivers
          </span>
        </div>

        {report.driversWhoDrove.length === 0 ? (
          <p className="text-xs text-gray-400 py-3 text-center">
            No driver assigned yet for this month.
          </p>
        ) : (
          <div className="space-y-2">
            {report.driversWhoDrove.map((d) => (
              <div
                key={d.driverId}
                className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-gray-100 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-black text-[#121316]">
                    {d.driverName}
                  </p>
                  <p className="text-xs text-gray-500 font-mono">
                    {d.driverPhone} • {d.daysCount} {d.daysCount === 1 ? 'day' : 'days'} worked
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-[#121316]">
                    {d.totalKm} km
                  </p>
                  <p className="text-[11px] text-gray-400 font-medium">
                    {d.tripsCount} {d.tripsCount === 1 ? 'trip' : 'trips'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Travel History for Selected Month */}
      <div className="bg-white rounded-[28px] p-5 border border-gray-100 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-[#121316] uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#8BE234]" />
              <span>Travel History ({report.travelHistory?.length || 0})</span>
            </h2>
            <p className="text-[11px] text-gray-400">
              Trip logs for {selectedMonth} with GPS locations
            </p>
          </div>
          <span className="text-xs font-bold text-gray-500 font-mono">
            {report.totalMonthKm} km total
          </span>
        </div>

        {(!report.travelHistory || report.travelHistory.length === 0) ? (
          <p className="text-xs text-gray-400 py-6 text-center">
            No travel history recorded for this vehicle in {selectedMonth}.
          </p>
        ) : (
          <div className="space-y-3">
            {report.travelHistory.map((trip) => (
              <div
                key={trip.tripId}
                className="p-4 rounded-2xl bg-[#F8F9FA] border border-gray-100 space-y-2.5"
              >
                {/* Header row: Date, Driver, Status, View on map button */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-800 bg-white px-2.5 py-1 rounded-full border border-gray-200">
                      {trip.dutyDate}
                    </span>
                    <span className="text-xs font-semibold text-gray-700">
                      {trip.driverName}
                    </span>
                    {trip.status === 'in_progress' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-lime-100 text-lime-900">
                        Live
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMapTrip({
                        ...trip,
                        vehicleRegistration: vehicle.registration_number,
                      });
                      setIsMapOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#121316] text-[#D4F65B] hover:bg-black text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                  >
                    <MapPin className="w-3 h-3" />
                    <span>View on map</span>
                  </button>
                </div>

                {/* Start and End Locations */}
                <div className="space-y-1.5 text-xs text-gray-600 bg-white p-3 rounded-xl border border-gray-100">
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Start Place</span>
                      <span className="font-medium text-gray-800 break-words">{trip.startPlace}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">End Place</span>
                      <span className="font-medium text-gray-800 break-words">{trip.endPlace}</span>
                    </div>
                  </div>
                </div>

                {/* Odometer metrics: Start km, End km, KM Run */}
                <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-gray-200/60">
                  <div className="bg-white p-2 rounded-xl border border-gray-100">
                    <span className="text-[10px] font-medium text-gray-400 block">Start KM</span>
                    <span className="text-xs font-bold text-gray-800 font-mono">
                      {trip.startOdometer !== null ? `${trip.startOdometer} km` : '—'}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-gray-100">
                    <span className="text-[10px] font-medium text-gray-400 block">End KM</span>
                    <span className="text-xs font-bold text-gray-800 font-mono">
                      {trip.endOdometer !== null ? `${trip.endOdometer} km` : '—'}
                    </span>
                  </div>
                  <div className="bg-[#121316] text-white p-2 rounded-xl">
                    <span className="text-[10px] font-medium text-[#D4F65B] block">KM Run</span>
                    <span className="text-xs font-black text-white font-mono">
                      {trip.distanceKm > 0
                        ? `${trip.distanceKm} km`
                        : trip.status === 'in_progress'
                        ? 'Running'
                        : '0 km'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expense List with date, driver, type, amount, note + correction */}
      <div className="bg-white rounded-[28px] p-5 border border-gray-100 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-[#121316] uppercase tracking-wider">
              Expense List ({expenses.entries.length})
            </h2>
            <p className="text-[11px] text-gray-400">
              Live updates entered by drivers & owner
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAddExpense}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#121316] text-white text-xs font-bold hover:bg-black transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#D4F65B]" />
            <span>Add Expense</span>
          </button>
        </div>

        {expenses.entries.length === 0 ? (
          <p className="text-xs text-gray-400 py-6 text-center">
            No expenses logged for this vehicle in {selectedMonth}.
          </p>
        ) : (
          <div className="space-y-2.5">
            {expenses.entries.map((entry) => (
              <div
                key={entry.id}
                className="p-3.5 rounded-2xl border border-gray-100 bg-[#F8F9FA] flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        entry.expense_type === 'Fuel'
                          ? 'bg-amber-100 text-amber-800'
                          : entry.expense_type === 'Toll'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {entry.expense_type}
                    </span>
                    <span className="text-xs font-bold text-gray-500">
                      {entry.date}
                    </span>
                    {entry.driver && (
                      <span className="text-xs text-gray-600 font-medium">
                        by {entry.driver.full_name}
                      </span>
                    )}
                  </div>

                  {entry.note && (
                    <p className="text-xs text-gray-600">
                      {entry.note}
                    </p>
                  )}
                  {entry.litres && (
                    <p className="text-[11px] text-gray-400 font-medium">
                      Fuel volume: {entry.litres} L
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-sm font-black text-[#121316]">
                    ₹{entry.amount.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-1 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEditExpense(entry)}
                      className="p-1 rounded-lg text-gray-400 hover:text-black hover:bg-white transition-colors cursor-pointer"
                      title="Edit expense"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteExpense(entry.id)}
                      className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-white transition-colors cursor-pointer"
                      title="Delete expense"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Monthly Income Modal */}
      {isEditIncomeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-[32px] p-6 max-w-sm w-full space-y-4 shadow-2xl border border-gray-100 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#121316]">
                Edit Monthly Income
              </h3>
              <button
                type="button"
                onClick={() => setIsEditIncomeOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Contract or rental income for {vehicle.registration_number} ({selectedMonth})
            </p>

            <form onSubmit={handleSaveIncome} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Monthly Income (₹)
                </label>
                <input
                  type="number"
                  step="100"
                  value={incomeAmountInput}
                  onChange={(e) => setIncomeAmountInput(e.target.value)}
                  className="w-full h-12 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-base font-bold text-[#121316] focus:outline-none focus:border-gray-400"
                  required
                  autoFocus
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditIncomeOpen(false)}
                  className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingIncome}
                  className="flex-1 h-11 rounded-xl bg-[#121316] text-white font-bold text-xs hover:bg-black cursor-pointer"
                >
                  {isSubmittingIncome ? 'Saving...' : 'Update Income'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Vehicle Details Modal */}
      {isEditVehicleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-[32px] p-6 max-w-sm w-full space-y-4 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#121316]">
                Edit Vehicle Details
              </h3>
              <button
                type="button"
                onClick={() => setIsEditVehicleOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {vehicleEditError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{vehicleEditError}</span>
              </div>
            )}

            <form onSubmit={handleSaveVehicle} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Registration Number
                </label>
                <input
                  type="text"
                  value={editRegNo}
                  onChange={(e) => setEditRegNo(e.target.value)}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold uppercase text-[#121316] focus:outline-none focus:border-gray-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Make & Model
                </label>
                <input
                  type="text"
                  value={editModel}
                  onChange={(e) => setEditModel(e.target.value)}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Client Company
                </label>
                <select
                  value={editCompany}
                  onChange={(e) => setEditCompany(e.target.value as ClientCompany)}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                >
                  <option value="Delhivery">Delhivery</option>
                  <option value="Shadowfax">Shadowfax</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Route / Hub Location
                </label>
                <input
                  type="text"
                  value={editRouteLocation}
                  onChange={(e) => setEditRouteLocation(e.target.value)}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm text-[#121316] focus:outline-none focus:border-gray-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Current Odometer (KM)
                </label>
                <input
                  type="number"
                  value={editOdo}
                  onChange={(e) => setEditOdo(e.target.value)}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-mono text-[#121316] focus:outline-none focus:border-gray-400"
                  required
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditVehicleOpen(false)}
                  className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVehicle}
                  className="flex-1 h-11 rounded-xl bg-[#121316] text-white font-bold text-xs hover:bg-black cursor-pointer"
                >
                  {isSubmittingVehicle ? 'Saving...' : 'Save Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Correct Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-[32px] p-6 max-w-sm w-full space-y-4 shadow-2xl border border-gray-100 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#121316]">
                {editingExpenseId ? 'Correct Expense Entry' : 'Add Vehicle Expense'}
              </h3>
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {expError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{expError}</span>
              </div>
            )}

            <form onSubmit={handleSaveExpense} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Expense Type
                </label>
                <select
                  value={expType}
                  onChange={(e) => setExpType(e.target.value as ExpenseType)}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                >
                  <option value="Fuel">Fuel</option>
                  <option value="Toll">Toll</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  step="1"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-bold text-[#121316] focus:outline-none focus:border-gray-400"
                  required
                />
              </div>

              {expType === 'Fuel' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Fuel Volume (Litres)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={expLitres}
                    onChange={(e) => setExpLitres(e.target.value)}
                    placeholder="e.g. 25.5"
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Date
                </label>
                <input
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm text-[#121316] focus:outline-none focus:border-gray-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Notes
                </label>
                <input
                  type="text"
                  value={expNote}
                  onChange={(e) => setExpNote(e.target.value)}
                  placeholder="e.g. HP Petrol Pump / Tyre repair"
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm text-[#121316] focus:outline-none focus:border-gray-400"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingExp}
                  className="flex-1 h-11 rounded-xl bg-[#121316] text-white font-bold text-xs hover:bg-black cursor-pointer"
                >
                  {isSubmittingExp ? 'Saving...' : editingExpenseId ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Trip Map Modal (OpenStreetMap Leaflet) */}
      <TripMapModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        tripInfo={selectedMapTrip}
      />
    </div>
  );
}
