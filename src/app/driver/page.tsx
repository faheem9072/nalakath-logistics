'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { dataRepo, DriverMonthlySummary } from '@/lib/data-service';
import { Vehicle, Driver, Profile, Trip, ExpenseType } from '@/types/database';
import { ExpenseWithDetails } from '@/types/models';
import { captureCurrentLocation } from '@/lib/utils/location';
import { MoveIQTopBar } from '@/components/moveiq/MoveIQTopBar';
import { MoveIQBottomNav } from '@/components/moveiq/MoveIQBottomNav';
import { MoveIQDarkCard } from '@/components/moveiq/MoveIQDarkCard';
import { MoveIQFilterChips } from '@/components/moveiq/MoveIQFilterChips';
import {
  Truck,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Gauge,
  Receipt,
  Plus,
  ArrowRight,
  RotateCcw,
  Fuel,
  Wrench,
  Lock,
  ChevronRight,
  X,
  History,
  Timer,
} from 'lucide-react';

function DriverDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeNavTab, setActiveNavTab] = useState<'trip' | 'history'>('trip');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active in-progress trip for this driver
  const [activeTrip, setActiveTrip] = useState<{
    trip: Trip;
    vehicle: Vehicle;
  } | null>(null);

  // Vehicle selection state (when no trip is active)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [companyFilter, setCompanyFilter] = useState<'all' | 'Delhivery' | 'Shadowfax'>('all');
  const [startOdoDisplay, setStartOdoDisplay] = useState<number>(0);
  const [destinationInput, setDestinationInput] = useState('');
  const [isStartingTrip, setIsStartingTrip] = useState(false);
  const [startTripError, setStartTripError] = useState<string | null>(null);

  // Rest cooldown state
  const [cooldownCheck, setCooldownCheck] = useState<{ allowed: boolean; reason?: string }>({ allowed: true });

  // Single Expense Form (while trip is running)
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [expFuelAmount, setExpFuelAmount] = useState('');
  const [expTollAmount, setExpTollAmount] = useState('');
  const [expMaintAmount, setExpMaintAmount] = useState('');
  const [expNote, setExpNote] = useState('');
  const [expError, setExpError] = useState<string | null>(null);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [expenseSuccessMsg, setExpenseSuccessMsg] = useState<string | null>(null);

  // End Trip Modal
  const [isEndTripOpen, setIsEndTripOpen] = useState(false);
  const [endOdoInput, setEndOdoInput] = useState('');
  const [endTripNotes, setEndTripNotes] = useState('');
  const [endFuelAmount, setEndFuelAmount] = useState('');
  const [endTollAmount, setEndTollAmount] = useState('');
  const [endMaintAmount, setEndMaintAmount] = useState('');
  const [endExpenseNote, setEndExpenseNote] = useState('');
  const [isSubmittingEndTrip, setIsSubmittingEndTrip] = useState(false);
  const [endTripError, setEndTripError] = useState<string | null>(null);

  // Completed trip summary state
  const [completedSummary, setCompletedSummary] = useState<{
    distanceKm: number;
    startOdo: number;
    endOdo: number;
    vehicleReg: string;
    totalExpenses?: number;
    expensesCount?: number;
  } | null>(null);

  // Driver History state
  const [driverSummary, setDriverSummary] = useState<DriverMonthlySummary | null>(null);
  const [driverExpenses, setDriverExpenses] = useState<ExpenseWithDetails[]>([]);

  useEffect(() => {
    if (tabParam === 'history') {
      setActiveNavTab('history');
    } else {
      setActiveNavTab('trip');
    }
  }, [tabParam]);

  const loadDriverSession = async () => {
    try {
      const p = await dataRepo.getCurrentProfile();
      if (!p || p.role !== 'driver') {
        router.push('/login?role=driver');
        return;
      }
      setProfile(p);

      const allDrivers = await dataRepo.getDrivers();
      const matched = allDrivers.find(
        (d) =>
          d.id === p.id ||
          d.phone.replace(/[\s-]/g, '') === p.phone.replace(/[\s-]/g, '')
      );

      if (!matched) {
        router.push('/login');
        return;
      }
      setDriver(matched);

      // Check cooldown rest rule for this driver
      const cd = dataRepo.checkDriverRestCooldown(matched.id);
      setCooldownCheck(cd);

      // Check if driver has an active in-progress trip
      const live = dataRepo.getActiveTripForDriver(matched.id);
      if (live) {
        setActiveTrip({ trip: live.trip, vehicle: live.vehicle });
      } else {
        setActiveTrip(null);
      }

      // Load all vehicles
      const vList = await dataRepo.getVehicles();
      setVehicles(vList);

      // Load history
      const hist = await dataRepo.getDriverMonthlySummary(matched.id);
      setDriverSummary(hist);

      const exp = await dataRepo.getDriverExpenses(matched.id);
      setDriverExpenses(exp);
    } catch (err) {
      console.error('Failed to load driver session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDriverSession();
    // Subscribe to shared state updates
    const unsub = dataRepo.subscribe(() => {
      loadDriverSession();
    });
    return unsub;
  }, []);

  // When driver selects a vehicle
  const handleSelectVehicle = (v: Vehicle) => {
    // Check if vehicle is already on a trip with ANOTHER driver
    const liveVehicleTrip = dataRepo.getActiveTripForVehicle(v.id);
    if (liveVehicleTrip && liveVehicleTrip.driver.id !== driver?.id) {
      alert(
        `Vehicle ${v.registration_number} is currently in use by driver ${liveVehicleTrip.driver.full_name}. Please choose another vehicle.`
      );
      return;
    }

    // Auto-fill starting KM from vehicle's last ending KM (locked/read-only)
    const autoStartingKm = dataRepo.getStartingKmForVehicle(v.id);
    setSelectedVehicle(v);
    setStartOdoDisplay(autoStartingKm);
    setDestinationInput(v.route_location || 'Ad-hoc Route');
    setStartTripError(null);
  };

  // Start Trip
  const handleStartTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driver || !selectedVehicle) return;

    // Check rest cooldown
    const cd = dataRepo.checkDriverRestCooldown(driver.id);
    if (!cd.allowed) {
      setStartTripError(cd.reason || 'Rest cooldown active. Cannot start trip yet.');
      return;
    }

    setIsStartingTrip(true);
    setStartTripError(null);
    try {
      // Automatically capture GPS location (non-blocking fallback)
      const startLocation = await captureCurrentLocation();

      const trip = await dataRepo.startTripForDriver({
        driverPhoneOrId: driver.id,
        vehicleId: selectedVehicle.id,
        startOdometer: startOdoDisplay,
        destination: destinationInput.trim() || undefined,
        startLocation,
      });

      setActiveTrip({ trip, vehicle: selectedVehicle });
      setSelectedVehicle(null);
      await loadDriverSession();
    } catch (err: unknown) {
      setStartTripError(err instanceof Error ? err.message : 'Failed to start trip');
    } finally {
      setIsStartingTrip(false);
    }
  };

  // Single Expense Form Submit (while running active trip)
  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driver || !activeTrip) return;

    const fuel = parseFloat(expFuelAmount);
    const toll = parseFloat(expTollAmount);
    const maint = parseFloat(expMaintAmount);

    const hasFuel = !isNaN(fuel) && fuel > 0;
    const hasToll = !isNaN(toll) && toll > 0;
    const hasMaint = !isNaN(maint) && maint > 0;

    if (!hasFuel && !hasToll && !hasMaint) {
      setExpError('Please fill in at least one expense amount (Fuel, Toll, or Maintenance).');
      return;
    }

    setExpError(null);
    setIsSubmittingExpense(true);
    try {
      const promises = [];
      const noteVal = expNote.trim() || null;

      if (hasFuel) {
        promises.push(
          dataRepo.createExpense({
            tripId: activeTrip.trip.id,
            vehicle_id: activeTrip.vehicle.id,
            driver_id: driver.id,
            expense_type: 'Fuel',
            amount: fuel,
            note: noteVal,
          })
        );
      }
      if (hasToll) {
        promises.push(
          dataRepo.createExpense({
            tripId: activeTrip.trip.id,
            vehicle_id: activeTrip.vehicle.id,
            driver_id: driver.id,
            expense_type: 'Toll',
            amount: toll,
            note: noteVal,
          })
        );
      }
      if (hasMaint) {
        promises.push(
          dataRepo.createExpense({
            tripId: activeTrip.trip.id,
            vehicle_id: activeTrip.vehicle.id,
            driver_id: driver.id,
            expense_type: 'Maintenance',
            amount: maint,
            note: noteVal,
          })
        );
      }

      await Promise.all(promises);

      setIsAddExpenseOpen(false);
      setExpFuelAmount('');
      setExpTollAmount('');
      setExpMaintAmount('');
      setExpNote('');
      setExpenseSuccessMsg('Expenses saved successfully!');
      setTimeout(() => setExpenseSuccessMsg(null), 3000);
      await loadDriverSession();
    } catch (err: unknown) {
      setExpError(err instanceof Error ? err.message : 'Failed to save expenses');
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // Open End Trip Modal
  const handleOpenEndTrip = () => {
    if (!activeTrip) return;
    const currentOdo = activeTrip.trip.start_odometer || activeTrip.vehicle.current_odometer;
    setEndOdoInput(String(currentOdo + 10)); // prefill logical next km
    setEndTripNotes('');
    setEndFuelAmount('');
    setEndTollAmount('');
    setEndMaintAmount('');
    setEndExpenseNote('');
    setEndTripError(null);
    setIsEndTripOpen(true);
  };

  // Confirm End Trip
  const handleConfirmEndTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip) return;
    const startKm = activeTrip.trip.start_odometer || 0;
    const endKm = parseFloat(endOdoInput);

    if (isNaN(endKm) || endKm <= startKm) {
      setEndTripError(
        `Ending KM (${endKm}) must be strictly greater than Starting KM (${startKm})`
      );
      return;
    }

    setIsSubmittingEndTrip(true);
    try {
      // Capture GPS location upon ending trip (non-blocking fallback)
      const endLocation = await captureCurrentLocation();

      // Collect single-form expense amounts (Fuel, Toll, Maintenance)
      const finalExpenses: Array<{ expense_type: ExpenseType; amount: number; note?: string }> = [];
      const noteVal = endExpenseNote.trim() || undefined;

      const fAmt = parseFloat(endFuelAmount);
      if (!isNaN(fAmt) && fAmt > 0) {
        finalExpenses.push({
          expense_type: 'Fuel',
          amount: fAmt,
          note: noteVal,
        });
      }
      const tAmt = parseFloat(endTollAmount);
      if (!isNaN(tAmt) && tAmt > 0) {
        finalExpenses.push({
          expense_type: 'Toll',
          amount: tAmt,
          note: noteVal,
        });
      }
      const mAmt = parseFloat(endMaintAmount);
      if (!isNaN(mAmt) && mAmt > 0) {
        finalExpenses.push({
          expense_type: 'Maintenance',
          amount: mAmt,
          note: noteVal,
        });
      }

      const res = await dataRepo.completeTrip({
        tripId: activeTrip.trip.id,
        endOdometer: endKm,
        notes: endTripNotes.trim() || null,
        endLocation,
        expenses: finalExpenses,
      });

      const totalTripExp = finalExpenses.reduce((sum, x) => sum + x.amount, 0);

      setIsEndTripOpen(false);
      setActiveTrip(null);
      setCompletedSummary({
        distanceKm: res.distanceKm,
        startOdo: startKm,
        endOdo: endKm,
        vehicleReg: activeTrip.vehicle.registration_number,
        totalExpenses: totalTripExp,
        expensesCount: finalExpenses.length,
      });

      await loadDriverSession();
    } catch (err: unknown) {
      setEndTripError(err instanceof Error ? err.message : 'Failed to end trip');
    } finally {
      setIsSubmittingEndTrip(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F2F4F7] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-9 h-9 rounded-2xl bg-[#121316] text-white flex items-center justify-center font-black mx-auto animate-pulse">
            K
          </div>
          <p className="text-xs text-gray-500 font-medium">Connecting to fleet database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F4F7] text-[#121316] flex flex-col justify-between">
      <div className="w-full max-w-md mx-auto min-h-screen flex flex-col bg-[#F2F4F7] sm:shadow-2xl sm:border sm:border-gray-200/80 sm:my-3 sm:rounded-[36px] sm:overflow-hidden relative pb-20">
        {/* Top Bar: MoveIQ header with Kore logo */}
        <MoveIQTopBar />

        {/* Floating feedback message */}
        {expenseSuccessMsg && (
          <div className="mx-4 mt-2 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{expenseSuccessMsg}</span>
          </div>
        )}

        <div className="flex-1 px-4 py-3 space-y-4 overflow-y-auto no-scrollbar">
          {/* Driver Welcome Bar */}
          <div className="bg-white rounded-[24px] p-4 border border-gray-100 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Logged in as Driver
              </span>
              <h1 className="text-lg font-black text-[#121316] tracking-tight">
                {driver?.full_name || 'Driver'}
              </h1>
              <span className="text-xs text-gray-500 font-mono">
                {driver?.phone}
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-[#121316] text-white flex items-center justify-center font-bold text-sm">
              {driver?.full_name?.charAt(0) || 'D'}
            </div>
          </div>

          {activeNavTab === 'trip' ? (
            /* ============================================================ */
            /* TAB 1: TRIP WORKFLOW                                         */
            /* ============================================================ */
            <>
              {/* Rest Cooldown Alert Banner if blocked */}
              {!cooldownCheck.allowed && !activeTrip && (
                <div className="p-4 rounded-[24px] bg-amber-50 border border-amber-200/90 text-amber-900 space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-2 font-black text-sm">
                    <Timer className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>Mandatory Rest Period Active</span>
                  </div>
                  <p className="text-xs leading-relaxed text-amber-800 font-medium">
                    {cooldownCheck.reason}
                  </p>
                  <p className="text-[11px] text-amber-700/80 pt-1">
                    Please contact the fleet owner if you need assistance with an urgent assignment.
                  </p>
                </div>
              )}

              {/* Completed Summary Banner if just finished a trip */}
              {completedSummary && (
                <div className="bg-white rounded-[28px] p-5 border border-emerald-200/80 shadow-xs space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    <div>
                      <h3 className="font-black text-base text-[#121316]">
                        Trip Completed!
                      </h3>
                      <p className="text-xs text-emerald-700 font-medium">
                        {completedSummary.vehicleReg}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-[#F8F9FA] p-3 rounded-2xl text-center">
                    <div>
                      <p className="text-[11px] text-gray-400 font-medium">Total Distance Run</p>
                      <p className="text-2xl font-black text-[#121316]">
                        {completedSummary.distanceKm.toFixed(1)} km
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-400 font-medium">Odometer Range</p>
                      <p className="text-xs font-mono font-bold text-gray-700 mt-2">
                        {completedSummary.startOdo} → {completedSummary.endOdo}
                      </p>
                    </div>
                  </div>

                  {completedSummary.expensesCount !== undefined && completedSummary.expensesCount > 0 && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-center justify-between text-xs">
                      <span className="font-medium text-amber-900">Expenses Logged:</span>
                      <span className="font-extrabold text-amber-900">
                        ₹{(completedSummary.totalExpenses || 0).toLocaleString()} ({completedSummary.expensesCount})
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setCompletedSummary(null)}
                    className="w-full h-12 bg-[#121316] text-white text-xs font-bold rounded-2xl hover:bg-black transition-colors cursor-pointer"
                  >
                    Done (Return to Vehicle Select)
                  </button>
                </div>
              )}

              {/* STATE A: TRIP IS IN PROGRESS */}
              {activeTrip ? (
                <div className="space-y-4">
                  {/* Big Running State Card */}
                  <MoveIQDarkCard
                    title="Active Trip"
                    subtitle="Live duty tracking on the road"
                  >
                    <div className="space-y-4 pt-1">
                      {/* Vehicle & Status Pulse */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D4F65B] text-black mb-1">
                            <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
                            <span>On trip</span>
                          </div>
                          <h2 className="text-2xl font-black text-white tracking-tight">
                            {activeTrip.vehicle.registration_number}
                          </h2>
                          <p className="text-xs text-gray-400 font-medium">
                            {activeTrip.vehicle.make_model}
                          </p>
                        </div>

                        <div className="w-12 h-12 rounded-2xl bg-[#22242B] flex items-center justify-center shrink-0">
                          <Truck className="w-6 h-6 text-[#D4F65B]" />
                        </div>
                      </div>

                      {/* Metrics: Start KM & Start Time */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="bg-[#1E1F24] rounded-2xl p-3.5">
                          <span className="text-[11px] font-medium text-gray-400 block">
                            Starting KM
                          </span>
                          <p className="text-lg font-black text-white mt-0.5 font-mono">
                            {activeTrip.trip.start_odometer?.toLocaleString()} km
                          </p>
                        </div>

                        <div className="bg-[#1E1F24] rounded-2xl p-3.5">
                          <span className="text-[11px] font-medium text-gray-400 block">
                            Start Time
                          </span>
                          <p className="text-sm font-bold text-[#D4F65B] mt-1 truncate">
                            {activeTrip.trip.start_time
                              ? new Date(activeTrip.trip.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : 'Just now'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </MoveIQDarkCard>

                  {/* Big Action Buttons */}
                  <div className="space-y-3 pt-1">
                    {/* Button 1: Add Expense */}
                    <button
                      type="button"
                      onClick={() => setIsAddExpenseOpen(true)}
                      className="w-full h-14 bg-white border border-gray-200/90 hover:bg-gray-50 text-[#121316] rounded-[24px] shadow-sm flex items-center justify-between px-5 font-bold text-sm sm:text-base active:scale-[0.99] transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                          <Receipt className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <span>Add Expense</span>
                          <span className="block text-[11px] text-gray-400 font-normal">
                            Fuel, Toll, Maintenance
                          </span>
                        </div>
                      </div>
                      <Plus className="w-5 h-5 text-gray-400" />
                    </button>

                    {/* Button 2: End Trip */}
                    <button
                      type="button"
                      onClick={handleOpenEndTrip}
                      className="w-full h-15 bg-[#D4F65B] hover:bg-[#c9eb4f] text-[#121316] rounded-[24px] shadow-sm flex items-center justify-between px-5 font-extrabold text-base active:scale-[0.99] transition-all cursor-pointer"
                    >
                      <div className="text-left">
                        <span>End Trip</span>
                        <span className="block text-xs text-[#121316]/70 font-semibold">
                          Finish duty & enter ending KM
                        </span>
                      </div>
                      <ArrowRight className="w-5 h-5 text-[#121316]" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              ) : selectedVehicle ? (
                /* ============================================================ */
                /* STATE B: VEHICLE SELECTED -> STARTING KM (READONLY)          */
                /* ============================================================ */
                <div className="space-y-4">
                  {/* Selected Vehicle Card */}
                  <div className="bg-white rounded-[28px] p-5 border border-gray-100 shadow-2xs space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-2xl font-black text-[#121316] tracking-tight">
                          {selectedVehicle.registration_number}
                        </h2>
                        <p className="text-xs text-gray-500 font-medium">
                          {selectedVehicle.make_model}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedVehicle(null)}
                        className="text-xs font-bold text-gray-400 hover:text-black flex items-center gap-1 cursor-pointer pt-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Change</span>
                      </button>
                    </div>
                  </div>

                  {/* Start Trip Form with Auto-filled Starting KM (CANNOT BE EDITED) */}
                  <div className="bg-white rounded-[28px] p-6 border border-gray-100 shadow-sm space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-base font-black text-[#121316]">
                        Starting Odometer
                      </h3>
                      <p className="text-xs text-gray-500">
                        Auto-filled from vehicle&apos;s previous ending KM. Locked by system.
                      </p>
                    </div>

                    {startTripError && (
                      <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{startTripError}</span>
                      </div>
                    )}

                    <form onSubmit={handleStartTrip} className="space-y-4">
                      {/* Readonly locked starting KM */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                          <span>Starting KM (Locked)</span>
                          <span className="flex items-center gap-1 text-[11px] text-gray-400 font-normal">
                            <Lock className="w-3 h-3 text-gray-400" />
                            <span>Auto-filled</span>
                          </span>
                        </label>
                        <div className="relative">
                          <Gauge className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <div className="w-full h-14 pl-12 pr-4 bg-[#F2F4F7] border border-gray-200/90 rounded-2xl flex items-center justify-between text-xl font-mono font-black text-[#121316] select-none">
                            <span>{startOdoDisplay.toLocaleString()}</span>
                            <span className="text-xs font-sans font-bold text-gray-500">KM</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Destination / Route Note (Optional)
                        </label>
                        <input
                          type="text"
                          value={destinationInput}
                          onChange={(e) => setDestinationInput(e.target.value)}
                          placeholder="e.g. Mukkam, Calicut City Corridor"
                          className="w-full h-12 px-4 bg-[#F8F9FA] border border-gray-200 rounded-2xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                        />
                      </div>

                      {/* BIG START TRIP BUTTON */}
                      <button
                        type="submit"
                        disabled={isStartingTrip || !cooldownCheck.allowed}
                        className="w-full h-16 bg-[#121316] hover:bg-black text-white rounded-[24px] shadow-md flex items-center justify-center gap-3 font-extrabold text-base active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 mt-2"
                      >
                        <Play className="w-5 h-5 text-[#D4F65B] fill-[#D4F65B]" />
                        <span>{isStartingTrip ? 'Capturing GPS & Starting...' : 'Start Trip'}</span>
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                /* ============================================================ */
                /* STATE C: VEHICLE SELECTION LIST                              */
                /* ============================================================ */
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <h2 className="text-xl font-black text-[#121316] tracking-tight">
                      Select Vehicle
                    </h2>
                    <p className="text-xs text-gray-500 font-medium">
                      Tap the vehicle you are driving today
                    </p>
                  </div>

                  {/* Filter chips */}
                  <MoveIQFilterChips
                    options={[
                      { id: 'all', label: 'All Fleet', count: vehicles.length },
                      {
                        id: 'Delhivery',
                        label: 'Delhivery',
                        count: vehicles.filter((v) => (v as unknown as { company_name?: string }).company_name === 'Delhivery').length,
                      },
                      {
                        id: 'Shadowfax',
                        label: 'Shadowfax',
                        count: vehicles.filter((v) => (v as unknown as { company_name?: string }).company_name === 'Shadowfax').length,
                      },
                    ]}
                    activeId={companyFilter}
                    onSelect={(id) => setCompanyFilter(id as typeof companyFilter)}
                  />

                  {/* Vehicle Cards List */}
                  <div className="space-y-2.5">
                    {vehicles
                      .filter((v) => {
                        if (companyFilter === 'all') return true;
                        const cName = (v as unknown as { company_name?: string }).company_name || '';
                        return cName.toLowerCase() === companyFilter.toLowerCase();
                      })
                      .map((v) => {
                        // Check if in use by another driver
                        const live = dataRepo.getActiveTripForVehicle(v.id);
                        const isBlocked = !!live && live.driver.id !== driver?.id;
                        const isMyActiveTrip = !!live && live.driver.id === driver?.id;

                        return (
                          <div
                            key={v.id}
                            onClick={() => {
                              if (!isBlocked && cooldownCheck.allowed) {
                                handleSelectVehicle(v);
                              } else if (!cooldownCheck.allowed) {
                                alert(cooldownCheck.reason || 'Rest period active');
                              }
                            }}
                            className={`p-4 sm:p-5 rounded-[26px] border transition-all ${
                              isBlocked || !cooldownCheck.allowed
                                ? 'bg-gray-100/70 border-gray-200/60 opacity-65 cursor-not-allowed'
                                : 'bg-white border-gray-100 shadow-2xs hover:shadow-xs hover:border-gray-200 cursor-pointer active:scale-[0.99]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                                    isBlocked
                                      ? 'bg-gray-200 text-gray-500'
                                      : 'bg-[#121316] text-white shadow-2xs'
                                  }`}
                                >
                                  <Truck className="w-6 h-6" strokeWidth={1.8} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h3 className="font-extrabold text-[#121316] text-base tracking-tight">
                                      {v.registration_number}
                                    </h3>
                                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                                      {(v as unknown as { company_name?: string }).company_name || 'Delhivery'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                                    {v.make_model} • {v.route_location || 'Ad-hoc'}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <p className="text-xs font-mono font-bold text-gray-600">
                                  {v.current_odometer.toLocaleString()} km
                                </p>
                              </div>
                            </div>

                            {/* Status indicator */}
                            <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                              {isBlocked ? (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600">
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>
                                    Busy: On trip with {live?.driver.full_name}
                                  </span>
                                </div>
                              ) : isMyActiveTrip ? (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                  <span>You are currently on this trip</span>
                                </div>
                              ) : !cooldownCheck.allowed ? (
                                <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                                  <Timer className="w-3.5 h-3.5" />
                                  <span>Rest period required</span>
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                  <span>Tap to drive</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ============================================================ */
            /* TAB 2: MY RECENT TRIPS & EXPENSES                            */
            /* ============================================================ */
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-xl font-black text-[#121316] tracking-tight">
                  My Trips & Expenses
                </h2>
                <p className="text-xs text-gray-500 font-medium">
                  Your past trips and logged expenses
                </p>
              </div>

              {/* Driver Stats Summary */}
              <MoveIQDarkCard
                title="Work Overview"
                subtitle="Your total performance this month"
              >
                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  <div className="bg-[#1E1F24] rounded-2xl p-3 text-center">
                    <p className="text-[10px] text-gray-400 font-medium">Trips</p>
                    <p className="text-xl font-black text-white mt-0.5">
                      {driverSummary?.totalTripsCount || 0}
                    </p>
                  </div>
                  <div className="bg-[#1E1F24] rounded-2xl p-3 text-center">
                    <p className="text-[10px] text-gray-400 font-medium">Days</p>
                    <p className="text-xl font-black text-[#D4F65B] mt-0.5">
                      {driverSummary?.totalDaysWorked || 0}
                    </p>
                  </div>
                  <div className="bg-[#1E1F24] rounded-2xl p-3 text-center">
                    <p className="text-[10px] text-gray-400 font-medium">Distance</p>
                    <p className="text-xl font-black text-white mt-0.5">
                      {driverSummary?.totalKilometers || 0} km
                    </p>
                  </div>
                </div>
              </MoveIQDarkCard>

              {/* Recent Trips Section */}
              <div className="bg-white rounded-[28px] p-5 border border-gray-100 shadow-2xs space-y-3">
                <h3 className="text-sm font-extrabold text-[#121316] uppercase tracking-wider">
                  Recent Trips
                </h3>

                {driverSummary?.tripDetails.length === 0 ? (
                  <p className="text-xs text-gray-400 py-3 text-center">No trips recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {driverSummary?.tripDetails.slice(0, 10).map((trip) => (
                      <div
                        key={trip.tripId}
                        className="p-3 rounded-2xl bg-[#F8F9FA] border border-gray-100 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <p className="font-bold text-[#121316]">
                            {trip.dutyDate} • {trip.vehicleRegistration}
                          </p>
                          <p className="text-gray-500">{trip.destination}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-[#121316] text-sm">
                            {trip.distance} km
                          </p>
                          <p className="text-gray-400 font-mono text-[10px]">
                            {trip.startOdo} → {trip.endOdo}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Expenses Section */}
              <div className="bg-white rounded-[28px] p-5 border border-gray-100 shadow-2xs space-y-3">
                <h3 className="text-sm font-extrabold text-[#121316] uppercase tracking-wider">
                  Expenses Entered
                </h3>

                {driverExpenses.length === 0 ? (
                  <p className="text-xs text-gray-400 py-3 text-center">No expenses entered yet.</p>
                ) : (
                  <div className="space-y-2">
                    {driverExpenses.map((exp) => (
                      <div
                        key={exp.id}
                        className="p-3 rounded-2xl bg-[#F8F9FA] border border-gray-100 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#121316]">{exp.expense_type}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-500">{exp.date}</span>
                          </div>
                          {exp.note && <p className="text-gray-500 mt-0.5">{exp.note}</p>}
                        </div>
                        <div className="text-right">
                          <span className="font-black text-sm text-[#121316]">
                            ₹{Number(exp.amount).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MoveIQ Bottom Navigation: Drive & My Trips */}
        <MoveIQBottomNav
          role="driver"
          activeTab={activeNavTab}
          onTabChange={(tab) => {
            setActiveNavTab(tab as 'trip' | 'history');
            router.replace(`/driver?tab=${tab}`);
          }}
        />

        {/* Modal: Add Expense While Trip is Running */}
        {isAddExpenseOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white rounded-[32px] p-6 max-w-sm w-full space-y-4 shadow-2xl border border-gray-100 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-[#121316]">
                    Trip Expenses
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Enter whatever applies. All optional, at least one required.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(false)}
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

              <form onSubmit={handleAddExpenseSubmit} className="space-y-3">
                {/* Fuel Amount */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase flex items-center gap-1.5">
                    <Fuel className="w-3.5 h-3.5 text-amber-500" />
                    <span>Fuel Amount (₹)</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    placeholder="Optional (e.g. 2500)"
                    value={expFuelAmount}
                    onChange={(e) => setExpFuelAmount(e.target.value)}
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-bold text-[#121316] focus:outline-none focus:border-gray-400"
                    autoFocus
                  />
                </div>

                {/* Toll Amount */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-blue-500" />
                    <span>Toll Amount (₹)</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    placeholder="Optional (e.g. 320)"
                    value={expTollAmount}
                    onChange={(e) => setExpTollAmount(e.target.value)}
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-bold text-[#121316] focus:outline-none focus:border-gray-400"
                  />
                </div>

                {/* Maintenance Amount */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-rose-500" />
                    <span>Maintenance Amount (₹)</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    placeholder="Optional (e.g. 800)"
                    value={expMaintAmount}
                    onChange={(e) => setExpMaintAmount(e.target.value)}
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-bold text-[#121316] focus:outline-none focus:border-gray-400"
                  />
                </div>

                {/* Note Field (Optional) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HP Petrol Pump / Tire repair"
                    value={expNote}
                    onChange={(e) => setExpNote(e.target.value)}
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm text-[#121316] focus:outline-none focus:border-gray-400"
                  />
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddExpenseOpen(false)}
                    className="flex-1 h-12 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingExpense}
                    className="flex-1 h-12 rounded-xl bg-[#121316] text-[#D4F65B] font-bold text-xs hover:bg-black cursor-pointer shadow-sm"
                  >
                    {isSubmittingExpense ? 'Saving...' : 'Submit Expenses'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: End Trip Confirmation */}
        {isEndTripOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white rounded-[32px] p-6 max-w-sm w-full space-y-4 shadow-2xl border border-gray-100 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-[#121316]">
                  End Trip
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEndTripOpen(false)}
                  className="p-1 rounded-full text-gray-400 hover:text-black cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-gray-500">
                Starting KM was{' '}
                <span className="font-mono font-bold text-[#121316]">
                  {activeTrip?.trip.start_odometer}
                </span>
                . Enter final odometer reading (must be greater).
              </p>

              {endTripError && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{endTripError}</span>
                </div>
              )}

              <form onSubmit={handleConfirmEndTrip} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700 uppercase">
                    Ending KM
                  </label>
                  <div className="relative">
                    <Gauge className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="number"
                      step="0.1"
                      value={endOdoInput}
                      onChange={(e) => setEndOdoInput(e.target.value)}
                      className="w-full h-14 pl-12 pr-4 bg-[#F8F9FA] border border-gray-200 rounded-2xl text-xl font-mono font-black text-[#121316] focus:outline-none focus:border-gray-400"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {/* Live Distance calculation */}
                {parseFloat(endOdoInput) > (activeTrip?.trip.start_odometer || 0) && (
                  <div className="p-3 bg-[#D4F65B]/25 border border-[#D4F65B] rounded-2xl text-center">
                    <span className="text-[11px] font-bold text-gray-600 uppercase">
                      Distance Run
                    </span>
                    <p className="text-xl font-black text-[#121316]">
                      {(parseFloat(endOdoInput) - (activeTrip?.trip.start_odometer || 0)).toFixed(1)}{' '}
                      km
                    </p>
                  </div>
                )}

                {/* Trip Expenses (Single Form) */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase">
                      Trip Expenses (Optional)
                    </label>
                    <p className="text-[11px] text-gray-500 font-medium">
                      Fill whatever applies. All optional, no separate entries needed.
                    </p>
                  </div>

                  <div className="space-y-2.5 bg-[#F8F9FA] p-3 rounded-2xl border border-gray-200/80">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-700 uppercase flex items-center gap-1">
                          <Fuel className="w-3 h-3 text-amber-500" />
                          <span>Fuel (₹)</span>
                        </label>
                        <input
                          type="number"
                          placeholder="₹ Amount"
                          value={endFuelAmount}
                          onChange={(e) => setEndFuelAmount(e.target.value)}
                          className="w-full h-10 px-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-[#121316] focus:outline-none focus:border-gray-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-700 uppercase flex items-center gap-1">
                          <Receipt className="w-3 h-3 text-blue-500" />
                          <span>Toll (₹)</span>
                        </label>
                        <input
                          type="number"
                          placeholder="₹ Amount"
                          value={endTollAmount}
                          onChange={(e) => setEndTollAmount(e.target.value)}
                          className="w-full h-10 px-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-[#121316] focus:outline-none focus:border-gray-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-700 uppercase flex items-center gap-1">
                          <Wrench className="w-3 h-3 text-rose-500" />
                          <span>Maint (₹)</span>
                        </label>
                        <input
                          type="number"
                          placeholder="₹ Amount"
                          value={endMaintAmount}
                          onChange={(e) => setEndMaintAmount(e.target.value)}
                          className="w-full h-10 px-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-[#121316] focus:outline-none focus:border-gray-400"
                        />
                      </div>
                    </div>

                    <input
                      type="text"
                      placeholder="Optional expense note (e.g. HP Fuel Pump / Puncture)"
                      value={endExpenseNote}
                      onChange={(e) => setEndExpenseNote(e.target.value)}
                      className="w-full h-9 px-2.5 bg-white border border-gray-200 rounded-xl text-xs text-[#121316] focus:outline-none focus:border-gray-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Trip Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Route clear, delivered on time"
                    value={endTripNotes}
                    onChange={(e) => setEndTripNotes(e.target.value)}
                    className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm text-[#121316] focus:outline-none focus:border-gray-400"
                  />
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEndTripOpen(false)}
                    className="flex-1 h-12 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEndTrip}
                    className="flex-1 h-12 rounded-xl bg-[#121316] text-white font-bold text-xs hover:bg-black cursor-pointer shadow-sm"
                  >
                    {isSubmittingEndTrip ? 'Saving & Ending...' : 'Confirm & Finish'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Subtle Centered Nalakath Footer */}
        <footer className="text-center py-4 text-[11px] font-medium text-gray-400">
          Nalakath Logistics • Developed by Kore
        </footer>

        {/* MoveIQ Bottom Navigation for Driver */}
        <MoveIQBottomNav
          role="driver"
          activeTab={activeNavTab}
          onTabChange={(tab) => {
            setActiveNavTab(tab as 'trip' | 'history');
            router.replace(`/driver${tab === 'history' ? '?tab=history' : ''}`);
          }}
        />
      </div>
    </div>
  );
}

export default function DriverDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F2F4F7] flex items-center justify-center">
          <p className="text-xs text-gray-500 font-medium">Connecting to fleet database...</p>
        </div>
      }
    >
      <DriverDashboardContent />
    </Suspense>
  );
}
