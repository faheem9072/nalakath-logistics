'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { dataRepo } from '@/lib/data-service';
import { AssignmentWithDetails, ExpenseWithDetails } from '@/types/models';
import { Trip, Profile, Vehicle, Driver } from '@/types/database';
import { getTodayDateString } from '@/lib/mock/mock-store';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { CompleteTripModal } from '@/components/driver-portal/CompleteTripModal';
import { LanguageSwitcher, useLanguage } from '@/lib/i18n/LanguageContext';
import { InstallPwaButton } from '@/components/layout/InstallPwaButton';
import {
  Truck,
  Gauge,
  MapPin,
  Play,
  CheckCircle,
  History,
  LogOut,
  Phone,
  RefreshCw,
  Plus,
  Receipt,
  Fuel,
  Wrench,
  Car,
  Camera,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ArrowRight,
  Disc,
  Clock,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { NalakathLogo } from '@/components/brand/NalakathLogo';

const COMMON_MAINTENANCE_ISSUES = [
  { id: 'tyre_puncture', en: 'Tyre Puncture / Replace', ml: 'ടയർ പഞ്ചർ / മാറ്റൽ', icon: '🛞' },
  { id: 'oil_change', en: 'Engine Oil / Filter Service', ml: 'ഓയിൽ മാറ്റം / സർവീസ്', icon: '🛢️' },
  { id: 'brake_service', en: 'Brake Repair / Pads', ml: 'ബ്രേക്ക് റിപ്പയർ', icon: '🛑' },
  { id: 'battery_service', en: 'Battery Repair / Replacement', ml: 'ബാറ്ററി സർവീസ്', icon: '🔋' },
  { id: 'wash_grease', en: 'Washing & Greasing', ml: 'വാഷിംഗ് & ഗ്രീസിംഗ്', icon: '🧼' },
  { id: 'general_repair', en: 'General Workshop / Mechanical', ml: 'ജനറൽ വർക്ക്‌ഷോപ്പ്', icon: '🛠️' },
  { id: 'spare_parts', en: 'Spare Parts / Other Repair', ml: 'സ്പെയർ പാർട്സ് / മറ്റുള്ളവ', icon: '🔩' },
];

export default function DriverPortalPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();

  // Core authenticated state
  const [profile, setProfile] = useState<Profile | null>(null);
  const [driverRecord, setDriverRecord] = useState<Driver | null>(null);
  const [allRegisteredDrivers, setAllRegisteredDrivers] = useState<Driver[]>([]);
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [driverExpenses, setDriverExpenses] = useState<ExpenseWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Alerts
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [formattedToday, setFormattedToday] = useState<string>('');

  // Login states (supports 1-tap driver quick pick + manual name/phone entry)
  const [driverName, setDriverName] = useState<string>('');
  const [loginPhone, setLoginPhone] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Quick Punch-In / Trip form states
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [startOdometerInput, setStartOdometerInput] = useState<string>('');
  const [routeDestinationInput, setRouteDestinationInput] = useState<string>('Ad-hoc Corridor');
  const [isStartingTrip, setIsStartingTrip] = useState<boolean>(false);
  const [isChangingVehicle, setIsChangingVehicle] = useState<boolean>(false);

  // Active in-progress trip and complete modal
  const [completeTripModalTrip, setCompleteTripModalTrip] = useState<Trip | null>(null);

  // DEDICATED MAINTENANCE MODAL
  const [isAddMaintenanceOpen, setIsAddMaintenanceOpen] = useState(false);
  const [maintVehicleId, setMaintVehicleId] = useState<string>('');
  const [maintIssueType, setMaintIssueType] = useState<string>('Tyre Puncture / Replace');
  const [maintAmount, setMaintAmount] = useState<string>('');
  const [maintGarage, setMaintGarage] = useState<string>('');
  const [maintDate, setMaintDate] = useState<string>('');
  const [maintPhotoUrl, setMaintPhotoUrl] = useState<string | null>(null);
  const [isSubmittingMaint, setIsSubmittingMaint] = useState(false);

  // DEDICATED FUEL MODAL
  const [isAddFuelOpen, setIsAddFuelOpen] = useState(false);
  const [fuelVehicleId, setFuelVehicleId] = useState<string>('');
  const [fuelAmount, setFuelAmount] = useState<string>('');
  const [fuelLitres, setFuelLitres] = useState<string>('');
  const [fuelDate, setFuelDate] = useState<string>('');
  const [fuelNote, setFuelNote] = useState<string>('');
  const [fuelPhotoUrl, setFuelPhotoUrl] = useState<string | null>(null);
  const [isSubmittingFuel, setIsSubmittingFuel] = useState(false);

  // DEDICATED TOLL MODAL
  const [isAddTollOpen, setIsAddTollOpen] = useState(false);
  const [tollVehicleId, setTollVehicleId] = useState<string>('');
  const [tollAmount, setTollAmount] = useState<string>('');
  const [tollPlaza, setTollPlaza] = useState<string>('');
  const [tollDate, setTollDate] = useState<string>('');
  const [isSubmittingToll, setIsSubmittingToll] = useState(false);

  // Expense list details toggle & receipt preview
  const [isExpensesExpanded, setIsExpensesExpanded] = useState<boolean>(false);
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const vList = await dataRepo.getVehicles();
      setVehicles(vList);

      const allDrivers = await dataRepo.getDrivers();
      setAllRegisteredDrivers(allDrivers);

      const p = await dataRepo.getCurrentProfile();
      setProfile(p);

      // If no driver session is active
      if (!p || p.role !== 'driver') {
        setDriverRecord(null);
        setAssignments([]);
        setDriverExpenses([]);
        setIsLoading(false);
        return;
      }

      // Match authenticated driver record
      const dRec = allDrivers.find(
        (d) =>
          d.phone.replace(/[\s-]/g, '') === p.phone.replace(/[\s-]/g, '') ||
          d.profile_id === p.id
      );

      if (!dRec) {
        setDriverRecord(null);
        setAssignments([]);
        setDriverExpenses([]);
        setIsLoading(false);
        return;
      }

      setDriverRecord(dRec);

      // Fetch driver duties strictly for this authenticated driver
      const list = await dataRepo.getDriverAssignments(dRec.phone);
      setAssignments(list);

      // Fetch driver's expenses
      const expList = await dataRepo.getDriverExpenses(dRec.phone);
      setDriverExpenses(expList);

      // Determine initial vehicle for punch-in / expenses
      let initialVeh = vList[0];
      if (list.length > 0 && list[0].vehicle) {
        initialVeh = list[0].vehicle;
      } else {
        // Check if driver has a default vehicle
        const defaultVeh = vList.find(
          (v) =>
            v.default_driver_ids?.includes(dRec.id) ||
            (v.default_driver_names || []).some(
              (n) => n.toLowerCase() === dRec.full_name.toLowerCase()
            )
        );
        if (defaultVeh) initialVeh = defaultVeh;
      }

      if (initialVeh) {
        setSelectedVehicleId((prev) => prev || initialVeh.id);
        setMaintVehicleId((prev) => prev || initialVeh.id);
        setFuelVehicleId((prev) => prev || initialVeh.id);
        setTollVehicleId((prev) => prev || initialVeh.id);
        setStartOdometerInput(String(initialVeh.current_odometer));
      }
    } catch (err) {
      console.error('Failed to load driver portal data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Synchronize start odometer input when selected vehicle changes
  useEffect(() => {
    if (selectedVehicleId && vehicles.length > 0) {
      const veh = vehicles.find((v) => v.id === selectedVehicleId);
      if (veh) {
        setStartOdometerInput(String(veh.current_odometer));
        setMaintVehicleId(veh.id);
        setFuelVehicleId(veh.id);
        setTollVehicleId(veh.id);
      }
    }
  }, [selectedVehicleId, vehicles]);

  // Date formatted header
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
    const today = getTodayDateString();
    setMaintDate(today);
    setFuelDate(today);
    setTollDate(today);
    loadData();
  }, []);

  // Quick 1-Tap Driver Login by selecting profile
  const handleQuickDriverSelect = async (driver: Driver) => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await dataRepo.loginDriverByNameAndPhone(driver.full_name, driver.phone);
      await loadData();
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Simple Driver Phone Sign In
  const handleDriverLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    let cleaned = loginPhone.trim().replace(/[\s-]/g, '');
    if (!cleaned) {
      setLoginError(
        lang === 'ml'
          ? 'ദയവായി ഓണർ നൽകിയ മൊബൈൽ നമ്പർ നൽകുക'
          : 'Please enter your registered mobile number'
      );
      return;
    }

    if (cleaned.length === 10 && !cleaned.startsWith('+')) {
      cleaned = `+91${cleaned}`;
    }
    if (!cleaned.match(/^\+?[1-9]\d{9,14}$/)) {
      setLoginError(
        lang === 'ml'
          ? 'ശരിയായ 10 അക്ക മൊബൈൽ നമ്പർ നൽകുക'
          : 'Please enter a valid 10-digit mobile number'
      );
      return;
    }

    setIsLoggingIn(true);
    try {
      await dataRepo.loginDriverByPhone(cleaned);
      setDriverName('');
      setLoginPhone('');
      await loadData();
    } catch (err: unknown) {
      setLoginError(
        err instanceof Error
          ? err.message
          : 'Failed to sign in. Please verify your mobile number with fleet owner.'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Direct, Foolproof Punch-In (Start Trip)
  const handleDirectPunchIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverRecord || !selectedVehicleId) return;

    const odo = parseFloat(startOdometerInput);
    if (isNaN(odo) || odo < 0) {
      setActionError(
        lang === 'ml'
          ? 'ശരിയായ മീറ്റർ റീഡിങ് (കിലോമീറ്റർ) നൽകുക.'
          : 'Please enter a valid numeric starting kilometer reading.'
      );
      return;
    }

    setIsStartingTrip(true);
    setActionError(null);

    try {
      await dataRepo.startTripForDriver({
        driverPhoneOrId: driverRecord.phone,
        vehicleId: selectedVehicleId,
        startOdometer: odo,
        destination: routeDestinationInput.trim() || undefined,
        notes: `Trip started by ${driverRecord.full_name} (${odo} km)`,
      });

      setActionSuccess(
        lang === 'ml'
          ? '🟢 ട്രിപ്പ് വിജയകരമായി തുടങ്ങി! പഞ്ച് ഇൻ പൂർത്തിയായി. സുരക്ഷിതമായി ഡ്രൈവ് ചെയ്യുക.'
          : '🟢 Trip started successfully! Safe driving.'
      );
      await loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to start trip / പഞ്ച് ചെയ്യാൻ സാധിച്ചില്ല.'
      );
    } finally {
      setIsStartingTrip(false);
    }
  };

  // Submit Dedicated Maintenance Entry
  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverRecord || !maintVehicleId || !maintAmount) return;

    const parsedAmount = parseFloat(maintAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setActionError(
        lang === 'ml' ? 'ശരിയായ തുക (INR ₹) നൽകുക.' : 'Please enter a valid maintenance amount.'
      );
      return;
    }

    setIsSubmittingMaint(true);
    setActionError(null);

    try {
      await dataRepo.recordMaintenance({
        vehicle_id: maintVehicleId,
        driver_id: driverRecord.id,
        amount: parsedAmount,
        issue_type: maintIssueType,
        workshop_name: maintGarage.trim() || null,
        date: maintDate || getTodayDateString(),
        bill_photo_url: maintPhotoUrl,
      });

      setIsAddMaintenanceOpen(false);
      setMaintAmount('');
      setMaintGarage('');
      setMaintPhotoUrl(null);
      setActionSuccess(
        lang === 'ml'
          ? '🔧 മെയിന്റനൻസ് വിവരങ്ങൾ വിജയകരമായി ചേർത്തു!'
          : '🔧 Vehicle maintenance recorded successfully!'
      );
      await loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to record maintenance'
      );
    } finally {
      setIsSubmittingMaint(false);
    }
  };

  // Submit Dedicated Fuel Entry
  const handleSaveFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverRecord || !fuelVehicleId || !fuelAmount) return;

    const parsedAmount = parseFloat(fuelAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setActionError(
        lang === 'ml' ? 'ശരിയായ ഇന്ധന തുക നൽകുക.' : 'Please enter a valid fuel amount.'
      );
      return;
    }

    setIsSubmittingFuel(true);
    setActionError(null);

    try {
      await dataRepo.createExpense({
        vehicle_id: fuelVehicleId,
        driver_id: driverRecord.id,
        expense_type: 'Fuel',
        amount: parsedAmount,
        litres: parseFloat(fuelLitres) || null,
        date: fuelDate || getTodayDateString(),
        note: fuelNote.trim() || 'Diesel top-up',
        bill_photo_url: fuelPhotoUrl,
      });

      setIsAddFuelOpen(false);
      setFuelAmount('');
      setFuelLitres('');
      setFuelNote('');
      setFuelPhotoUrl(null);
      setActionSuccess(
        lang === 'ml'
          ? '⛽ ഇന്ധനം (ഡീസൽ) ചെലവ് വിജയകരമായി രേഖപ്പെടുത്തി!'
          : '⛽ Fuel top-up expense recorded successfully!'
      );
      await loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to record fuel');
    } finally {
      setIsSubmittingFuel(false);
    }
  };

  // Submit Dedicated Toll Entry
  const handleSaveToll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverRecord || !tollVehicleId || !tollAmount) return;

    const parsedAmount = parseFloat(tollAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setActionError(
        lang === 'ml' ? 'ശരിയായ ടോൾ തുക നൽകുക.' : 'Please enter a valid toll amount.'
      );
      return;
    }

    setIsSubmittingToll(true);
    setActionError(null);

    try {
      await dataRepo.createExpense({
        vehicle_id: tollVehicleId,
        driver_id: driverRecord.id,
        expense_type: 'Toll',
        amount: parsedAmount,
        date: tollDate || getTodayDateString(),
        note: tollPlaza.trim() || 'Highway toll ticket',
      });

      setIsAddTollOpen(false);
      setTollAmount('');
      setTollPlaza('');
      setActionSuccess(
        lang === 'ml'
          ? '🧾 ടോൾ ചെലവ് വിജയകരമായി രേഖപ്പെടുത്തി!'
          : '🧾 Toll expense recorded successfully!'
      );
      await loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to record toll');
    } finally {
      setIsSubmittingToll(false);
    }
  };

  // Identify currently active trip across all duties
  const activeDuty = assignments.find((a) =>
    a.trips?.some((tr) => tr.status === 'in_progress')
  );
  const activeTrip = activeDuty?.trips?.find((tr) => tr.status === 'in_progress');

  // Currently selected vehicle object
  const currentVehicle =
    vehicles.find((v) => v.id === selectedVehicleId) ||
    assignments[0]?.vehicle ||
    vehicles[0];

  // All completed trips today
  const allCompletedTrips = assignments.flatMap(
    (a) => a.trips?.filter((tr) => tr.status === 'completed') || []
  );

  const totalMyExpenses = driverExpenses.reduce((sum, e) => sum + e.amount, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <NalakathLogo size="md" variant="circle" />
          <p className="text-xs font-bold text-slate-400 animate-pulse">
            Loading Nalakath Driver Portal...
          </p>
        </div>
      </div>
    );
  }

  // 1. DRIVER LOGIN SCREEN (Simplified 1-tap selection + manual phone sign in)
  if (!driverRecord) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center px-4 py-8">
        <div className="max-w-md w-full mx-auto space-y-4">
          <div className="flex items-center justify-between mb-2">
            <Link
              href="/dashboard"
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              ← {lang === 'ml' ? 'ഓണർ ഡാഷ്‌ബോർഡ്' : 'Owner Dashboard'}
            </Link>
            <LanguageSwitcher />
          </div>

          <div className="text-center flex flex-col items-center">
            <div className="p-2.5 bg-black rounded-full shadow-lg border border-slate-800 mb-2">
              <NalakathLogo size="md" variant="circle" />
            </div>
            <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">
              NALAKATH LOGISTICS
            </h1>
            <p className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">
              {lang === 'ml' ? 'ഡ്രൈവർ മൊബൈൽ പഞ്ച് പോർട്ടൽ' : 'Driver Mobile Punch Portal'}
            </p>
          </div>

          <Card className="border-2 border-slate-200 shadow-md bg-white rounded-2xl overflow-hidden">
            <div className="bg-slate-900 text-white p-4 text-center space-y-1">
              <h2 className="text-sm font-black uppercase tracking-wider">
                {lang === 'ml' ? 'ഡ്രൈവർ ലോഗിൻ & പഞ്ച്' : 'Driver Mobile Sign In'}
              </h2>
              <p className="text-xs text-slate-300">
                {lang === 'ml'
                  ? 'നിങ്ങളുടെ പേര് ടാപ്പ് ചെയ്യുക അല്ലെങ്കിൽ മൊബൈൽ നമ്പർ നൽകുക.'
                  : 'Select your driver profile below or enter your registered phone number.'}
              </p>
            </div>

            <CardContent className="p-5 space-y-5">
              {loginError && <Alert variant="danger">{loginError}</Alert>}

              {/* 1-Tap Quick Driver Profile Selection */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  {lang === 'ml'
                    ? '👉 നിങ്ങളുടെ പേര് തിരഞ്ഞെടുക്കുക (1-ക്ലിക്ക് ലോഗിൻ)'
                    : '👉 Select Your Name (1-Tap Login)'}
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {allRegisteredDrivers.map((drv) => (
                    <button
                      key={drv.id}
                      type="button"
                      disabled={isLoggingIn}
                      onClick={() => handleQuickDriverSelect(drv)}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-500 text-left transition-all active:scale-95 cursor-pointer flex items-center justify-between group"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-black text-slate-900 group-hover:text-emerald-700 truncate">
                          {drv.full_name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {drv.phone.slice(-4)}
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0 ml-1" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200" />
                <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase">
                  {lang === 'ml' ? 'അല്ലെങ്കിൽ ഫോൺ നമ്പർ നൽകുക' : 'Or Enter Phone Number'}
                </span>
                <div className="flex-grow border-t border-slate-200" />
              </div>

              {/* Simple Mobile Number Sign In */}
              <form onSubmit={handleDriverLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    {lang === 'ml' ? 'ഡ്രൈവർ മൊബൈൽ നമ്പർ (10 Digits)' : 'Driver Registered Mobile Number'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-mono font-bold text-slate-500">
                      +91
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="9847123456"
                      value={loginPhone.replace('+91', '')}
                      onChange={(e) => setLoginPhone(e.target.value)}
                      className="w-full text-base font-mono font-bold py-3 pl-12 pr-3 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900"
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {lang === 'ml'
                      ? 'ഓണർ നൽകിയ 10 അക്ക മൊബൈൽ നമ്പർ മാത്രം നൽകുക'
                      : 'Enter the 10-digit mobile number given by the fleet owner'}
                  </p>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isLoggingIn}
                  className="w-full py-3.5 text-base font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md min-h-[48px] cursor-pointer"
                >
                  {lang === 'ml' ? '👉 ലോഗിൻ ചെയ്യുക (Sign In)' : '👉 Sign In & Start Duty'}
                </Button>
              </form>

              <div className="pt-2 text-center">
                <a
                  href="tel:+919876543200"
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {lang === 'ml' ? 'ഹെൽപ്പ്‌ലൈൻ: 9876543200 (ഷബീറലി)' : 'Helpline: 9876543200 (Shabeerali)'}
                  </span>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 2. MAIN AUTHENTICATED DRIVER PORTAL
  return (
    <div className="min-h-screen bg-slate-100 pb-20">
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
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs font-black text-white truncate max-w-[130px]">
                  {driverRecord.full_name}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">
                  ({driverRecord.phone.slice(-4)})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />

            <button
              onClick={async () => {
                await dataRepo.logout();
                setDriverRecord(null);
                setProfile(null);
                setAssignments([]);
                setDriverExpenses([]);
              }}
              title={t('logout')}
              className="px-2 py-1 text-rose-300 hover:text-rose-100 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 cursor-pointer rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t('logout')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto px-3.5 py-3 space-y-3.5">
        {actionError && <Alert variant="danger">{actionError}</Alert>}
        {actionSuccess && <Alert variant="success">{actionSuccess}</Alert>}

        {/* Driver Status Banner */}
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

          <div className="flex items-center justify-between pt-0.5">
            <h1 className="text-base font-black tracking-tight">
              👋 {t('welcomeGreeting')}, {driverRecord.full_name.split(' ')[0]}!
            </h1>
            <button
              onClick={loadData}
              className="text-xs text-blue-300 hover:text-white font-bold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{t('refreshBtn')}</span>
            </button>
          </div>
        </div>

        {/* 3 QUICK ACTION BUTTONS: MAINTENANCE | FUEL | TOLL */}
        <div className="grid grid-cols-3 gap-2">
          {/* Add Maintenance Button */}
          <button
            type="button"
            onClick={() => setIsAddMaintenanceOpen(true)}
            className="py-2.5 px-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-sm transition-all flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 border border-amber-400"
          >
            <Wrench className="w-4 h-4 fill-white" />
            <span className="text-[11px] leading-tight text-center">
              {lang === 'ml' ? 'മെയിന്റനൻസ്' : 'Maintenance'}
            </span>
          </button>

          {/* Add Fuel Button */}
          <button
            type="button"
            onClick={() => setIsAddFuelOpen(true)}
            className="py-2.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-sm transition-all flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 border border-blue-500"
          >
            <Fuel className="w-4 h-4" />
            <span className="text-[11px] leading-tight text-center">
              {lang === 'ml' ? 'ഡീസൽ / ഇന്ധനം' : 'Add Fuel'}
            </span>
          </button>

          {/* Add Toll Button */}
          <button
            type="button"
            onClick={() => setIsAddTollOpen(true)}
            className="py-2.5 px-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-sm transition-all flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 border border-purple-500"
          >
            <Receipt className="w-4 h-4" />
            <span className="text-[11px] leading-tight text-center">
              {lang === 'ml' ? 'ടോൾ ടിക്കറ്റ്' : 'Add Toll'}
            </span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* PRIMARY PUNCH CARD: EITHER LIVE DRIVING OR START KILOMETER */}
        {/* ============================================================ */}
        {activeTrip ? (
          /* STATE 1: DELHI-VERY STYLE ACTIVE USAGE SCREEN (FROM PHOTO) */
          <div className="space-y-3.5">
            {/* Top Vehicle & Driver Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center p-1.5 shrink-0">
                  <Truck className="w-7 h-7 text-slate-800" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-bold">
                    Hello,
                  </div>
                  <div className="text-sm font-black text-slate-900 leading-tight">
                    {driverRecord.full_name}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs font-bold text-slate-700">
                      {activeDuty?.vehicle.registration_number || currentVehicle?.registration_number}
                    </span>
                    <span className="text-[10px] text-slate-300">•</span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.2 rounded-full">
                      Adhoc
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsChangingVehicle(!isChangingVehicle)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
              >
                Change
              </button>
            </div>

            {/* Title: Recent Usage (Confirm within 3 days) */}
            <div className="text-xs font-bold text-slate-600 px-1">
              Recent Usage (Confirm within 3 days)
            </div>

            {/* Delhivery Usage Card */}
            <div className="bg-white border-2 border-slate-200/90 rounded-2xl p-4 space-y-4 shadow-xs">
              {/* Total Distance Box */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  Total Distance
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="117.01"
                    value={activeTrip.end_odometer && activeTrip.start_odometer ? (activeTrip.end_odometer - activeTrip.start_odometer).toFixed(2) : '117.01'}
                    readOnly
                    onClick={() => setCompleteTripModalTrip(activeTrip)}
                    className="w-full text-2xl sm:text-3xl font-black font-mono px-3.5 py-3 bg-slate-50/80 border border-slate-300 rounded-xl text-slate-900 cursor-pointer shadow-inner"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 uppercase">
                    KM
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 px-1">
                  <span>Start Odometer:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {activeTrip.start_odometer?.toLocaleString()} km
                  </span>
                </div>
              </div>

              {/* Total Duration */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  Total Duration
                </label>
                <div className="flex items-center justify-between border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5">
                  <span className="text-lg font-bold text-slate-400">-</span>
                  <span className="text-sm font-bold text-slate-800 font-mono">12 hrs 0 mins</span>
                  <span className="text-lg font-bold text-slate-400">+</span>
                </div>
              </div>

              {/* Adhoc Ticket ID & Usage Time */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">
                    Adhoc Ticket ID
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    #{activeTrip.id.replace('trip-', '').slice(-7)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">
                    Usage Time
                  </span>
                  <span className="text-[11px] font-semibold text-slate-700 leading-tight block">
                    {new Date(activeTrip.start_time || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to Now
                  </span>
                </div>
              </div>

              {/* Upload Parking Charge & Trip Expenses */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setCompleteTripModalTrip(activeTrip)}
                  className="text-blue-600 font-bold hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Upload Parking / Fuel / Toll Charge</span>
                </button>
                <span className="text-[10px] text-slate-400">optional</span>
              </div>

              {/* Big Blue Confirm Button (Exact Delhivery Photo Style) */}
              <button
                type="button"
                onClick={() => setCompleteTripModalTrip(activeTrip)}
                className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-base font-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
              >
                <CheckCircle className="w-5 h-5" />
                <span>Confirm</span>
              </button>
            </div>
          </div>
        ) : (
          /* STATE 2: READY TO START (ENTER START KILOMETER & PUNCH IN) */
          <Card className="border-2 border-emerald-500 shadow-md bg-white rounded-2xl overflow-hidden">
            <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black">
                <Truck className="w-4 h-4 text-emerald-400" />
                <span>
                  {lang === 'ml'
                    ? 'വണ്ടിയിൽ കയറുക — സ്റ്റാർട്ട് ചെയ്യുക'
                    : 'Get In Vehicle — Punch In'}
                </span>
              </div>
              <span className="text-[10px] bg-emerald-950 text-emerald-400 font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-800">
                Ready to Punch
              </span>
            </div>

            <CardContent className="p-4 space-y-4">
              <form onSubmit={handleDirectPunchIn} className="space-y-4">
                {/* Vehicle Selection Box */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50/70 border-2 border-blue-200 p-3.5 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-blue-900">
                      {lang === 'ml' ? 'തിരഞ്ഞെടുത്ത വണ്ടി' : 'Vehicle to Drive'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsChangingVehicle(!isChangingVehicle)}
                      className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Car className="w-3.5 h-3.5" />
                      <span>{isChangingVehicle ? 'Done' : (lang === 'ml' ? 'വണ്ടി മാറ്റുക' : 'Change Vehicle')}</span>
                    </button>
                  </div>

                  {isChangingVehicle ? (
                    <div>
                      <select
                        value={selectedVehicleId}
                        onChange={(e) => setSelectedVehicleId(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                        required
                      >
                        {vehicles.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.registration_number} — {v.make_model} ({v.current_odometer} km) [{v.company}]
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <div className="text-2xl font-black text-slate-900 font-mono tracking-wider">
                        {currentVehicle?.registration_number || 'KL 84 B 3057'}
                      </div>
                      <div className="text-xs font-semibold text-slate-600 flex items-center justify-between">
                        <span>{currentVehicle?.make_model}</span>
                        <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.2 rounded-full">
                          {currentVehicle?.company || 'Delhivery'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Big Start Kilometer Box */}
                <div className="bg-emerald-50/70 border-2 border-emerald-400 rounded-2xl p-4 text-center space-y-2">
                  <label className="block text-xs font-black text-emerald-950 uppercase tracking-wider">
                    {lang === 'ml'
                      ? 'തുടങ്ങുന്ന കിലോമീറ്റർ (Starting KM)'
                      : 'Starting Meter Reading (Kilometer)'}{' '}
                    <span className="text-rose-500">*</span>
                  </label>

                  <div className="relative max-w-xs mx-auto">
                    <input
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      value={startOdometerInput}
                      onChange={(e) => setStartOdometerInput(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      required
                      placeholder="e.g. 54930"
                      className="w-full text-center text-3xl sm:text-4xl font-black font-mono tracking-wider py-3 px-3 bg-white border-2 border-emerald-500 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 text-slate-900 shadow-inner"
                    />
                  </div>

                  <p className="text-xs text-slate-600 flex items-center justify-center gap-1 font-medium">
                    <Gauge className="w-3.5 h-3.5 text-emerald-700" />
                    <span>
                      {lang === 'ml' ? 'മുമ്പത്തെ മീറ്റർ റീഡിങ്:' : 'Previous vehicle meter:'}{' '}
                      <strong className="font-mono text-slate-900">
                        {currentVehicle?.current_odometer?.toLocaleString()} km
                      </strong>
                    </span>
                  </p>
                </div>

                {/* Optional Destination */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {lang === 'ml' ? 'ലൊക്കേഷൻ / റൂട്ട് (Route / Destination)' : 'Corridor / Destination'}
                  </label>
                  <input
                    type="text"
                    value={routeDestinationInput}
                    onChange={(e) => setRouteDestinationInput(e.target.value)}
                    placeholder="e.g. Ad-hoc Corridor / Mukkam / Calicut"
                    className="w-full text-xs font-bold py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800"
                  />
                </div>

                {/* Giant Green Punch In Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isStartingTrip}
                  leftIcon={<Play className="w-5 h-5 fill-white" />}
                  className="w-full py-4 text-base font-black shadow-lg bg-emerald-600 hover:bg-emerald-700 active:scale-98 transition-all flex items-center justify-center gap-2 rounded-xl min-h-[54px] cursor-pointer text-white"
                >
                  <span>
                    {lang === 'ml'
                      ? '🟢 വണ്ടി സ്റ്റാർട്ട് ചെയ്യുക (PUNCH IN)'
                      : '🟢 START TRIP / PUNCH IN'}
                  </span>
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* TODAY'S LOGGED TRIPS */}
        {allCompletedTrips.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-2">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1">
                <History className="w-3.5 h-3.5 text-slate-600" />
                <span>
                  {lang === 'ml' ? 'ഇന്ന് ഓടിയ ട്രിപ്പുകൾ' : "Today's Logged Trips"} (
                  {allCompletedTrips.length})
                </span>
              </span>
            </div>

            <div className="space-y-1.5">
              {allCompletedTrips.map((tr) => {
                const dist =
                  tr.start_odometer && tr.end_odometer
                    ? (tr.end_odometer - tr.start_odometer).toFixed(1)
                    : '—';
                return (
                  <div
                    key={tr.id}
                    className="flex items-center justify-between text-xs bg-slate-50 px-3 py-2 rounded-xl border border-slate-200"
                  >
                    <div>
                      <span className="font-black text-slate-900 block text-xs">
                        Trip #{tr.trip_number}
                      </span>
                      <span className="font-mono text-slate-500 text-[10px]">
                        {tr.start_odometer} → {tr.end_odometer} km
                      </span>
                    </div>
                    <span className="font-black text-emerald-600 font-mono text-sm bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                      +{dist} km
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PREVIOUS USAGE (EXACT REPLICA FROM USER DELHIVERY PHOTO) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
          <div className="text-xs font-bold text-slate-600">
            Previous Usage
          </div>

          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-emerald-800 text-xs font-bold">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Vehicle usage accepted</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[11px] font-bold text-slate-400 block uppercase">Total Distance</span>
              <span className="font-mono font-black text-slate-900 text-base">
                {allCompletedTrips[0]?.end_odometer && allCompletedTrips[0]?.start_odometer
                  ? `${(allCompletedTrips[0].end_odometer - allCompletedTrips[0].start_odometer).toFixed(1)}`
                  : '90.0'} km
              </span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block uppercase">Total Duration</span>
              <span className="font-bold text-slate-800 text-sm">12 hrs 0 mins</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
            <div>
              <span className="text-[11px] font-bold text-slate-400 block uppercase">Adhoc Ticket ID</span>
              <span className="font-mono font-bold text-slate-800">
                #{allCompletedTrips[0]?.id ? allCompletedTrips[0].id.replace('trip-', '').slice(-7) : '6061086'}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block uppercase">Usage Time</span>
              <span className="text-[11px] text-slate-700 leading-tight block">
                {allCompletedTrips[0]?.start_time
                  ? new Date(allCompletedTrips[0].start_time).toLocaleDateString([], { day: 'numeric', month: 'short' })
                  : '7-Sep'} 5:33 AM to 5:33 PM
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsExpensesExpanded(!isExpensesExpanded)}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            View All Last 7 Day Usages
          </button>
        </div>

        {/* MY EXPENSES & MAINTENANCE SECTION */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {lang === 'ml' ? 'എന്റെ ചെലവുകൾ & മെയിന്റനൻസ്' : 'My Expenses & Repairs'}
                </span>
                <span className="text-base font-black font-mono text-slate-900">
                  ₹{totalMyExpenses.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsAddMaintenanceOpen(true)}
                className="py-1 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>{lang === 'ml' ? 'മെയിന്റനൻസ്' : 'Maintenance'}</span>
              </button>

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
                          exp.expense_type === 'Maintenance'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : exp.expense_type === 'Fuel'
                            ? 'bg-blue-100 text-blue-900 border border-blue-300'
                            : exp.expense_type === 'Toll'
                            ? 'bg-purple-100 text-purple-900 border border-purple-300'
                            : 'bg-slate-200 text-slate-800'
                        }`}
                      >
                        {exp.expense_type === 'Maintenance' ? '🔧 Maintenance' : exp.expense_type}
                      </span>
                      <span className="font-mono text-slate-500 text-[10px]">{exp.date}</span>
                    </div>

                    <div className="font-bold text-slate-900 font-mono text-[11px]">
                      {exp.vehicle?.registration_number || 'Vehicle'}
                    </div>

                    {exp.note && (
                      <div className="text-[10px] text-slate-600 max-w-xs truncate font-medium">
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
                        <span>Bill / Receipt</span>
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

      {/* ============================================================ */}
      {/* 1. DEDICATED ADD MAINTENANCE MODAL */}
      {/* ============================================================ */}
      {isAddMaintenanceOpen && (
        <Modal
          isOpen={isAddMaintenanceOpen}
          onClose={() => setIsAddMaintenanceOpen(false)}
          title={lang === 'ml' ? '🔧 വാഹന മെയിന്റനൻസ് / റിപ്പയർ' : '🔧 Record Vehicle Maintenance'}
          description={
            lang === 'ml'
              ? 'ടയർ പഞ്ചർ, ഓയിൽ സർവീസ്, ബ്രേക്ക്, ബാറ്ററി എന്നിവയുടെ ചെലവ് രേഖപ്പെടുത്തുക.'
              : 'Log workshop repairs, tyre punctures, oil servicing, and spare parts.'
          }
          maxWidth="md"
        >
          <form onSubmit={handleSaveMaintenance} className="space-y-4">
            {/* Vehicle Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {lang === 'ml' ? 'വാഹനം (Vehicle)' : 'Vehicle'}
              </label>
              <select
                value={maintVehicleId}
                onChange={(e) => setMaintVehicleId(e.target.value)}
                className="w-full px-3 py-2.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                required
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration_number} — {v.make_model} ({v.company})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Issue Chips */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {lang === 'ml' ? 'നടന്ന പണി / അറ്റകുറ്റപ്പണി തിരഞ്ഞെടുക്കുക' : 'Select Work / Issue Type'}
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {COMMON_MAINTENANCE_ISSUES.map((issue) => (
                  <button
                    key={issue.id}
                    type="button"
                    onClick={() => setMaintIssueType(lang === 'ml' ? issue.ml : issue.en)}
                    className={`p-2 text-xs font-bold rounded-xl border text-left flex items-center gap-1.5 transition-all cursor-pointer ${
                      maintIssueType === (lang === 'ml' ? issue.ml : issue.en) ||
                      maintIssueType === issue.en
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{issue.icon}</span>
                    <span className="truncate">{lang === 'ml' ? issue.ml : issue.en}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount & Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {lang === 'ml' ? 'ചെലവായ തുക (₹)' : 'Cost / Amount (₹)'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 850"
                  value={maintAmount}
                  onChange={(e) => setMaintAmount(e.target.value)}
                  className="w-full px-3 py-2.5 text-base font-mono font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {lang === 'ml' ? 'തീയതി (Date)' : 'Date'}
                </label>
                <input
                  type="date"
                  value={maintDate}
                  onChange={(e) => setMaintDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
            </div>

            {/* Garage / Workshop Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {lang === 'ml' ? 'വർക്ക്‌ഷോപ്പ് / കടയുടെ പേര് (ഓപ്ഷണൽ)' : 'Workshop / Garage Name (Optional)'}
              </label>
              <input
                type="text"
                placeholder={lang === 'ml' ? 'ഉദാ: റോയൽ ടയർ വർക്സ്, കോഴിക്കോട്' : 'e.g. Highway Garage, Calicut'}
                value={maintGarage}
                onChange={(e) => setMaintGarage(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900"
              />
            </div>

            {/* Bill Photo Upload */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {lang === 'ml' ? 'ബില്ലിന്റെ ഫോട്ടോ (ഓപ്ഷണൽ)' : 'Bill / Receipt Photo (Optional)'}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setMaintPhotoUrl(ev.target?.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-50 file:text-amber-800 hover:file:bg-amber-100 cursor-pointer"
              />
              {maintPhotoUrl && (
                <div className="mt-2 relative w-16 h-16 rounded-lg overflow-hidden border border-slate-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={maintPhotoUrl} alt="Bill preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setIsAddMaintenanceOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmittingMaint}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                {lang === 'ml' ? '💾 മെയിന്റനൻസ് സേവ് ചെയ്യുക' : 'Save Maintenance'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ============================================================ */}
      {/* 2. DEDICATED ADD FUEL MODAL */}
      {/* ============================================================ */}
      {isAddFuelOpen && (
        <Modal
          isOpen={isAddFuelOpen}
          onClose={() => setIsAddFuelOpen(false)}
          title={lang === 'ml' ? '⛽ ഇന്ധനം (ഡീസൽ) ചേർക്കുക' : '⛽ Record Fuel (Diesel)'}
          description="Log diesel top-up amount, litres, and fuel pump receipt."
          maxWidth="md"
        >
          <form onSubmit={handleSaveFuel} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Vehicle
              </label>
              <select
                value={fuelVehicleId}
                onChange={(e) => setFuelVehicleId(e.target.value)}
                className="w-full px-3 py-2.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                required
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration_number} — {v.make_model}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 2100"
                  value={fuelAmount}
                  onChange={(e) => setFuelAmount(e.target.value)}
                  className="w-full px-3 py-2.5 text-base font-mono font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Litres (Optional)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 21.5"
                  value={fuelLitres}
                  onChange={(e) => setFuelLitres(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm font-mono font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={fuelDate}
                  onChange={(e) => setFuelDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Pump Name / Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. IOCL Calicut Bypass"
                  value={fuelNote}
                  onChange={(e) => setFuelNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Bill photo upload */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Bill Photo (Optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => setFuelPhotoUrl(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
                className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setIsAddFuelOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmittingFuel}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Save Fuel
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ============================================================ */}
      {/* 3. DEDICATED ADD TOLL MODAL */}
      {/* ============================================================ */}
      {isAddTollOpen && (
        <Modal
          isOpen={isAddTollOpen}
          onClose={() => setIsAddTollOpen(false)}
          title={lang === 'ml' ? '🧾 ടോൾ ടിക്കറ്റ് ചേർക്കുക' : '🧾 Record Toll'}
          description="Log highway toll plaza expense."
          maxWidth="sm"
        >
          <form onSubmit={handleSaveToll} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Vehicle
              </label>
              <select
                value={tollVehicleId}
                onChange={(e) => setTollVehicleId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600"
                required
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration_number} — {v.make_model}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Toll Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                placeholder="e.g. 150"
                value={tollAmount}
                onChange={(e) => setTollAmount(e.target.value)}
                className="w-full px-3 py-2.5 text-base font-mono font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Toll Plaza / Details
              </label>
              <input
                type="text"
                placeholder="e.g. Pantheeramkavu Toll Plaza"
                value={tollPlaza}
                onChange={(e) => setTollPlaza(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setIsAddTollOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmittingToll}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
              >
                Save Toll
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* COMPLETE TRIP MODAL (ENDING KM & CLEAR EXPENSES) */}
      {completeTripModalTrip && (
        <CompleteTripModal
          isOpen={!!completeTripModalTrip}
          onClose={() => setCompleteTripModalTrip(null)}
          onSuccess={loadData}
          trip={completeTripModalTrip}
          vehicleReg={activeDuty?.vehicle.registration_number || currentVehicle?.registration_number}
          driverName={driverRecord?.full_name}
        />
      )}

      {/* RECEIPT PREVIEW MODAL */}
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
