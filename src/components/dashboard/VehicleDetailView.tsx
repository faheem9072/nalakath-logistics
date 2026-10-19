'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { dataRepo } from '@/lib/data-service';
import { VehicleDetailReport } from '@/types/models';
import { Vehicle, ExpenseType } from '@/types/database';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  Search,
  Truck,
  Calendar,
  Users,
  Fuel,
  Receipt,
  Wrench,
  IndianRupee,
  Plus,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Clock,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface VehicleDetailViewProps {
  initialVehicleQuery?: string;
  initialMonth?: string;
  onBack?: () => void;
  showBackBtn?: boolean;
}

export function VehicleDetailView({
  initialVehicleQuery = '3057',
  initialMonth,
  onBack,
  showBackBtn = false,
}: VehicleDetailViewProps) {
  const { lang, t } = useLanguage();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [searchQuery, setSearchQuery] = useState(initialVehicleQuery);
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth || '2026-10');
  const [report, setReport] = useState<VehicleDetailReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [companyFilter, setCompanyFilter] = useState<'All' | 'Delhivery' | 'Shadowfax'>('All');

  // Add Expense Modal inside Vehicle Detail
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [expType, setExpType] = useState<ExpenseType>('Fuel');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState('2026-10-18');
  const [expLitres, setExpLitres] = useState('');
  const [expNote, setExpNote] = useState('');
  const [expPhotoUrl, setExpPhotoUrl] = useState<string | null>(null);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  useEffect(() => {
    dataRepo.getVehicles().then(setVehicles);
  }, []);

  const loadDetail = async (q: string, month: string) => {
    setIsLoading(true);
    try {
      const data = await dataRepo.getVehicleDetail(q, month);
      setReport(data);
    } catch (err) {
      console.error('Failed to load vehicle detail:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim()) {
      loadDetail(searchQuery.trim(), selectedMonth);
    }
  }, [searchQuery, selectedMonth]);

  const handleSelectVehicle = (reg: string) => {
    setSearchQuery(reg);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report || !expAmount) return;
    setIsSubmittingExpense(true);
    try {
      // Find a driver for this vehicle or use current user
      const driverId =
        report.driversWhoDrove[0]?.driverId ||
        report.vehicle.default_driver_ids?.[0] ||
        'drv-refnise';

      await dataRepo.createExpense({
        vehicle_id: report.vehicle.id,
        driver_id: driverId,
        expense_type: expType,
        amount: parseFloat(expAmount) || 0,
        date: expDate,
        litres: expType === 'Fuel' ? parseFloat(expLitres) || null : null,
        note: expNote.trim() || null,
        bill_photo_url: expPhotoUrl,
      });

      setIsAddExpenseOpen(false);
      setExpAmount('');
      setExpLitres('');
      setExpNote('');
      setExpPhotoUrl(null);
      // Reload vehicle report
      loadDetail(report.vehicle.registration_number, selectedMonth);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  const filteredVehiclesList = vehicles.filter((v) => {
    if (companyFilter !== 'All' && v.company !== companyFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Search & Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {showBackBtn && onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Go Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <span>{t('vehicleDetailTitle')}</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {t('vehicleDetailSubtitle')}
              </p>
            </div>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 self-start md:self-auto">
            <Calendar className="w-4 h-4 text-blue-600 ml-1.5" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {t('monthSelectorLabel')}:
            </span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-bold font-mono text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
            >
              <option value="2026-10">October 2026 (Current Demo Month)</option>
              <option value="2026-09">September 2026</option>
              <option value="2026-08">August 2026</option>
              <option value="2026-07">July 2026</option>
            </select>
          </div>
        </div>

        {/* Search input with partial match hint */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Type vehicle number (partial match, e.g. '3057', '2266', '3443', '5682')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-24 py-2.5 text-sm sm:text-base font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
          />
          {searchQuery && (
            <span className="absolute right-3.5 top-3 text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              Live Search
            </span>
          )}
        </div>

        {/* Company Filter Tabs & Quick Vehicle Buttons */}
        <div className="space-y-2 pt-1 border-t border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                {t('companyLabel')}:
              </span>
              {(['All', 'Delhivery', 'Shadowfax'] as const).map((comp) => (
                <button
                  key={comp}
                  onClick={() => setCompanyFilter(comp)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    companyFilter === comp
                      ? comp === 'Delhivery'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : comp === 'Shadowfax'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {comp}
                </button>
              ))}
            </div>

            <span className="text-[11px] text-slate-400 font-mono">
              Click any vehicle below to inspect
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {filteredVehiclesList.map((v) => {
              const isSelected =
                report?.vehicle.id === v.id ||
                v.registration_number.toLowerCase().includes(searchQuery.toLowerCase().trim());
              const isDelhivery = v.company === 'Delhivery';

              return (
                <button
                  key={v.id}
                  onClick={() => handleSelectVehicle(v.registration_number)}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 border active:scale-95 ${
                    isSelected
                      ? isDelhivery
                        ? 'bg-rose-50 text-rose-900 border-rose-300 ring-2 ring-rose-500/20'
                        : 'bg-amber-50 text-amber-900 border-amber-300 ring-2 ring-amber-500/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isDelhivery ? 'bg-rose-500' : 'bg-amber-500'
                    }`}
                  />
                  <span>{v.registration_number}</span>
                  {v.is_adhoc && (
                    <span className="text-[9px] bg-slate-200 text-slate-700 px-1 rounded font-sans">
                      Ad-hoc
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="py-20 text-center text-sm text-slate-400 animate-pulse bg-white rounded-2xl border border-slate-200">
          Loading vehicle operations, driver logs, and audited expenses...
        </div>
      ) : !report ? (
        <Card className="border-slate-200">
          <CardContent className="p-12 text-center space-y-3">
            <Truck className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">
              No vehicle found matching &quot;{searchQuery}&quot;
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Please enter a valid partial or full vehicle registration (e.g. 3057, 2266, 3443, 5682).
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Main Vehicle Profile Card */}
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-800">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Company Badge */}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black tracking-wide uppercase flex items-center gap-1.5 border ${
                      report.company === 'Delhivery'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                    <span>Company: {report.company}</span>
                  </span>

                  {report.vehicle.is_adhoc ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Ad-hoc (Rotating Drivers)
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Fixed Route Dedicated
                    </span>
                  )}

                  <StatusBadge status={report.vehicle.status} size="sm" />
                </div>

                <div className="text-2xl sm:text-3xl font-black font-mono tracking-wider text-white">
                  {report.vehicle.registration_number}
                </div>
                <div className="text-sm font-semibold text-slate-300">
                  {report.vehicle.make_model} •{' '}
                  <span className="capitalize">{report.vehicle.vehicle_type}</span> ({report.vehicle.capacity} Seats/Ton)
                </div>
              </div>

              {/* Vehicle Stat Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Current Odometer
                  </span>
                  <span className="text-base font-black font-mono text-emerald-400 block">
                    {report.vehicle.current_odometer.toLocaleString()} km
                  </span>
                </div>

                <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Days Run ({selectedMonth.slice(5)})
                  </span>
                  <span className="text-base font-black font-mono text-blue-300 block">
                    {report.totalDaysOperated} days
                  </span>
                </div>

                <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Distance ({selectedMonth.slice(5)})
                  </span>
                  <span className="text-base font-black font-mono text-white block">
                    {report.totalMonthKm.toLocaleString()} km
                  </span>
                </div>

                <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Total Expense
                  </span>
                  <span className="text-base font-black font-mono text-amber-300 block">
                    ₹{report.expenses.totals.grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Metadata Bar */}
            <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                    {t('routeLocation')}
                  </span>
                  <span className="font-bold text-white">{report.routeLocation}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                    {t('defaultDrivers')}
                  </span>
                  <span className="font-bold text-white">{report.defaultDrivers}</span>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <Button
                  size="sm"
                  variant="primary"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                  onClick={() => setIsAddExpenseOpen(true)}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  {t('addExpenseBtn')}
                </Button>
              </div>
            </div>
          </div>

          {/* Section 1: ALL Drivers Who Drove This Vehicle This Month */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm sm:text-base">
                    {t('driversWhoDroveThisMonth')} ({selectedMonth})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Audited list of drivers, duty days, completed trips, and total km recorded
                  </p>
                </div>
              </div>

              <span className="text-xs font-mono font-bold bg-white px-3 py-1 rounded-lg border border-slate-200 text-slate-700 self-start sm:self-auto">
                {report.totalDriversCount} driver{report.totalDriversCount === 1 ? '' : 's'} logged
              </span>
            </div>

            {report.driversWhoDrove.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                {t('noDriversDroveThisMonth')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                    <tr>
                      <th className="px-5 py-3">Driver Name</th>
                      <th className="px-5 py-3">Employee Code</th>
                      <th className="px-5 py-3">Days Operated</th>
                      <th className="px-5 py-3">Trips Count</th>
                      <th className="px-5 py-3">Distance (KM)</th>
                      <th className="px-5 py-3 text-right">Dates on Duty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {report.driversWhoDrove.map((d) => (
                      <tr key={d.driverId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-600" />
                            <span>{d.driverName}</span>
                          </div>
                          <span className="text-[11px] font-mono font-normal text-slate-400 pl-4">
                            {d.driverPhone}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-600">
                          {d.employeeCode}
                        </td>
                        <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                          {d.daysCount} days
                        </td>
                        <td className="px-5 py-3.5 font-mono text-slate-700">
                          {d.tripsCount} trips
                        </td>
                        <td className="px-5 py-3.5 font-mono font-black text-emerald-600">
                          {d.totalKm.toLocaleString()} km
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex flex-wrap justify-end gap-1 max-w-xs ml-auto">
                            {d.dates.map((dt) => (
                              <span
                                key={dt}
                                className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono font-semibold"
                              >
                                {dt.slice(8)}th
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Expenses for the Month */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm sm:text-base">
                    {t('expensesThisMonth')} ({selectedMonth})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Breakdown of Fuel, Toll, Maintenance, and Other operational expenses
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAddExpenseOpen(true)}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                className="text-xs font-bold"
              >
                {t('addExpenseBtn')}
              </Button>
            </div>

            {/* Expense Totals Cards */}
            <div className="p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-5 gap-3 border-b border-slate-100 bg-white">
              {/* Fuel */}
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-1.5 text-blue-700 text-xs font-bold uppercase tracking-wider mb-1">
                  <Fuel className="w-3.5 h-3.5" />
                  <span>{t('fuel')}</span>
                </div>
                <div className="text-lg font-black font-mono text-slate-900">
                  ₹{report.expenses.totals.fuel.toLocaleString()}
                </div>
                {report.expenses.totals.fuelLitres > 0 && (
                  <span className="text-[11px] font-mono text-blue-700 font-semibold block">
                    {report.expenses.totals.fuelLitres} Litres
                  </span>
                )}
              </div>

              {/* Toll */}
              <div className="p-3.5 bg-purple-50/80 border border-purple-200 rounded-xl">
                <div className="flex items-center gap-1.5 text-purple-700 text-xs font-bold uppercase tracking-wider mb-1">
                  <Receipt className="w-3.5 h-3.5" />
                  <span>{t('toll')}</span>
                </div>
                <div className="text-lg font-black font-mono text-slate-900">
                  ₹{report.expenses.totals.toll.toLocaleString()}
                </div>
                <span className="text-[11px] text-purple-600 block">Fastag & plazas</span>
              </div>

              {/* Maintenance */}
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl">
                <div className="flex items-center gap-1.5 text-amber-700 text-xs font-bold uppercase tracking-wider mb-1">
                  <Wrench className="w-3.5 h-3.5" />
                  <span>{t('maintenance')}</span>
                </div>
                <div className="text-lg font-black font-mono text-slate-900">
                  ₹{report.expenses.totals.maintenance.toLocaleString()}
                </div>
                <span className="text-[11px] text-amber-700 block">Repairs & service</span>
              </div>

              {/* Other */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-1.5 text-slate-600 text-xs font-bold uppercase tracking-wider mb-1">
                  <IndianRupee className="w-3.5 h-3.5" />
                  <span>{t('other')}</span>
                </div>
                <div className="text-lg font-black font-mono text-slate-900">
                  ₹{report.expenses.totals.other.toLocaleString()}
                </div>
                <span className="text-[11px] text-slate-500 block">Miscellaneous</span>
              </div>

              {/* Grand Total */}
              <div className="col-span-2 sm:col-span-1 p-3.5 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-xl shadow-xs">
                <div className="text-[10px] font-black uppercase tracking-wider text-emerald-100 mb-1">
                  {t('grandTotal')}
                </div>
                <div className="text-xl font-black font-mono">
                  ₹{report.expenses.totals.grandTotal.toLocaleString()}
                </div>
                <span className="text-[10px] text-emerald-100 font-medium block">
                  {report.expenses.entries.length} entries this month
                </span>
              </div>
            </div>

            {/* Expense Entries Table */}
            {report.expenses.entries.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                {t('noExpensesThisMonth')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                    <tr>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Driver Who Entered</th>
                      <th className="px-5 py-3">Expense Type</th>
                      <th className="px-5 py-3">Amount (INR)</th>
                      <th className="px-5 py-3">Details / Litres</th>
                      <th className="px-5 py-3">Note</th>
                      <th className="px-5 py-3 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {report.expenses.entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                          {entry.date}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-slate-800">
                          {entry.driver?.full_name || 'Driver'}
                          {entry.driver?.employee_code && (
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {entry.driver.employee_code}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              entry.expense_type === 'Fuel'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : entry.expense_type === 'Toll'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : entry.expense_type === 'Maintenance'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-800 border border-slate-200'
                            }`}
                          >
                            {entry.expense_type}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono font-black text-slate-900 text-base">
                          ₹{entry.amount.toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-600">
                          {entry.litres ? `${entry.litres} L` : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-600 max-w-xs">
                          {entry.note || '—'}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {entry.bill_photo_url ? (
                            <button
                              onClick={() => setPreviewPhoto(entry.bill_photo_url || null)}
                              className="text-xs text-blue-600 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">None</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      <Modal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        title={t('addExpenseBtn')}
        description={`Record verified fuel, toll, or maintenance expense for ${report?.vehicle.registration_number}`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveExpense} className="space-y-4">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Target Vehicle
              </span>
              <span className="font-mono font-black text-slate-900 text-sm">
                {report?.vehicle.registration_number}
              </span>
            </div>
            <span className="text-xs font-bold text-slate-600">
              Company: {report?.vehicle.company || 'Delhivery'}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Expense Type
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['Fuel', 'Toll', 'Maintenance', 'Other'] as const).map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setExpType(type)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    expType === type
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('amountLabel')}
              type="number"
              placeholder="e.g. 2400"
              value={expAmount}
              onChange={(e) => setExpAmount(e.target.value)}
              required
              autoFocus
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>
          </div>

          {expType === 'Fuel' && (
            <Input
              label={t('litresLabel')}
              type="number"
              step="0.1"
              placeholder="e.g. 24.5"
              value={expLitres}
              onChange={(e) => setExpLitres(e.target.value)}
            />
          )}

          <Input
            label="Note / Details (Optional)"
            placeholder="e.g. HPCL Pump Diesel or Tyre repair"
            value={expNote}
            onChange={(e) => setExpNote(e.target.value)}
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {t('billPhotoLabel')}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    setExpPhotoUrl(ev.target?.result as string);
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
            {expPhotoUrl && (
              <div className="mt-2 relative w-20 h-20 rounded-lg overflow-hidden border border-slate-300">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={expPhotoUrl} alt="Bill preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsAddExpenseOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmittingExpense}
              className="bg-emerald-600 hover:bg-emerald-700 font-bold"
            >
              Save Expense Entry
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bill Photo Preview Modal */}
      {previewPhoto && (
        <Modal
          isOpen={!!previewPhoto}
          onClose={() => setPreviewPhoto(null)}
          title="Bill / Receipt Verification"
          maxWidth="md"
        >
          <div className="p-2 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewPhoto}
              alt="Receipt"
              className="max-h-96 mx-auto rounded-xl object-contain border border-slate-200"
            />
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setPreviewPhoto(null)}
            >
              Close Preview
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
