'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { dataRepo } from '@/lib/data-service';
import { AssignmentWithDetails, ExpenseWithDetails } from '@/types/models';
import { Trip, Profile, Vehicle, Driver, ExpenseType } from '@/types/database';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { StartTripModal } from '@/components/driver-portal/StartTripModal';
import { CompleteTripModal } from '@/components/driver-portal/CompleteTripModal';
import { LanguageSwitcher, useLanguage } from '@/lib/i18n/LanguageContext';
import { InstallPwaButton } from '@/components/layout/InstallPwaButton';
import {
  Truck,
  Clock,
  MapPin,
  Play,
  CheckCircle,
  History,
  LogOut,
  Phone,
  CheckCircle2,
  RefreshCw,
  Plus,
  Receipt,
  Fuel,
  Wrench,
  Car,
  Camera,
  Eye,
  IndianRupee,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Link from 'next/link';
import { NalakathLogo } from '@/components/brand/NalakathLogo';

export default function DriverPortalPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [driverRecord, setDriverRecord] = useState<Driver | null>(null);
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [driverExpenses, setDriverExpenses] = useState<ExpenseWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [formattedToday, setFormattedToday] = useState<string>('');

  // Modals state
  const [startTripModalDuty, setStartTripModalDuty] = useState<AssignmentWithDetails | null>(null);
  const [completeTripModalTrip, setCompleteTripModalTrip] = useState<Trip | null>(null);

  // Ad-hoc Vehicle & Route Picker Modal
  const [isPickVehicleOpen, setIsPickVehicleOpen] = useState(false);
  const [selectedAdhocVehicleId, setSelectedAdhocVehicleId] = useState<string>('');
  const [adhocRouteLocation, setAdhocRouteLocation] = useState<string>('Ad-hoc');
  const [isAssigningVehicle, setIsAssigningVehicle] = useState(false);

  // Add Expense Modal
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [expenseVehicleId, setExpenseVehicleId] = useState<string>('');
  const [expenseType, setExpenseType] = useState<ExpenseType>('Fuel');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<string>('2026-10-18');
  const [expenseLitres, setExpenseLitres] = useState<string>('');
  const [expenseNote, setExpenseNote] = useState<string>('');
  const [expensePhotoUrl, setExpensePhotoUrl] = useState<string | null>(null);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);
  const [isExpensesExpanded, setIsExpensesExpanded] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const p = await dataRepo.getCurrentProfile();
      setProfile(p);
      const vList = await dataRepo.getVehicles();
      setVehicles(vList);

      if (p) {
        // Fetch driver record
        const allDrivers = await dataRepo.getDrivers();
        const dRec = allDrivers.find(
          (d) =>
            d.phone.replace(/[\s-]/g, '') === p.phone.replace(/[\s-]/g, '') ||
            d.profile_id === p.id
        );
        setDriverRecord(dRec || null);

        // Fetch driver duties
        const list = await dataRepo.getDriverAssignments(p.phone);
        setAssignments(list);

        // Fetch driver's OWN expenses only
        const expList = await dataRepo.getDriverExpenses(p.phone);
        setDriverExpenses(expList);

        // Pre-select vehicle for expense
        if (list.length > 0 && list[0].vehicle_id) {
          setExpenseVehicleId(list[0].vehicle_id);
          setSelectedAdhocVehicleId(list[0].vehicle_id);
        } else if (vList.length > 0) {
          setExpenseVehicleId(vList[0].id);
          setSelectedAdhocVehicleId(vList[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load driver portal data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const locale = lang === 'ml' ? 'ml-IN' : 'en-US';
    setFormattedToday(
      new Date().toLocaleDateString(locale, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    );
  }, [lang]);

  useEffect(() => {
    loadData();
  }, []);

  const handleQuickPunchIn = async (duty: AssignmentWithDetails) => {
    setActionError(null);
    try {
      if (!duty.driver_confirmed_at) {
        await dataRepo.confirmDuty(duty.id);
      }
      setStartTripModalDuty(duty);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to confirm duty');
    }
  };

  const handleConfirmAdhocVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedAdhocVehicleId) return;
    setIsAssigningVehicle(true);
    setActionError(null);
    try {
      await dataRepo.assignDriverAdhocVehicle(
        profile.phone,
        selectedAdhocVehicleId,
        adhocRouteLocation.trim() || 'Ad-hoc'
      );
      setIsPickVehicleOpen(false);
      setActionSuccess('Vehicle and route successfully assigned for today!');
      await loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to assign vehicle');
    } finally {
      setIsAssigningVehicle(false);
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !driverRecord || !expenseAmount) return;
    setIsSubmittingExpense(true);
    setActionError(null);
    try {
      const targetVehId =
        expenseVehicleId || assignments[0]?.vehicle_id || vehicles[0]?.id;

      await dataRepo.createExpense({
        vehicle_id: targetVehId,
        driver_id: driverRecord.id,
        expense_type: expenseType,
        amount: parseFloat(expenseAmount) || 0,
        date: expenseDate,
        litres: expenseType === 'Fuel' ? parseFloat(expenseLitres) || null : null,
        note: expenseNote.trim() || null,
        bill_photo_url: expensePhotoUrl,
      });

      setIsAddExpenseOpen(false);
      setExpenseAmount('');
      setExpenseLitres('');
      setExpenseNote('');
      setExpensePhotoUrl(null);
      setActionSuccess('Expense recorded successfully!');
      // Reload driver expenses
      const updatedExpenses = await dataRepo.getDriverExpenses(profile.phone);
      setDriverExpenses(updatedExpenses);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to record expense');
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // Driver's expense totals
  const totalMyExpenses = driverExpenses.reduce((sum, e) => sum + e.amount, 0);
  const isAdhocDriver = driverRecord ? !driverRecord.is_fixed_route : false;

  return (
    <div className="min-h-screen bg-slate-100 pb-16">
      {/* Mobile App Bar */}
      <header className="bg-slate-900 text-white sticky top-0 z-20 shadow-md">
        <div className="max-w-md mx-auto px-3.5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <NalakathLogo size="sm" variant="circle" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-tight uppercase">NALAKATH</span>
                <span className="text-[9px] font-bold text-rose-500 bg-rose-950/80 px-1 py-0.2 rounded border border-rose-800/80">
                  1998
                </span>
              </div>
              <div className="text-[11px] text-slate-300 font-bold truncate">
                {profile?.full_name || t('driver')}
                {isAdhocDriver && (
                  <span className="ml-1 text-[9px] bg-blue-900 text-blue-200 px-1.5 py-0.2 rounded font-bold">
                    Ad-hoc
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Logout button */}
            <button
              onClick={async () => {
                await dataRepo.logout();
                router.push('/login');
              }}
              title={t('logout')}
              className="p-1.5 text-slate-400 hover:text-rose-400 cursor-pointer rounded-lg hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Mobile Container */}
      <main className="max-w-md mx-auto px-3.5 py-3 space-y-3.5">
        {actionError && <Alert variant="danger">{actionError}</Alert>}
        {actionSuccess && <Alert variant="success">{actionSuccess}</Alert>}

        {/* Compact Driver Status Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-3.5 rounded-2xl shadow-sm space-y-2 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-blue-200">
              {formattedToday || 'Today'}
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-700/60">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{t('driverAppOnline')}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <h1 className="text-base font-black tracking-tight">
              👋 {t('welcomeGreeting')}, {profile?.full_name?.split(' ')[0] || t('driver')}!
            </h1>

            {/* Quick Action Pill Buttons */}
            <div className="flex items-center gap-1.5">
              {isAdhocDriver && (
                <button
                  onClick={() => setIsPickVehicleOpen(true)}
                  className="py-1.5 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                >
                  <Car className="w-3 h-3" />
                  <span>{t('adhocDriverPickBtn')}</span>
                </button>
              )}
              <button
                onClick={() => setIsAddExpenseOpen(true)}
                className="py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
              >
                <Plus className="w-3 h-3" />
                <span>{t('addExpenseBtn')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Assigned Vehicle Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t('assignedDutiesCount')} ({assignments.length})
            </h2>
            <button
              onClick={loadData}
              className="text-xs text-blue-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{t('refreshBtn')}</span>
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-10 text-xs text-slate-400 animate-pulse bg-white rounded-2xl border border-slate-200">
              Loading assignment...
            </div>
          ) : assignments.length === 0 ? (
            /* Single clean empty state */
            <Card className="border-2 border-slate-200 shadow-xs rounded-2xl">
              <CardContent className="p-6 text-center space-y-3">
                <Truck className="w-10 h-10 text-slate-400 mx-auto" />
                <div>
                  <h3 className="font-black text-slate-800 text-sm">
                    {isAdhocDriver ? t('adhocDriverPickTitle') : t('noDutyAssignedDriverTitle')}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    {isAdhocDriver
                      ? 'Select your rotating vehicle to start logging your trips for today.'
                      : t('noDutyAssignedDriverDesc')}
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                  {isAdhocDriver && (
                    <Button
                      size="md"
                      variant="primary"
                      className="w-full sm:w-auto text-xs font-black bg-blue-600 hover:bg-blue-700 rounded-xl"
                      onClick={() => setIsPickVehicleOpen(true)}
                      leftIcon={<Car className="w-4 h-4" />}
                    >
                      {t('adhocDriverPickBtn')}
                    </Button>
                  )}
                  <a
                    href="tel:+919876543200"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t('callOwnerBtn')} (Shabeerali)</span>
                  </a>
                </div>
              </CardContent>
            </Card>
          ) : (
            assignments.map((assignment) => {
              const activeTrip = assignment.trips?.find((tr) => tr.status === 'in_progress');
              const completedTrips =
                assignment.trips?.filter((tr) => tr.status === 'completed') || [];
              const isFullyCompleted = assignment.status === 'completed';
              const isDelhivery = assignment.vehicle.company === 'Delhivery';

              return (
                <Card
                  key={assignment.id}
                  className="border-2 border-slate-200 shadow-md overflow-hidden bg-white rounded-2xl"
                >
                  {/* Top Shift Header */}
                  <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      <span className="font-mono font-bold">
                        {assignment.planned_start_time.slice(0, 5)} –{' '}
                        {assignment.planned_end_time.slice(0, 5)}
                      </span>
                    </div>
                    <StatusBadge status={assignment.status} size="sm" />
                  </div>

                  <CardContent className="p-4 space-y-3.5">
                    {/* Big Assigned Vehicle Plate */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50/70 border-2 border-blue-200 p-3.5 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase border ${
                            isDelhivery
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                        >
                          {assignment.vehicle.company || 'Delhivery'}
                        </span>

                        <div className="text-right">
                          <span className="text-[9px] text-slate-500 uppercase font-bold block">
                            {t('currentOdoDriver')}
                          </span>
                          <span className="text-sm font-black text-slate-900 font-mono">
                            {assignment.vehicle.current_odometer.toLocaleString()} km
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="text-2xl font-black text-slate-900 font-mono tracking-wider">
                          {assignment.vehicle.registration_number}
                        </div>
                        <div className="text-xs font-semibold text-slate-600">
                          {assignment.vehicle.make_model}
                        </div>
                      </div>
                    </div>

                    {/* Route Location */}
                    <div className="text-xs bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="font-bold text-slate-800 truncate">
                        {assignment.route?.name ||
                          assignment.notes ||
                          assignment.vehicle.route_location ||
                          'Ad-hoc Corridor'}
                      </span>
                    </div>

                    {/* Primary Driver Punch Buttons */}
                    <div className="pt-1">
                      {/* State 1: Trip Not Started Yet */}
                      {!activeTrip && !isFullyCompleted && (
                        <Button
                          variant="primary"
                          size="lg"
                          className="w-full text-base py-4 font-black shadow-lg bg-emerald-600 hover:bg-emerald-700 active:scale-98 transition-all flex items-center justify-center gap-2 rounded-xl min-h-[54px]"
                          onClick={() => handleQuickPunchIn(assignment)}
                        >
                          <Play className="w-5 h-5 fill-white" />
                          <span>
                            {completedTrips.length === 0
                              ? t('punchInStartBtn')
                              : `${t('startNextTripBtn')} #${completedTrips.length + 1}`}
                          </span>
                        </Button>
                      )}

                      {/* State 2: Active Trip In Progress */}
                      {activeTrip && (
                        <div className="space-y-2.5">
                          <div className="bg-amber-50 border-2 border-amber-300 p-3 rounded-xl text-xs space-y-1.5">
                            <div className="font-black text-amber-950 text-xs flex items-center justify-between">
                              <span>Trip #{activeTrip.trip_number} {t('drivingLiveTitle')}</span>
                              <span className="animate-pulse bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-black text-[10px]">
                                {t('liveDrivingTag')}
                              </span>
                            </div>
                            <div className="text-slate-800 font-mono text-xs flex items-center justify-between pt-1 border-t border-amber-200">
                              <span>{t('startedAtOdo')}</span>
                              <strong>{activeTrip.start_odometer} km</strong>
                            </div>
                          </div>

                          <Button
                            variant="success"
                            size="lg"
                            className="w-full text-base py-4 font-black shadow-lg bg-rose-600 hover:bg-rose-700 active:scale-98 transition-all flex items-center justify-center gap-2 rounded-xl min-h-[54px]"
                            onClick={() => setCompleteTripModalTrip(activeTrip)}
                          >
                            <CheckCircle className="w-5 h-5" />
                            <span>{t('punchOutFinishBtn')}</span>
                          </Button>
                        </div>
                      )}

                      {/* State 3: Duty Completed */}
                      {isFullyCompleted && !activeTrip && (
                        <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-center space-y-2">
                          <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
                          <div className="font-bold text-emerald-900 text-xs">
                            {t('dutyCompletedSuccessTitle')}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs font-bold"
                            onClick={() => setStartTripModalDuty(assignment)}
                          >
                            {t('addExtraLegBtn')}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Today's Logged Trips Under This Duty */}
                    {completedTrips.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          <History className="w-3 h-3" />
                          <span>{t('loggedTripsTitle')} ({completedTrips.length})</span>
                        </div>
                        <div className="space-y-1">
                          {completedTrips.map((tr) => {
                            const dist =
                              tr.start_odometer && tr.end_odometer
                                ? (tr.end_odometer - tr.start_odometer).toFixed(1)
                                : '—';
                            return (
                              <div
                                key={tr.id}
                                className="flex items-center justify-between text-xs bg-slate-50 px-2.5 py-2 rounded-lg border border-slate-200"
                              >
                                <span className="font-bold text-slate-800 text-[11px]">
                                  Trip #{tr.trip_number}
                                </span>
                                <span className="font-mono text-slate-500 text-[10px]">
                                  {tr.start_odometer} → {tr.end_odometer} km
                                </span>
                                <span className="font-black text-emerald-600 font-mono text-xs">
                                  +{dist} km
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* SECTION 2: STREAMLINED & COLLAPSIBLE EXPENSES SECTION */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {t('myExpensesTitle')}
                </span>
                <span className="text-base font-black font-mono text-slate-900">
                  ₹{totalMyExpenses.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={() => setIsAddExpenseOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs rounded-xl"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                {t('addExpenseBtn')}
              </Button>

              {driverExpenses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsExpensesExpanded(!isExpensesExpanded)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer"
                  title="Toggle details"
                >
                  {isExpensesExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Collapsible Expense History */}
          {isExpensesExpanded && driverExpenses.length > 0 && (
            <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 space-y-2">
              {driverExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${
                          exp.expense_type === 'Fuel'
                            ? 'bg-blue-100 text-blue-800'
                            : exp.expense_type === 'Toll'
                            ? 'bg-purple-100 text-purple-800'
                            : exp.expense_type === 'Maintenance'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {exp.expense_type}
                      </span>
                      <span className="font-mono text-slate-500 text-[10px]">{exp.date}</span>
                    </div>

                    <div className="font-bold text-slate-900 font-mono text-[11px]">
                      {exp.vehicle?.registration_number || 'Vehicle'}
                    </div>

                    {exp.note && (
                      <div className="text-[10px] text-slate-500 max-w-xs truncate">
                        {exp.note}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-black font-mono text-slate-900">
                      ₹{exp.amount.toLocaleString()}
                    </div>
                    {exp.litres && (
                      <div className="text-[9px] text-blue-600 font-mono font-semibold">
                        {exp.litres} L
                      </div>
                    )}
                    {exp.bill_photo_url && (
                      <button
                        onClick={() => setPreviewReceiptUrl(exp.bill_photo_url || null)}
                        className="text-[9px] text-blue-600 font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer mt-0.5"
                      >
                        <Receipt className="w-2.5 h-2.5" />
                        <span>Receipt</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Minimal Mobile Footer */}
        <footer className="pt-4 pb-6 text-center space-y-2 text-xs text-slate-400">
          <div className="flex items-center justify-center gap-3">
            <InstallPwaButton />
            <span>•</span>
            <a
              href="tel:+919876543200"
              className="text-[11px] text-emerald-700 font-bold hover:underline"
            >
              Helpline: 9876543200 (Shabeerali)
            </a>
          </div>
          <p className="text-[10px] text-slate-400">
            Nalakath Logistics Operations Platform © 1998
          </p>
        </footer>
      </main>

      {/* Start Trip Modal (Starting KM) */}
      {startTripModalDuty && (
        <StartTripModal
          isOpen={!!startTripModalDuty}
          onClose={() => setStartTripModalDuty(null)}
          onSuccess={loadData}
          assignmentId={startTripModalDuty.id}
          defaultOdometer={startTripModalDuty.vehicle.current_odometer}
          plannedDestination={startTripModalDuty.route?.destination}
          tripNumber={(startTripModalDuty.trips?.length || 0) + 1}
        />
      )}

      {/* Complete Trip Modal (Ending KM) */}
      {completeTripModalTrip && (
        <CompleteTripModal
          isOpen={!!completeTripModalTrip}
          onClose={() => setCompleteTripModalTrip(null)}
          onSuccess={loadData}
          trip={completeTripModalTrip}
        />
      )}

      {/* Ad-hoc Pick Vehicle & Route Modal */}
      {isPickVehicleOpen && (
        <Modal
          isOpen={isPickVehicleOpen}
          onClose={() => setIsPickVehicleOpen(false)}
          title={t('adhocDriverPickTitle')}
          description="Select your rotating vehicle and delivery destination corridor for today."
          maxWidth="md"
        >
          <form onSubmit={handleConfirmAdhocVehicle} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Vehicle
              </label>
              <select
                value={selectedAdhocVehicleId}
                onChange={(e) => setSelectedAdhocVehicleId(e.target.value)}
                className="w-full px-3 py-2.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                required
              >
                <optgroup label="Delhivery Ad-hoc (Rotating) Vehicles">
                  {vehicles
                    .filter((v) => v.company === 'Delhivery' && v.is_adhoc)
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.registration_number} — {v.make_model} ({v.current_odometer} km)
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Other Delhivery Vehicles">
                  {vehicles
                    .filter((v) => v.company === 'Delhivery' && !v.is_adhoc)
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.registration_number} — {v.make_model}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Shadowfax Vehicles">
                  {vehicles
                    .filter((v) => v.company === 'Shadowfax')
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.registration_number} — {v.make_model}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Route / Destination Location
              </label>
              <select
                value={adhocRouteLocation}
                onChange={(e) => setAdhocRouteLocation(e.target.value)}
                className="w-full px-3 py-2.5 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer mb-2"
              >
                <option value="Ad-hoc">Ad-hoc Corridor</option>
                <option value="Areekode, Chungathara">Areekode, Chungathara</option>
                <option value="Mukkam / Pickup Calicut">Mukkam / Pickup Calicut</option>
                <option value="Ameer, Koyiland, Kizhur | B2B">Ameer, Koyiland, Kizhur | B2B</option>
                <option value="Thamarassery, Balussery | B2B">Thamarassery, Balussery | B2B</option>
                <option value="Edavanna, Karulai | Cargo pickup">Edavanna, Karulai | Cargo pickup</option>
                <option value="Thrissur Express">Thrissur Express</option>
                <option value="Custom">Custom Destination...</option>
              </select>

              {adhocRouteLocation === 'Custom' && (
                <Input
                  label="Enter Custom Route"
                  placeholder="e.g. Kozhikode South Hub"
                  onChange={(e) => setAdhocRouteLocation(e.target.value)}
                  required
                />
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setIsPickVehicleOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isAssigningVehicle}
                className="bg-blue-600 hover:bg-blue-700 font-bold"
              >
                Assign & Confirm Vehicle
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Expense Modal */}
      {isAddExpenseOpen && (
        <Modal
          isOpen={isAddExpenseOpen}
          onClose={() => setIsAddExpenseOpen(false)}
          title={t('addExpenseBtn')}
          description="Log fuel top-up, toll ticket, or vehicle repair expense."
          maxWidth="md"
        >
          <form onSubmit={handleSaveExpense} className="space-y-4">
            {/* Preselected Vehicle Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Vehicle (Preselected)
              </label>
              <select
                value={expenseVehicleId}
                onChange={(e) => setExpenseVehicleId(e.target.value)}
                className="w-full px-3 py-2.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                required
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration_number} — {v.make_model} ({v.company})
                  </option>
                ))}
              </select>
            </div>

            {/* Type selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Expense Type
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['Fuel', 'Toll', 'Maintenance', 'Other'] as const).map((type) => (
                  <button
                    type="button"
                    key={type}
                    onClick={() => setExpenseType(type)}
                    className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      expenseType === type
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount and Date */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t('amountLabel')}
                type="number"
                placeholder="e.g. 2100"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                required
                autoFocus
              />

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
            </div>

            {/* Fuel asks litres */}
            {expenseType === 'Fuel' && (
              <Input
                label={t('litresLabel')}
                type="number"
                step="0.1"
                placeholder="e.g. 21.4"
                value={expenseLitres}
                onChange={(e) => setExpenseLitres(e.target.value)}
                required
              />
            )}

            {/* Note */}
            <Input
              label="Optional Note / Details"
              placeholder="e.g. IOCL Pump Diesel or Highway Toll"
              value={expenseNote}
              onChange={(e) => setExpenseNote(e.target.value)}
            />

            {/* Bill Photo Upload / Preview */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {t('billPhotoLabel')}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        setExpensePhotoUrl(ev.target?.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              {expensePhotoUrl && (
                <div className="mt-2 relative w-20 h-20 rounded-lg overflow-hidden border border-slate-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={expensePhotoUrl} alt="Bill preview" className="w-full h-full object-cover" />
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
                Submit Expense
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Bill Receipt Preview Modal */}
      {previewReceiptUrl && (
        <Modal
          isOpen={!!previewReceiptUrl}
          onClose={() => setPreviewReceiptUrl(null)}
          title="Receipt Preview"
          maxWidth="md"
        >
          <div className="p-2 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewReceiptUrl}
              alt="Receipt"
              className="max-h-96 mx-auto rounded-xl object-contain border border-slate-200"
            />
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setPreviewReceiptUrl(null)}
            >
              Close
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
