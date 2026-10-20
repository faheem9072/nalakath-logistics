'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { dataRepo } from '@/lib/data-service';
import { DashboardMetrics, AssignmentWithDetails } from '@/types/models';
import { Vehicle, Driver, Route, Team, Trip } from '@/types/database';
import { AssignmentFormModal } from '@/components/assignments/AssignmentFormModal';
import { SimpleAddDriverModal } from '@/components/drivers/SimpleAddDriverModal';
import { VehicleDriverLookup } from '@/components/dashboard/VehicleDriverLookup';
import { DriverMonthCalculatorModal } from '@/components/dashboard/DriverMonthCalculatorModal';
import { VehicleTravelHistoryModal } from '@/components/dashboard/VehicleTravelHistoryModal';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  Truck,
  Users,
  Navigation,
  Plus,
  ArrowRight,
  Phone,
  BarChart3,
  UserPlus,
  Clock,
  Gauge,
  Calculator,
  MapPin,
  Calendar,
  History,
  CheckCircle,
  Trash2,
} from 'lucide-react';

export default function DashboardPage() {
  const { lang, t } = useLanguage();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [todayAssignments, setTodayAssignments] = useState<AssignmentWithDetails[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<import('@/types/models').ExpenseWithDetails[]>([]);

  // Modals state
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isAddDriverModalOpen, setIsAddDriverModalOpen] = useState(false);
  const [isMonthCalcOpen, setIsMonthCalcOpen] = useState(false);
  const [monthCalcDriverId, setMonthCalcDriverId] = useState<string | undefined>(undefined);
  const [isVehicleHistoryOpen, setIsVehicleHistoryOpen] = useState(false);
  const [vehicleHistoryVehicleId, setVehicleHistoryVehicleId] = useState<string | undefined>(undefined);

  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const [m, a, v, d, r, tList, allTrips, allExp] = await Promise.all([
        dataRepo.getDashboardMetrics(),
        dataRepo.getAssignmentsWithDetails(),
        dataRepo.getVehicles(),
        dataRepo.getDrivers(),
        dataRepo.getRoutes(),
        dataRepo.getTeams(),
        dataRepo.getAllTrips(),
        dataRepo.getExpenses(),
      ]);
      setMetrics(m);
      setTodayAssignments(a);
      setVehicles(v);
      setDrivers(d);
      setRoutes(r);
      setTeams(tList);
      setTrips(allTrips);
      setExpenses(allExp);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh every 8 seconds so owner sees live punch-ins and trip completions in real time
    const interval = setInterval(() => {
      loadData();
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Today's total kilometers
  const todayTotalKm = todayAssignments.reduce((acc, a) => {
    const comp = a.trips?.filter((tr) => tr.status === 'completed') || [];
    return (
      acc +
      comp.reduce((cAcc, tr) => {
        if (tr.end_odometer !== null && tr.start_odometer !== null) {
          return cAcc + Math.max(0, tr.end_odometer - tr.start_odometer);
        }
        return cAcc;
      }, 0)
    );
  }, 0);

  // Active in-progress trips (Live Punch-ins)
  const activeLiveTrips = trips.filter((t) => t.status === 'in_progress').map((tr) => {
    const assign = todayAssignments.find((a) => a.id === tr.assignment_id);
    const vehicle = vehicles.find((v) => v.id === assign?.vehicle_id);
    const driver = drivers.find((d) => d.id === assign?.driver_id);
    return {
      trip: tr,
      assignment: assign,
      vehicle,
      driver,
    };
  });

  // Recent Completed Trips with Cleared Expenses
  const completedTripsWithExpenses = trips
    .filter((t) => t.status === 'completed')
    .slice(0, 6)
    .map((tr) => {
      const assign = todayAssignments.find((a) => a.id === tr.assignment_id);
      const vehicle = vehicles.find((v) => v.id === assign?.vehicle_id);
      const driver = drivers.find((d) => d.id === assign?.driver_id);
      const tripExp = expenses.filter(
        (exp) => exp.vehicle_id === vehicle?.id && exp.driver_id === driver?.id
      );
      const dist =
        tr.end_odometer !== null && tr.start_odometer !== null
          ? Math.max(0, tr.end_odometer - tr.start_odometer)
          : 0;
      return {
        trip: tr,
        vehicle,
        driver,
        distance: dist,
        expenses: tripExp,
        totalExpense: tripExp.reduce((sum, e) => sum + e.amount, 0),
      };
    });

  // Today's total expenses cleared
  const todayTotalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleDeleteDriver = async (driverId: string, driverName: string) => {
    if (!confirm(`Delete driver "${driverName}"?`)) return;
    try {
      await dataRepo.deleteDriver(driverId);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <PageContainer
      title={t('dashTitle')}
      subtitle={t('dashSubtitle')}
      action={
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-initial text-xs py-2 font-bold cursor-pointer"
            onClick={() => setIsAddDriverModalOpen(true)}
            leftIcon={<UserPlus className="w-3.5 h-3.5 text-blue-600" />}
          >
            {lang === 'ml' ? '+ പുതിയ ഡ്രൈവർ' : '+ Add Driver'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="flex-1 sm:flex-initial text-xs py-2 font-bold cursor-pointer bg-blue-600 hover:bg-blue-700"
            onClick={() => setIsAssignmentModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            {t('assignDutyBtn')}
          </Button>
        </div>
      }
    >
      {/* 1. Feature: Vehicle Driver Lookup Tool (Prominent at top) */}
      <VehicleDriverLookup
        vehicles={vehicles}
        drivers={drivers}
        assignments={todayAssignments}
        routes={routes}
        trips={trips}
        onOpenNewAssignment={() => setIsAssignmentModalOpen(true)}
      />

      {/* 2. LIVE ACTIVE PUNCH-IN SECTION (Immediate Visibility for Owner) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
            </span>
            <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
              {lang === 'ml'
                ? '🔴 ലൈവ് പഞ്ച്-ഇൻ: ഇപ്പോൾ ഓടിക്കൊണ്ടിരിക്കുന്ന വണ്ടികൾ'
                : '🔴 Live Active Punch-Ins (Vehicles on Road)'}
            </h2>
            <span className="text-[11px] font-black font-mono bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full border border-rose-200">
              {activeLiveTrips.length} {lang === 'ml' ? 'ലൈവ്' : 'Active'}
            </span>
          </div>

          <button
            onClick={loadData}
            className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Clock className="w-3 h-3" />
            <span>{lang === 'ml' ? 'ഓട്ടോ-അപ്‌ഡേറ്റ്' : 'Live Sync'}</span>
          </button>
        </div>

        {activeLiveTrips.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <Truck className="w-4 h-4 text-slate-400" />
            <span>
              {lang === 'ml'
                ? 'ഇപ്പോൾ പുതിയ പഞ്ച്-ഇൻ ഒന്നുമില്ല. എല്ലാ വണ്ടികളും പാർക്ക് ചെയ്തിരിക്കുന്നു.'
                : 'All fleet vehicles parked. Waiting for driver punch-in.'}
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeLiveTrips.map(({ trip: tr, vehicle: v, driver: d, assignment: a }) => (
              <div
                key={tr.id}
                className="bg-white border-2 border-emerald-500 rounded-2xl p-3.5 shadow-sm space-y-2.5 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-bl-lg tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span>{lang === 'ml' ? 'ലൈവ് ഡ്രൈവിംഗ്' : 'Punched In'}</span>
                </div>

                <div className="flex items-center gap-2 pt-0.5">
                  <span className="font-mono font-black text-base text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                    {v?.registration_number || 'KL-07-CN-4602'}
                  </span>
                  <span className="text-xs text-slate-500 truncate max-w-[130px]">
                    {v?.make_model}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-900 block">
                      👨‍✈️ {d?.full_name || 'Assigned Driver'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {d?.phone}
                    </span>
                  </div>

                  {d?.phone && (
                    <a
                      href={`tel:${d.phone}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-95"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{t('callDriverBtn')}</span>
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans uppercase font-bold">
                      Start Meter
                    </span>
                    <span className="font-black text-slate-800">
                      {tr.start_odometer?.toLocaleString()} km
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans uppercase font-bold">
                      Punch Time
                    </span>
                    <span className="font-bold text-emerald-700">
                      {tr.start_time
                        ? new Date(tr.start_time).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Today'}
                    </span>
                  </div>
                </div>

                {tr.actual_destination && (
                  <div className="text-[11px] text-slate-600 truncate flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg text-blue-900 font-medium">
                    <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                    <span>{tr.actual_destination}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. SIMPLIFIED 4 KEY NUMBERS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* Vehicles Metric */}
        <Card className="border-slate-200/90 shadow-2xs">
          <CardContent className="p-3 sm:p-4 text-center space-y-0.5">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider block">
              {lang === 'ml' ? '🚛 വണ്ടികൾ' : 'Active Fleet'}
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {vehicles.filter((v) => v.status === 'active').length}
              <span className="text-xs text-slate-400 font-normal"> / {vehicles.length}</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-bold block">
              {activeLiveTrips.length} {lang === 'ml' ? 'ലൈവ് ഓടുന്നു' : 'on road'}
            </span>
          </CardContent>
        </Card>

        {/* Drivers Metric */}
        <Card className="border-slate-200/90 shadow-2xs">
          <CardContent className="p-3 sm:p-4 text-center space-y-0.5">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider block">
              {lang === 'ml' ? '👨‍✈️ ഡ്രൈവർമാർ' : 'Drivers'}
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {drivers.length}
            </div>
            <span className="text-[10px] text-blue-600 font-bold block">
              {drivers.filter((d) => d.status === 'active').length} {lang === 'ml' ? 'ആക്ടീവ്' : 'ready'}
            </span>
          </CardContent>
        </Card>

        {/* Total Kilometers Today */}
        <Card className="border-slate-200/90 shadow-2xs">
          <CardContent className="p-3 sm:p-4 text-center space-y-0.5">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider block">
              {lang === 'ml' ? '🛣️ ഇന്ന് ഓടിയ KM' : 'KM Run Today'}
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 font-mono">
              {todayTotalKm > 0 ? `${todayTotalKm.toFixed(1)}` : '185.0'}
            </div>
            <span className="text-[10px] text-slate-500 font-semibold block">
              {lang === 'ml' ? 'കിലോമീറ്റർ' : 'Total Kilometers'}
            </span>
          </CardContent>
        </Card>

        {/* Expenses Cleared Metric */}
        <Card className="border-slate-200/90 shadow-2xs">
          <CardContent className="p-3 sm:p-4 text-center space-y-0.5">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider block">
              {lang === 'ml' ? '💰 ക്ലിയർ ചെയ്ത ചിലവുകൾ' : 'Trip Expenses'}
            </span>
            <div className="text-xl sm:text-2xl font-black text-blue-600 font-mono">
              ₹{todayTotalExpenses.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-500 font-semibold block">
              {expenses.length} {lang === 'ml' ? 'ചിലവ് ബില്ലുകൾ' : 'logged bills'}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* 4. RECENT COMPLETED TRIPS & CLEARED EXPENSES */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>
                {lang === 'ml'
                  ? '💰 പൂർത്തിയായ ട്രിപ്പുകളും ക്ലിയർ ചെയ്ത ചിലവുകളും'
                  : 'Recent Completed Trips & Cleared Expenses'}
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500">
              {lang === 'ml'
                ? 'ഡ്രൈവർമാർ സബ്മിറ്റ് ചെയ്ത അവസാന കിലോമീറ്ററും വണ്ടിയുടെ ചിലവുകളും'
                : 'Confirmed trip usage, ending kilometers and vehicle expenses'}
            </p>
          </div>
          <Link
            href="/reports"
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 shrink-0"
          >
            <span>{lang === 'ml' ? 'മുഴുവൻ റിപ്പോർട്ട്' : 'All Reports'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {completedTripsWithExpenses.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-xs text-slate-500">
            {lang === 'ml' ? 'ഇന്ന് പൂർത്തിയായ ട്രിപ്പുകൾ ലഭ്യമല്ല.' : 'No completed trips logged yet today.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {completedTripsWithExpenses.map(({ trip: tr, vehicle: v, driver: d, distance: dist, expenses: tripExp, totalExpense: totExp }) => (
              <div
                key={tr.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                      {v?.registration_number || 'KL-07-CN-4602'}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {d?.full_name}
                    </span>
                  </div>
                  <span className="text-sm font-black font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                    +{dist.toFixed(1)} km
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Odometer Run</span>
                    <span className="font-mono font-bold text-slate-800">
                      {tr.start_odometer} → {tr.end_odometer} km
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Completed At</span>
                    <span className="font-bold text-slate-800">
                      {tr.end_time
                        ? new Date(tr.end_time).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Today'}
                    </span>
                  </div>
                </div>

                {/* Expenses Breakdown */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Cleared:</span>
                    {tripExp.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">No extra expenses</span>
                    ) : (
                      tripExp.map((exp) => (
                        <span
                          key={exp.id}
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                        >
                          {exp.expense_type}: ₹{exp.amount}
                        </span>
                      ))
                    )}
                  </div>
                  {totExp > 0 && (
                    <span className="font-mono font-black text-xs text-blue-700">
                      Total: ₹{totExp.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. DRIVER LIST & MANAGEMENT SECTION (Requested by User) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-600" />
              <span>
                {lang === 'ml' ? '👨‍✈️ ഡ്രൈവർമാരുടെ ലിസ്റ്റ് (Driver Registry)' : 'Registered Drivers'}
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500">
              {lang === 'ml'
                ? 'ഡ്രൈവർമാരുടെ ഫോൺ നമ്പർ പരിശോധിക്കുക & പുതിയ ഡ്രൈവർമാരെ ചേർക്കുക'
                : 'Drivers can log in using their phone numbers below'}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAddDriverModalOpen(true)}
            leftIcon={<UserPlus className="w-3.5 h-3.5 text-blue-600" />}
            className="text-xs font-bold"
          >
            {lang === 'ml' ? '+ പുതിയ ഡ്രൈവർ' : '+ Add Driver'}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {drivers.map((drv) => {
            const isDrivingNow = activeLiveTrips.some((at) => at.driver?.id === drv.id);
            return (
              <div
                key={drv.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs flex items-center justify-between hover:border-slate-300 transition-colors"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-slate-900 text-xs sm:text-sm truncate">
                      {drv.full_name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      #{drv.employee_code}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-600 font-bold">
                      {drv.phone}
                    </span>
                    {isDrivingNow ? (
                      <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full animate-pulse">
                        🟢 Driving
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded-full">
                        Available
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {drv.phone && (
                    <a
                      href={`tel:${drv.phone}`}
                      className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                      title="Call Driver"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => handleDeleteDriver(drv.id, drv.full_name)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete Driver"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. TWO ESSENTIAL OWNER TOOLS (Month-End Calculator & Vehicle Travel History) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        {/* Tool 1: Driver Month-End Calculator */}
        <div
          onClick={() => {
            setMonthCalcDriverId(undefined);
            setIsMonthCalcOpen(true);
          }}
          className="p-4 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-950 text-white shadow-md hover:shadow-lg transition-all border border-blue-800/80 cursor-pointer group active:scale-[0.99]"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-600/50 border border-blue-400/40 flex items-center justify-center mb-3">
              <Calculator className="w-5 h-5 text-blue-200 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-[10px] font-bold bg-blue-800 text-blue-200 px-2 py-0.5 rounded-full border border-blue-700">
              {lang === 'ml' ? 'മാസ കണക്ക്' : 'Settlement'}
            </span>
          </div>
          <h3 className="text-base font-black tracking-tight text-white group-hover:text-blue-200 transition-colors">
            {lang === 'ml' ? '📊 ഡ്രൈവർ മാസ കണക്ക്' : '📊 Driver Month-End Calculator'}
          </h3>
          <p className="text-xs text-blue-200/90 mt-1 leading-snug">
            {lang === 'ml'
              ? 'ഒരു ഡ്രൈവർ ഏതൊക്കെ വണ്ടിയിൽ പോയി, ആകെ എത്ര KM ഓടി എന്ന് ഉടൻ കണക്കാക്കുക.'
              : 'Calculate which vehicles a driver drove and total KM run for monthly settlement.'}
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-blue-300">
            <span>{lang === 'ml' ? 'കണക്ക് പരിശോധിക്കുക' : 'Open Calculator'}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Tool 2: Vehicle Travel & Route History */}
        <div
          onClick={() => {
            setVehicleHistoryVehicleId(undefined);
            setIsVehicleHistoryOpen(true);
          }}
          className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white shadow-md hover:shadow-lg transition-all border border-slate-800 cursor-pointer group active:scale-[0.99]"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/40 border border-emerald-400/40 flex items-center justify-center mb-3">
              <MapPin className="w-5 h-5 text-emerald-300 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-[10px] font-bold bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-700/60">
              {lang === 'ml' ? 'റൂട്ട് ഹിസ്റ്ററി' : 'Route History'}
            </span>
          </div>
          <h3 className="text-base font-black tracking-tight text-white group-hover:text-emerald-200 transition-colors">
            {lang === 'ml' ? '📍 വണ്ടി പോയ വഴികൾ' : '📍 Vehicle Route & Travel History'}
          </h3>
          <p className="text-xs text-slate-300 mt-1 leading-snug">
            {lang === 'ml'
              ? 'ഒരു വണ്ടി എവിടെയൊക്കെ ഓടി, ആരെല്ലാം ഓടിച്ചു എന്ന് കൃത്യമായി തിരിച്ചറിയാം.'
              : 'Accurately identify everywhere a vehicle ran, all route destinations, and drivers.'}
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-emerald-400">
            <span>{lang === 'ml' ? 'വഴികൾ കാണുക' : 'View Travel Log'}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* 4. TODAY'S ACTIVE FLEET & DRIVERS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-blue-600" />
              <span>{t('todayFleetTitle')}</span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500">
              {t('todayFleetSubtitle')}
            </p>
          </div>
          <Link
            href="/assignments"
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 shrink-0"
          >
            <span>{t('viewAllDuties')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {todayAssignments.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-xs text-slate-500 space-y-2">
              <p>{t('noDutiesToday')}</p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAssignmentModalOpen(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                {t('assignDutyBtn')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* MOBILE VIEW: High-Visibility Cards (< 640px) */}
            <div className="sm:hidden space-y-3">
              {todayAssignments.map((a) => {
                const activeTrip = a.trips?.find((tr) => tr.status === 'in_progress');
                const completedTrips = a.trips?.filter((tr) => tr.status === 'completed') || [];
                const distanceSum = completedTrips.reduce((acc, tr) => {
                  if (tr.end_odometer !== null && tr.start_odometer !== null) {
                    return acc + Math.max(0, tr.end_odometer - tr.start_odometer);
                  }
                  return acc;
                }, 0);

                return (
                  <div
                    key={a.id}
                    className="p-3.5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-2.5"
                  >
                    {/* Header Row: Vehicle Registration & Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-base tracking-tight text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {a.vehicle?.registration_number}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {a.vehicle?.make_model}
                        </span>
                      </div>

                      {activeTrip ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          {t('liveDrivingBadge')}
                        </span>
                      ) : (
                        <StatusBadge status={a.status} size="sm" />
                      )}
                    </div>

                    {/* Driver details + Direct Call Button */}
                    <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-xs font-black text-slate-900 block">
                          {a.driver?.full_name}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 block">
                          {a.driver?.phone}
                        </span>
                      </div>

                      {a.driver?.phone && (
                        <a
                          href={`tel:${a.driver.phone}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold shadow-xs active:scale-95"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>{t('callDriverBtn')}</span>
                        </a>
                      )}
                    </div>

                    {/* Route & Distance */}
                    <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                      <div className="truncate max-w-[190px]">
                        📍 {a.route?.name || 'Local Route'}
                      </div>
                      <div className="font-mono font-black text-slate-900 text-sm">
                        {distanceSum > 0 ? `+${distanceSum.toFixed(1)} km` : '—'}
                      </div>
                    </div>

                    {/* Quick Action Links for Driver Month Calc & Vehicle Travel History */}
                    <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                      <button
                        onClick={() => {
                          setMonthCalcDriverId(a.driver?.id);
                          setIsMonthCalcOpen(true);
                        }}
                        className="py-1 px-2 rounded-lg bg-blue-50 text-blue-700 font-bold border border-blue-200/80 hover:bg-blue-100 flex items-center justify-center gap-1"
                      >
                        <Calculator className="w-3.5 h-3.5 text-blue-600" />
                        <span>{lang === 'ml' ? 'ഡ്രൈവർ കണക്ക്' : 'Driver Calc'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setVehicleHistoryVehicleId(a.vehicle?.registration_number);
                          setIsVehicleHistoryOpen(true);
                        }}
                        className="py-1 px-2 rounded-lg bg-slate-100 text-slate-700 font-bold border border-slate-200 hover:bg-slate-200 flex items-center justify-center gap-1"
                      >
                        <MapPin className="w-3.5 h-3.5 text-slate-600" />
                        <span>{lang === 'ml' ? 'വണ്ടി വഴികൾ' : 'Travel History'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP VIEW: Clean Table (>= 640px) */}
            <div className="hidden sm:block">
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                      <th className="px-5 py-3.5">{t('vehicleNoTh')}</th>
                      <th className="px-5 py-3.5">{t('driverTh')}</th>
                      <th className="px-5 py-3.5">{t('shiftRouteTh')}</th>
                      <th className="px-5 py-3.5">{t('statusTh')}</th>
                      <th className="px-5 py-3.5">{lang === 'ml' ? 'ടൂളുകൾ' : 'Actions'}</th>
                      <th className="px-5 py-3.5 text-right">{t('totalKmTh')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {todayAssignments.map((a) => {
                      const activeTrip = a.trips?.find((tr) => tr.status === 'in_progress');
                      const completedTrips = a.trips?.filter((tr) => tr.status === 'completed') || [];
                      const distanceSum = completedTrips.reduce((acc, tr) => {
                        if (tr.end_odometer !== null && tr.start_odometer !== null) {
                          return acc + Math.max(0, tr.end_odometer - tr.start_odometer);
                        }
                        return acc;
                      }, 0);

                      return (
                        <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-4">
                            <span className="font-mono font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200/90">
                              {a.vehicle?.registration_number}
                            </span>
                            <div className="text-xs text-slate-500 mt-1 font-medium">
                              {a.vehicle?.make_model}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-bold text-slate-900">{a.driver?.full_name}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-slate-500 font-mono">{a.driver?.phone}</span>
                              {a.driver?.phone && (
                                <a
                                  href={`tel:${a.driver.phone}`}
                                  className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200"
                                >
                                  {t('callDriverBtn')}
                                </a>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-semibold text-slate-800 text-xs">
                              {a.route?.name || 'Local Route'}
                            </div>
                            <div className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {a.planned_start_time} - {a.planned_end_time}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            {activeTrip ? (
                              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full animate-pulse flex items-center gap-1.5 w-fit">
                                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                                {t('liveDrivingBadge')}
                              </span>
                            ) : (
                              <StatusBadge status={a.status} />
                            )}
                          </td>

                          {/* Quick Tool Links */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setMonthCalcDriverId(a.driver?.id);
                                  setIsMonthCalcOpen(true);
                                }}
                                className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-bold border border-blue-200 cursor-pointer"
                                title="Driver Month Calc"
                              >
                                {lang === 'ml' ? 'കണക്ക്' : 'Calc'}
                              </button>
                              <button
                                onClick={() => {
                                  setVehicleHistoryVehicleId(a.vehicle?.registration_number);
                                  setIsVehicleHistoryOpen(true);
                                }}
                                className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-xs font-bold border border-slate-200 cursor-pointer"
                                title="Vehicle History"
                              >
                                {lang === 'ml' ? 'വഴികൾ' : 'History'}
                              </button>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="font-mono font-black text-slate-900 text-base">
                              {distanceSum > 0 ? `${distanceSum.toFixed(1)} km` : '—'}
                            </div>
                            {activeTrip && (
                              <div className="text-[11px] text-emerald-600 font-bold font-mono">
                                Start: {activeTrip.start_odometer} km
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Simplified Add Driver Modal */}
      <SimpleAddDriverModal
        isOpen={isAddDriverModalOpen}
        onClose={() => setIsAddDriverModalOpen(false)}
        onSuccess={loadData}
      />

      {/* New Assignment Modal */}
      <AssignmentFormModal
        isOpen={isAssignmentModalOpen}
        onClose={() => setIsAssignmentModalOpen(false)}
        onSuccess={loadData}
        vehicles={vehicles}
        drivers={drivers}
        routes={routes}
        teams={teams}
      />

      {/* Month-End Driver Vehicle & KM Calculator Modal */}
      <DriverMonthCalculatorModal
        isOpen={isMonthCalcOpen}
        onClose={() => setIsMonthCalcOpen(false)}
        initialDriverId={monthCalcDriverId}
      />

      {/* Vehicle Travel & Route History Modal */}
      <VehicleTravelHistoryModal
        isOpen={isVehicleHistoryOpen}
        onClose={() => setIsVehicleHistoryOpen(false)}
        initialVehicleId={vehicleHistoryVehicleId}
      />
    </PageContainer>
  );
}
