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
import { MoveIQLimeHeroCard } from '@/components/moveiq/MoveIQLimeHeroCard';
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
  IndianRupee,
  Lock,
  ChevronRight,
  X,
  History,
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
  const [startOdoInput, setStartOdoInput] = useState('');
  const [destinationInput, setDestinationInput] = useState('');
  const [isStartingTrip, setIsStartingTrip] = useState(false);
  const [startTripError, setStartTripError] = useState<string | null>(null);

  // Add Expense Modal (while trip is running)
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [expType, setExpType] = useState<ExpenseType>('Fuel');
  const [expAmount, setExpAmount] = useState('');
  const [expLitres, setExpLitres] = useState('');
  const [expNote, setExpNote] = useState('');
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [expenseSuccessMsg, setExpenseSuccessMsg] = useState<string | null>(null);

  // End Trip Modal
  const [isEndTripOpen, setIsEndTripOpen] = useState(false);
  const [endOdoInput, setEndOdoInput] = useState('');
  const [endTripNotes, setEndTripNotes] = useState('');
  const [endTripExpenses, setEndTripExpenses] = useState<
    Array<{ expense_type: ExpenseType; amount: number; litres?: number; note?: string }>
  >([]);
  const [isSubmittingEndTrip, setIsSubmittingEndTrip] = useState(false);
  const [endTripError, setEndTripError] = useState<string | null>(null);

  // Completed trip summary state
  const [completedSummary, setCompletedSummary] = useState<{
    distanceKm: number;
    startOdo: number;
    endOdo: number;
    vehicleReg: string;
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
        router.push('/login');
        return;
      }
      setProfile(p);

      const allDrivers = await dataRepo.getDrivers();
      const matched = allDrivers.find(
        (d) =>
          d.profile_id === p.id ||
          d.phone.replace(/[\s-]/g, '') === p.phone.replace(/[\s-]/g, '')
      );

      if (!matched) {
        router.push('/login');
        return;
      }
      setDriver(matched);

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
    const interval = setInterval(loadDriverSession, 4000);
    return () => clearInterval(interval);
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

    setSelectedVehicle(v);
    setStartOdoInput(String(v.current_odometer));
    setDestinationInput(v.route_location || 'Ad-hoc Route');
    setStartTripError(null);
  };

  // Start Trip
  const handleStartTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driver || !selectedVehicle) return;
    const startKm = parseFloat(startOdoInput);
    if (isNaN(startKm) || startKm < 0) {
      setStartTripError('Please enter a valid Starting KM');
      return;
    }

    setIsStartingTrip(true);
    setStartTripError(null);
    try {
      // Automatically capture GPS location (non-blocking fallback to null if permission denied)
      const startLocation = await captureCurrentLocation();

      const trip = await dataRepo.startTripForDriver({
        driverPhoneOrId: driver.id,
        vehicleId: selectedVehicle.id,
        startOdometer: startKm,
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

  // Add Expense while running
  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driver || !activeTrip) return;
    const amount = parseFloat(expAmount);
    if (isNaN(amount) || amount <= 0) return;

    setIsSubmittingExpense(true);
    try {
      await dataRepo.createExpense({
        vehicle_id: activeTrip.vehicle.id,
        driver_id: driver.id,
        expense_type: expType,
        amount,
        litres: expType === 'Fuel' ? parseFloat(expLitres) || null : null,
        note: expNote.trim() || null,
      });

      setIsAddExpenseOpen(false);
      setExpAmount('');
      setExpLitres('');
      setExpNote('');
      setExpenseSuccessMsg('Expense added successfully!');
      setTimeout(() => setExpenseSuccessMsg(null), 3000);
      await loadDriverSession();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // Open End Trip Modal
  const handleOpenEndTrip = () => {
    if (!activeTrip) return;
    const currentOdo = activeTrip.trip.start_odometer || activeTrip.vehicle.current_odometer;
    setEndOdoInput(String(currentOdo + 10)); // prefill with logical next km
    setEndTripNotes('');
    setEndTripExpenses([]);
    setEndTripError(null);
    setIsEndTripOpen(true);
  };

  // Confirm End Trip
  const handleConfirmEndTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip) return;
    const startKm = activeTrip.trip.start_odometer || 0;
    const endKm = parseFloat(endOdoInput);

    if (isNaN(endKm) || endKm < startKm) {
      setEndTripError(
        `Ending KM (${endKm}) must be greater than or equal to Starting KM (${startKm})`
      );
      return;
    }

    setIsSubmittingEndTrip(true);
    try {
      // Automatically capture GPS location upon ending trip (non-blocking fallback to null)
      const endLocation = await captureCurrentLocation();

      const res = await dataRepo.completeTrip({
        tripId: activeTrip.trip.id,
        endOdometer: endKm,
        notes: endTripNotes.trim() || null,
        endLocation,
        expenses: endTripExpenses.map((exp) => ({
          expense_type: exp.expense_type,
          amount: exp.amount,
          litres: exp.litres,
          note: exp.note,
        })),
      });

      setIsEndTripOpen(false);
      setActiveTrip(null);
      setCompletedSummary({
        distanceKm: res.distanceKm,
        startOdo: startKm,
        endOdo: endKm,
        vehicleReg: activeTrip.vehicle.registration_number,
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
          <div className="w-8 h-8 rounded-xl bg-[#121316] text-white flex items-center justify-center font-black mx-auto animate-pulse">
            N
          </div>
          <p className="text-xs text-gray-500 font-medium">Loading driver portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F4F7] text-[#121316] flex flex-col justify-between">
      <div className="w-full max-w-md mx-auto min-h-screen flex flex-col bg-[#F2F4F7] sm:shadow-2xl sm:border sm:border-gray-200/80 sm:my-3 sm:rounded-[36px] sm:overflow-hidden relative pb-20">
        {/* Top Bar: MoveIQ header */}
        <MoveIQTopBar />

        {/* Floating feedback message */}
        {expenseSuccessMsg && (
          <div className="mx-4 mt-2 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{expenseSuccessMsg}</span>
          </div>
        )}

        <div className="flex-1 px-4 py-3 space-y-4 overflow-y-auto no-scrollbar">
          {activeNavTab === 'trip' ? (
            /* ============================================================ */
            /* TAB 1: TODAY'S TRIP WORKFLOW                                 */
            /* ============================================================ */
            <>
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
                      <p className="text-[11px] text-gray-400 font-medium">Total Distance</p>
                      <p className="text-xl font-black text-[#121316]">
                        {completedSummary.distanceKm} km
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-400 font-medium">Odometer Range</p>
                      <p className="text-xs font-mono font-bold text-gray-700 mt-1">
                        {completedSummary.startOdo} → {completedSummary.endOdo}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCompletedSummary(null)}
                    className="w-full h-11 bg-[#121316] text-white text-xs font-bold rounded-2xl hover:bg-black transition-colors cursor-pointer"
                  >
                    Start Another Trip
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
                      {/* Vehicle & Pulse Dot */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D4F65B] text-black mb-1">
                            <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
                            <span>On the road</span>
                          </div>
                          <h2 className="text-2xl font-black text-white tracking-tight">
                            {activeTrip.vehicle.registration_number}
                          </h2>
                          <p className="text-xs text-gray-400 font-medium">
                            {activeTrip.vehicle.make_model} • {activeTrip.vehicle.company || 'Delhivery'}
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
                            Trip Status
                          </span>
                          <p className="text-lg font-black text-[#D4F65B] mt-0.5">
                            Trip #{activeTrip.trip.trip_number}
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
                            Fuel, Toll, Maintenance or Other
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
                          Finish duty & record end odometer
                        </span>
                      </div>
                      <ArrowRight className="w-5 h-5 text-[#121316]" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              ) : selectedVehicle ? (
                /* ============================================================ */
                /* STATE B: VEHICLE SELECTED -> ENTER STARTING KM               */
                /* ============================================================ */
                <div className="space-y-4">
                  {/* Selected Vehicle Card */}
                  <div className="bg-white rounded-[28px] p-5 border border-gray-100 shadow-2xs space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gray-100 text-gray-700">
                          {selectedVehicle.company || 'Delhivery'}
                        </span>
                        <h2 className="text-2xl font-black text-[#121316] tracking-tight mt-1">
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

                  {/* Start Trip Form with Big Starting KM Input */}
                  <div className="bg-white rounded-[28px] p-6 border border-gray-100 shadow-sm space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-base font-black text-[#121316]">
                        Enter Starting KM
                      </h3>
                      <p className="text-xs text-gray-500">
                        Check vehicle dashboard meter and enter reading
                      </p>
                    </div>

                    {startTripError && (
                      <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{startTripError}</span>
                      </div>
                    )}

                    <form onSubmit={handleStartTrip} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Starting KM
                        </label>
                        <div className="relative">
                          <Gauge className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="number"
                            step="0.1"
                            value={startOdoInput}
                            onChange={(e) => setStartOdoInput(e.target.value)}
                            className="w-full h-14 pl-12 pr-4 bg-[#F8F9FA] border border-gray-200 rounded-2xl text-xl font-mono font-black text-[#121316] focus:outline-none focus:border-gray-400 focus:bg-white"
                            required
                            autoFocus
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Route / Destination
                        </label>
                        <input
                          type="text"
                          value={destinationInput}
                          onChange={(e) => setDestinationInput(e.target.value)}
                          placeholder="e.g. Mukkam, Kozhikode, Ad-hoc Corridor"
                          className="w-full h-12 px-4 bg-[#F8F9FA] border border-gray-200 rounded-2xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                        />
                      </div>

                      {/* BIG START TRIP BUTTON */}
                      <button
                        type="submit"
                        disabled={isStartingTrip}
                        className="w-full h-16 bg-[#121316] hover:bg-black text-white rounded-[24px] shadow-md flex items-center justify-center gap-3 font-extrabold text-base active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 mt-2"
                      >
                        <Play className="w-5 h-5 text-[#D4F65B] fill-[#D4F65B]" />
                        <span>{isStartingTrip ? 'Starting Trip...' : 'Start Trip'}</span>
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

                  {/* Filter chips like MoveIQ */}
                  <MoveIQFilterChips
                    options={[
                      { id: 'all', label: 'All Fleet', count: vehicles.length },
                      {
                        id: 'Delhivery',
                        label: 'Delhivery',
                        count: vehicles.filter((v) => (v.company || '').toLowerCase() === 'delhivery').length,
                      },
                      {
                        id: 'Shadowfax',
                        label: 'Shadowfax',
                        count: vehicles.filter((v) => (v.company || '').toLowerCase() === 'shadowfax').length,
                      },
                    ]}
                    activeId={companyFilter}
                    onSelect={(id) => setCompanyFilter(id as typeof companyFilter)}
                  />

                  {/* Vehicle Cards Grid / List */}
                  <div className="space-y-2.5">
                    {vehicles
                      .filter((v) => {
                        if (companyFilter === 'all') return true;
                        return (v.company || '').toLowerCase() === companyFilter.toLowerCase();
                      })
                      .map((v) => {
                        // Check if on trip by another driver
                        const live = dataRepo.getActiveTripForVehicle(v.id);
                        const isBlocked = !!live && live.driver.id !== driver?.id;
                        const isMyActiveTrip = !!live && live.driver.id === driver?.id;

                        return (
                          <div
                            key={v.id}
                            onClick={() => {
                              if (!isBlocked) {
                                handleSelectVehicle(v);
                              }
                            }}
                            className={`p-4 sm:p-5 rounded-[26px] border transition-all ${
                              isBlocked
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
                                      {v.company || 'Delhivery'}
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

                            {/* Blocked or Available Status */}
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
                                  <span>You are on this trip</span>
                                </div>
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
                  Your past trips and recorded expenses
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
                    {driverSummary?.tripDetails.slice(0, 10).map((trip: DriverMonthlySummary['tripDetails'][0]) => (
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
                            ₹{exp.amount.toLocaleString()}
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

        {/* MoveIQ Bottom Navigation: Today's Trip & My History */}
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
                <h3 className="text-base font-black text-[#121316]">
                  Add Expense
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="p-1 rounded-full text-gray-400 hover:text-black cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddExpenseSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Expense Type
                  </label>
                  <select
                    value={expType}
                    onChange={(e) => setExpType(e.target.value as ExpenseType)}
                    className="w-full h-12 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400 cursor-pointer"
                  >
                    <option value="Fuel">Fuel (Diesel / Petrol)</option>
                    <option value="Toll">Toll</option>
                    <option value="Maintenance">Maintenance & Repair</option>
                    <option value="Other">Other Expense</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="1"
                    placeholder="e.g. 1500"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    className="w-full h-12 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-lg font-bold text-[#121316] focus:outline-none focus:border-gray-400"
                    required
                    autoFocus
                  />
                </div>

                {expType === 'Fuel' && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase">
                      Litres (Optional)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 20"
                      value={expLitres}
                      onChange={(e) => setExpLitres(e.target.value)}
                      className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm text-[#121316] focus:outline-none focus:border-gray-400"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Note / Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Fuel pump / Puncture"
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
                    className="flex-1 h-12 rounded-xl bg-[#121316] text-white font-bold text-xs hover:bg-black cursor-pointer"
                  >
                    {isSubmittingExpense ? 'Saving...' : 'Save Expense'}
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
                . Enter final odometer reading.
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
                {parseFloat(endOdoInput) >= (activeTrip?.trip.start_odometer || 0) && (
                  <div className="p-3 bg-[#D4F65B]/25 border border-[#D4F65B] rounded-2xl text-center">
                    <span className="text-[11px] font-bold text-gray-600 uppercase">
                      Distance Run
                    </span>
                    <p className="text-xl font-black text-[#121316]">
                      {Math.max(
                        0,
                        parseFloat(endOdoInput) - (activeTrip?.trip.start_odometer || 0)
                      ).toFixed(1)}{' '}
                      km
                    </p>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Any trip details"
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
                    {isSubmittingEndTrip ? 'Ending Trip...' : 'Confirm & Finish'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Subtle Kore Footer */}
        <footer className="text-center py-4 text-[11px] font-medium text-gray-400">
          Designed and developed by Kore
        </footer>
      </div>
    </div>
  );
}

export default function DriverDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F2F4F7] flex items-center justify-center">
          <p className="text-xs text-gray-500 font-medium">Loading driver portal...</p>
        </div>
      }
    >
      <DriverDashboardContent />
    </Suspense>
  );
}
