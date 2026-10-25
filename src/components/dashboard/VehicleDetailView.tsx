'use client';

import React, { useState, useEffect } from 'react';
import { dataRepo } from '@/lib/data-service';
import { VehicleDetailReport, ExpenseWithDetails, VehicleTravelHistoryTrip } from '@/types/models';
import { Vehicle, ExpenseType, ClientCompany, VehicleType, Driver, TripLocation } from '@/types/database';
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
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Layers,
  MapPin,
  Clock,
  User,
  FileSpreadsheet,
} from 'lucide-react';
import { triggerExcelDownload } from '@/lib/utils/download-excel';

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
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);

  // Edit Vehicle Details Modal
  const [isEditVehicleOpen, setIsEditVehicleOpen] = useState(false);
  const [editRegNo, setEditRegNo] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editCompanyId, setEditCompanyId] = useState('');
  const [editCompany, setEditCompany] = useState<ClientCompany>('Delhivery');
  const [editRouteLocation, setEditRouteLocation] = useState('');
  const [editType, setEditType] = useState<VehicleType>('truck');
  const [editInitialKm, setEditInitialKm] = useState('');
  const [editOdo, setEditOdo] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [isSubmittingVehicle, setIsSubmittingVehicle] = useState(false);
  const [vehicleEditError, setVehicleEditError] = useState<string | null>(null);

  // Edit Monthly Income Modal
  const [isEditIncomeOpen, setIsEditIncomeOpen] = useState(false);
  const [incomeAmountInput, setIncomeAmountInput] = useState('');
  const [isSubmittingIncome, setIsSubmittingIncome] = useState(false);

  // Add / Edit Expense Modal (Owner Correction & Add on behalf of driver)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expDriverId, setExpDriverId] = useState('');
  const [expType, setExpType] = useState<ExpenseType>('Fuel');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState('2026-10-18');
  const [expLitres, setExpLitres] = useState('');
  const [expNote, setExpNote] = useState('');
  const [expError, setExpError] = useState<string | null>(null);
  const [isSubmittingExp, setIsSubmittingExp] = useState(false);

  // Trip Edit Modal
  const [editingTrip, setEditingTrip] = useState<VehicleTravelHistoryTrip | null>(null);
  const [tripDriverId, setTripDriverId] = useState('');
  const [tripStartPlace, setTripStartPlace] = useState('');
  const [tripEndPlace, setTripEndPlace] = useState('');
  const [tripStartOdo, setTripStartOdo] = useState('');
  const [tripEndOdo, setTripEndOdo] = useState('');
  const [tripStartTime, setTripStartTime] = useState('');
  const [tripEndTime, setTripEndTime] = useState('');
  const [tripNotes, setTripNotes] = useState('');
  const [tripError, setTripError] = useState<string | null>(null);
  const [isSubmittingTrip, setIsSubmittingTrip] = useState(false);

  // Add Missed Trip Modal
  const [isAddTripOpen, setIsAddTripOpen] = useState(false);
  const [addTripDriverId, setAddTripDriverId] = useState('');
  const [addTripStartPlace, setAddTripStartPlace] = useState('Calicut Hub');
  const [addTripEndPlace, setAddTripEndPlace] = useState('Kochi Terminal');
  const [addTripDate, setAddTripDate] = useState('2026-10-18');
  const [addTripStartTime, setAddTripStartTime] = useState('08:00');
  const [addTripEndTime, setAddTripEndTime] = useState('18:00');
  const [addTripStartKm, setAddTripStartKm] = useState('');
  const [addTripEndKm, setAddTripEndKm] = useState('');
  const [addTripNotes, setAddTripNotes] = useState('');
  const [addTripError, setAddTripError] = useState<string | null>(null);
  const [isSubmittingAddTrip, setIsSubmittingAddTrip] = useState(false);

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

  const showSavedNotice = (msg: string) => {
    setSavedMessage(msg);
    setTimeout(() => setSavedMessage(null), 3500);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [data, drvList, compList] = await Promise.all([
        dataRepo.getVehicleDetail(effectiveQuery, selectedMonth),
        dataRepo.getDrivers(),
        dataRepo.getCompanies(),
      ]);

      setReport(data);
      setDrivers(drvList);
      setCompanies(compList);

      if (data) {
        setEditRegNo(data.vehicle.registration_number);
        setEditModel(data.vehicle.make_model);
        setEditCompanyId(data.vehicle.company_id || compList[0]?.id || '');
        setEditCompany((data.vehicle.company as ClientCompany) || 'Delhivery');
        setEditRouteLocation(data.vehicle.route_location || '');
        setEditType(data.vehicle.vehicle_type);
        setEditInitialKm(String(data.vehicle.initial_km ?? data.vehicle.current_odometer));
        setEditOdo(String(data.vehicle.current_odometer));
        setEditIsActive(data.vehicle.is_active !== false && data.vehicle.status !== 'inactive');
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
    const unsub = dataRepo.subscribe(loadData);
    const interval = setInterval(loadData, 3000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [effectiveQuery, selectedMonth]);

  const handleOpenEditVehicle = () => {
    if (report) {
      setEditRegNo(report.vehicle.registration_number);
      setEditModel(report.vehicle.make_model);
      setEditCompanyId(report.vehicle.company_id || companies[0]?.id || '');
      setEditCompany((report.vehicle.company as ClientCompany) || 'Delhivery');
      setEditRouteLocation(report.vehicle.route_location || '');
      setEditType(report.vehicle.vehicle_type);
      setEditInitialKm(String(report.vehicle.initial_km ?? report.vehicle.current_odometer));
      setEditOdo(String(report.vehicle.current_odometer));
      setEditIsActive(report.vehicle.is_active !== false && report.vehicle.status !== 'inactive');
      setVehicleEditError(null);
      setIsEditVehicleOpen(true);
    }
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report) return;
    setVehicleEditError(null);
    setIsSubmittingVehicle(true);
    try {
      const selectedComp = companies.find((c) => c.id === editCompanyId);
      await dataRepo.updateVehicle(report.vehicle.id, {
        registration_number: editRegNo.trim().toUpperCase(),
        make_model: editModel.trim(),
        company_id: editCompanyId || undefined,
        company: selectedComp?.name || editCompany,
        route_location: editRouteLocation.trim() || undefined,
        vehicle_type: editType,
        initial_km: parseFloat(editInitialKm) || undefined,
        current_odometer: parseFloat(editOdo) || report.vehicle.current_odometer,
        is_active: editIsActive,
      });
      setIsEditVehicleOpen(false);
      showSavedNotice('Vehicle details saved successfully!');
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
    if (confirm(`Archive vehicle "${report.vehicle.registration_number}"? Past trips and expense history will be preserved.`)) {
      await dataRepo.archiveVehicle(report.vehicle.id);
      showSavedNotice('Vehicle archived. Past trips preserved.');
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
      showSavedNotice('Monthly income saved!');
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
    setExpDriverId(drivers[0]?.id || 'drv-shameem');
    setExpType('Fuel');
    setExpAmount('');
    setExpDate(`${selectedMonth}-18`);
    setExpLitres('');
    setExpNote('');
    setExpError(null);
    setIsExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (exp: ExpenseWithDetails) => {
    setEditingExpenseId(exp.id);
    setExpDriverId(exp.driver_id || drivers[0]?.id || '');
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
        showSavedNotice('Expense updated and saved!');
      } else {
        await dataRepo.createExpense({
          vehicle_id: report.vehicle.id,
          driver_id: expDriverId || drivers[0]?.id || 'drv-shameem',
          expense_type: expType,
          amount: amt,
          date: expDate,
          litres: expType === 'Fuel' ? parseFloat(expLitres) || null : null,
          note: expNote.trim() || null,
          isOwner: true,
        });
        showSavedNotice('Expense logged on behalf of driver!');
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
      showSavedNotice('Expense deleted successfully!');
      await loadData();
      if (onVehicleUpdated) onVehicleUpdated();
    }
  };

  const handleDownloadExcel = async () => {
    if (!report) return;
    setIsDownloadingExcel(true);
    try {
      await triggerExcelDownload('vehicle', report, selectedMonth);
      showSavedNotice('Excel file downloaded successfully!');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to download Excel file');
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  // Trip Edit Handlers
  const handleOpenEditTrip = (trip: VehicleTravelHistoryTrip) => {
    setEditingTrip(trip);
    setTripDriverId(trip.driverId || drivers[0]?.id || '');
    setTripStartPlace(trip.startPlace || 'Calicut Hub');
    setTripEndPlace(trip.endPlace || 'Kochi Terminal');
    setTripStartOdo(trip.startOdometer !== null ? String(trip.startOdometer) : '');
    setTripEndOdo(trip.endOdometer !== null ? String(trip.endOdometer) : '');
    setTripStartTime(trip.startTime ? trip.startTime.slice(0, 16) : '');
    setTripEndTime(trip.endTime ? trip.endTime.slice(0, 16) : '');
    setTripNotes(trip.notes || '');
    setTripError(null);
  };

  const handleSaveTripCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrip) return;
    const startNum = parseFloat(tripStartOdo);
    const endNum = parseFloat(tripEndOdo);

    if (isNaN(startNum) || startNum < 0) {
      setTripError('Please enter a valid Start KM');
      return;
    }
    if (isNaN(endNum) || endNum < startNum) {
      setTripError('End KM must be greater than or equal to Start KM');
      return;
    }

    setIsSubmittingTrip(true);
    try {
      await dataRepo.updateTrip(editingTrip.tripId, {
        driver_id: tripDriverId || undefined,
        start_place: tripStartPlace.trim() || undefined,
        end_place: tripEndPlace.trim() || undefined,
        start_odometer: startNum,
        end_odometer: endNum,
        start_time: tripStartTime || undefined,
        end_time: tripEndTime || undefined,
        driver_notes: tripNotes.trim() || null,
      });
      setEditingTrip(null);
      showSavedNotice('Trip entry corrected and saved!');
      await loadData();
      if (onVehicleUpdated) onVehicleUpdated();
    } catch (err: unknown) {
      setTripError(err instanceof Error ? err.message : 'Failed to correct trip');
    } finally {
      setIsSubmittingTrip(false);
    }
  };

  const handleOpenAddMissedTrip = () => {
    setAddTripDriverId(drivers[0]?.id || '');
    setAddTripStartPlace('Calicut Logistics Central');
    setAddTripEndPlace('Kochi Terminal');
    setAddTripDate(`${selectedMonth}-18`);
    setAddTripStartTime('08:00');
    setAddTripEndTime('18:00');
    setAddTripStartKm(String(report?.vehicle.current_odometer || '12000'));
    setAddTripEndKm(String((report?.vehicle.current_odometer || 12000) + 120));
    setAddTripNotes('Manual entry by owner');
    setAddTripError(null);
    setIsAddTripOpen(true);
  };

  const handleSaveAddMissedTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report) return;
    if (!addTripDriverId) {
      setAddTripError('Please select a driver');
      return;
    }
    const startNum = parseFloat(addTripStartKm);
    const endNum = parseFloat(addTripEndKm);

    if (isNaN(startNum) || startNum < 0) {
      setAddTripError('Please enter a valid Starting KM');
      return;
    }
    if (isNaN(endNum) || endNum <= startNum) {
      setAddTripError('Ending KM must be strictly greater than Starting KM');
      return;
    }

    setIsSubmittingAddTrip(true);
    try {
      const startDateTime = `${addTripDate}T${addTripStartTime}:00`;
      const endDateTime = `${addTripDate}T${addTripEndTime}:00`;

      await dataRepo.addManualTrip({
        driver_id: addTripDriverId,
        vehicle_id: report.vehicle.id,
        start_odometer: startNum,
        end_odometer: endNum,
        start_time: startDateTime,
        end_time: endDateTime,
        route_name: addTripStartPlace.trim(),
        destination: addTripEndPlace.trim(),
        driver_notes: addTripNotes.trim() || 'Added manually by owner',
      });
      setIsAddTripOpen(false);
      showSavedNotice('Missed trip saved successfully!');
      await loadData();
      if (onVehicleUpdated) onVehicleUpdated();
    } catch (err: unknown) {
      setAddTripError(err instanceof Error ? err.message : 'Failed to add missed trip');
    } finally {
      setIsSubmittingAddTrip(false);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (confirm('Delete this trip entry?')) {
      await dataRepo.deleteTrip(tripId);
      showSavedNotice('Trip deleted successfully!');
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

        <div className="flex items-center gap-1.5">
          {/* Download Excel Button */}
          <button
            type="button"
            onClick={handleDownloadExcel}
            disabled={isDownloadingExcel}
            className="h-11 px-3 sm:px-3.5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex items-center gap-1.5 text-xs font-bold text-gray-800 hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
            title="Download Excel report for this month"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="hidden sm:inline">{isDownloadingExcel ? 'Exporting...' : 'Download Excel'}</span>
          </button>

          {/* Edit Vehicle Header Action */}
          <button
            type="button"
            onClick={handleOpenEditVehicle}
            className="w-11 h-11 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex items-center justify-center text-gray-800 hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
            aria-label="Edit vehicle"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Saved Notification Banner */}
      {savedMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-800 font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{savedMessage}</span>
        </div>
      )}

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
                vehicle.is_active !== false && vehicle.status === 'active'
                  ? 'bg-[#D4F65B] text-black'
                  : vehicle.status === 'maintenance'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {vehicle.is_active !== false && vehicle.status === 'active'
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

      {/* Travel History for Selected Month (Trip List with Full Edit Control) */}
      <div className="bg-white rounded-[28px] p-5 border border-gray-100 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-[#121316] uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#8BE234]" />
              <span>Travel History ({report.travelHistory?.length || 0})</span>
            </h2>
            <p className="text-[11px] text-gray-400">
              Trip logs for {selectedMonth} • Edit or add missed trips
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddMissedTrip}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#121316] text-white text-xs font-bold hover:bg-black transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#D4F65B]" />
            <span>Add Missed Trip</span>
          </button>
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
                {/* Header row: Date, Driver, Status, Actions */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
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
                    {trip.edited_by_owner_at && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        edited by owner • {new Date(trip.edited_by_owner_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMapTrip({
                          ...trip,
                          vehicleRegistration: vehicle.registration_number,
                        });
                        setIsMapOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold transition-all cursor-pointer"
                    >
                      <MapPin className="w-3 h-3 text-[#121316]" />
                      <span>View on map</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditTrip(trip)}
                      className="p-1.5 rounded-xl text-gray-500 hover:text-black hover:bg-white transition-colors cursor-pointer"
                      title="Edit trip"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTrip(trip.tripId)}
                      className="p-1.5 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-white transition-colors cursor-pointer"
                      title="Delete trip"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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

                {trip.notes && (
                  <p className="text-[11px] text-gray-500 italic bg-white p-2 rounded-xl">
                    &quot;{trip.notes}&quot;
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expense List with date, driver, type, amount, note + edit & delete */}
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={isDownloadingExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-[#121316] text-xs font-bold hover:bg-gray-50 transition-colors cursor-pointer shadow-2xs"
              title="Download Excel (.xlsx) for this month"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isDownloadingExcel ? 'Downloading...' : 'Download Excel'}</span>
            </button>
            <button
              type="button"
              onClick={handleOpenAddExpense}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#121316] text-white text-xs font-bold hover:bg-black transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#D4F65B]" />
              <span>Add Expense</span>
            </button>
          </div>
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
                    {entry.edited_by_owner_at && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        edited by owner • {new Date(entry.edited_by_owner_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
              Contract revenue/rent earned by <strong>{vehicle.registration_number}</strong> for {selectedMonth}.
            </p>

            <form onSubmit={handleSaveIncome} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Monthly Income (₹)
                </label>
                <input
                  type="number"
                  step="100"
                  value={incomeAmountInput}
                  onChange={(e) => setIncomeAmountInput(e.target.value)}
                  className="w-full h-12 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-base font-black text-[#121316] focus:outline-none focus:border-gray-400"
                  required
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
                  {isSubmittingIncome ? 'Saving...' : 'Save Income'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Vehicle Details Modal (Number, Type, Company, Initial KM, Active/Inactive) */}
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

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Vehicle Type
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as VehicleType)}
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                  >
                    <option value="truck">Truck</option>
                    <option value="van">Van</option>
                    <option value="trailer">Trailer</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Client Company
                  </label>
                  <select
                    value={editCompanyId}
                    onChange={(e) => setEditCompanyId(e.target.value)}
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Initial KM
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={editInitialKm}
                    onChange={(e) => setEditInitialKm(e.target.value)}
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-mono text-[#121316] focus:outline-none focus:border-gray-400"
                    placeholder="0"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Current Odo (KM)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={editOdo}
                    onChange={(e) => setEditOdo(e.target.value)}
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-mono text-[#121316] focus:outline-none focus:border-gray-400"
                    required
                  />
                </div>
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

              <div className="space-y-1 pt-1">
                <label className="text-xs font-bold text-gray-700 uppercase block">
                  Status
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                    <input
                      type="radio"
                      checked={editIsActive}
                      onChange={() => setEditIsActive(true)}
                    />
                    <span>Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-500">
                    <input
                      type="radio"
                      checked={!editIsActive}
                      onChange={() => setEditIsActive(false)}
                    />
                    <span>Inactive</span>
                  </label>
                </div>
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

      {/* Add / Correct Expense Modal (with Driver Selection) */}
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
              {!editingExpenseId && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    On Behalf of Driver
                  </label>
                  <select
                    value={expDriverId}
                    onChange={(e) => setExpDriverId(e.target.value)}
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400 cursor-pointer"
                    required
                  >
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.full_name} ({d.phone})
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                  Note
                </label>
                <input
                  type="text"
                  value={expNote}
                  onChange={(e) => setExpNote(e.target.value)}
                  placeholder="Optional expense note"
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
                  {isSubmittingExp ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Trip Modal (Owner Full Control: Driver, Route, KM, Time, Notes) */}
      {editingTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-[32px] p-6 max-w-sm w-full space-y-4 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#121316]">
                Edit Trip Entry
              </h3>
              <button
                type="button"
                onClick={() => setEditingTrip(null)}
                className="p-1 rounded-full text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {tripError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{tripError}</span>
              </div>
            )}

            <form onSubmit={handleSaveTripCorrection} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Driver
                </label>
                <select
                  value={tripDriverId}
                  onChange={(e) => setTripDriverId(e.target.value)}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400 cursor-pointer"
                >
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.full_name} ({d.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Start Place
                  </label>
                  <input
                    type="text"
                    value={tripStartPlace}
                    onChange={(e) => setTripStartPlace(e.target.value)}
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                    placeholder="Origin"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    End Place
                  </label>
                  <input
                    type="text"
                    value={tripEndPlace}
                    onChange={(e) => setTripEndPlace(e.target.value)}
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                    placeholder="Destination"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Start KM
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={tripStartOdo}
                    onChange={(e) => setTripStartOdo(e.target.value)}
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    End KM
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={tripEndOdo}
                    onChange={(e) => setTripEndOdo(e.target.value)}
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Start Time
                  </label>
                  <input
                    type="text"
                    value={tripStartTime}
                    onChange={(e) => setTripStartTime(e.target.value)}
                    placeholder="YYYY-MM-DDTHH:MM"
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-mono text-[#121316] focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    End Time
                  </label>
                  <input
                    type="text"
                    value={tripEndTime}
                    onChange={(e) => setTripEndTime(e.target.value)}
                    placeholder="YYYY-MM-DDTHH:MM"
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-mono text-[#121316] focus:outline-none focus:border-gray-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Notes
                </label>
                <input
                  type="text"
                  value={tripNotes}
                  onChange={(e) => setTripNotes(e.target.value)}
                  placeholder="Optional trip notes"
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm text-[#121316] focus:outline-none focus:border-gray-400"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTrip(null)}
                  className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTrip}
                  className="flex-1 h-11 rounded-xl bg-[#121316] text-white font-bold text-xs hover:bg-black cursor-pointer"
                >
                  {isSubmittingTrip ? 'Saving...' : 'Save Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Missed Trip Modal */}
      {isAddTripOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-[32px] p-6 max-w-sm w-full space-y-4 shadow-2xl border border-gray-100 animate-in fade-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#121316]">
                Add Missed Trip Manually
              </h3>
              <button
                type="button"
                onClick={() => setIsAddTripOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Add a past trip for <strong>{vehicle.registration_number}</strong>.
            </p>

            {addTripError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{addTripError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAddMissedTrip} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Driver
                </label>
                <select
                  value={addTripDriverId}
                  onChange={(e) => setAddTripDriverId(e.target.value)}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400 cursor-pointer"
                  required
                >
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.full_name} ({d.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Start Place
                  </label>
                  <input
                    type="text"
                    value={addTripStartPlace}
                    onChange={(e) => setAddTripStartPlace(e.target.value)}
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    End Place
                  </label>
                  <input
                    type="text"
                    value={addTripEndPlace}
                    onChange={(e) => setAddTripEndPlace(e.target.value)}
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Date
                  </label>
                  <input
                    type="date"
                    value={addTripDate}
                    onChange={(e) => setAddTripDate(e.target.value)}
                    className="w-full h-11 px-2 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Start
                  </label>
                  <input
                    type="time"
                    value={addTripStartTime}
                    onChange={(e) => setAddTripStartTime(e.target.value)}
                    className="w-full h-11 px-2 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    End
                  </label>
                  <input
                    type="time"
                    value={addTripEndTime}
                    onChange={(e) => setAddTripEndTime(e.target.value)}
                    className="w-full h-11 px-2 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Start KM
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={addTripStartKm}
                    onChange={(e) => setAddTripStartKm(e.target.value)}
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    End KM
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={addTripEndKm}
                    onChange={(e) => setAddTripEndKm(e.target.value)}
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Notes
                </label>
                <input
                  type="text"
                  value={addTripNotes}
                  onChange={(e) => setAddTripNotes(e.target.value)}
                  placeholder="Optional trip notes"
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm text-[#121316] focus:outline-none focus:border-gray-400"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddTripOpen(false)}
                  className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAddTrip}
                  className="flex-1 h-11 rounded-xl bg-[#121316] text-white font-bold text-xs hover:bg-black cursor-pointer"
                >
                  {isSubmittingAddTrip ? 'Saving...' : 'Add Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Map Modal */}
      {isMapOpen && selectedMapTrip && (
        <TripMapModal
          isOpen={isMapOpen}
          onClose={() => setIsMapOpen(false)}
          tripInfo={selectedMapTrip}
        />
      )}
    </div>
  );
}
