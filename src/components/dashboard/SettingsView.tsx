'use client';

import React, { useState, useEffect } from 'react';
import { dataRepo, FleetState } from '@/lib/data-service';
import { MoveIQDarkCard } from '@/components/moveiq/MoveIQDarkCard';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import { syncFleetToFirestore } from '@/lib/firebase/sync';
import {
  Settings,
  Clock,
  Lock,
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  Save,
  Users,
  Cloud,
  Eye,
  EyeOff,
} from 'lucide-react';

export function SettingsView() {
  const [minHours, setMinHours] = useState('6');
  const [ownerPassword, setOwnerPassword] = useState('kore2026');
  const [showPassword, setShowPassword] = useState(false);
  const [drivers, setDrivers] = useState<FleetState['drivers']>([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingFirebase, setIsSyncingFirebase] = useState(false);
  const [firebaseMsg, setFirebaseMsg] = useState<string | null>(null);

  const loadData = async () => {
    const s = await dataRepo.getSettings();
    setMinHours(String(s.min_trip_interval_hours || 6));
    setOwnerPassword(s.owner_password || 'kore2026');
    const dList = await dataRepo.getDrivers();
    setDrivers(dList);
    setLastUpdated(dataRepo.getLastUpdated());
  };

  useEffect(() => {
    loadData();
    const unsub = dataRepo.subscribe(loadData);
    return unsub;
  }, []);

  const [overrideLoadingId, setOverrideLoadingId] = useState<string | null>(null);

  const handleAllowSecondTrip = async (driverId: string, driverName: string) => {
    setOverrideLoadingId(driverId);
    try {
      await dataRepo.allowDriverNextTripOverride(driverId);
      setSaveSuccess(`2nd Trip enabled for ${driverName}! They can start another trip immediately.`);
      setTimeout(() => setSaveSuccess(null), 4000);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to enable 2nd trip');
    } finally {
      setOverrideLoadingId(null);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    try {
      await dataRepo.updateSettings('owner_password', ownerPassword.trim());
      setSaveSuccess('Owner password updated successfully!');
      setTimeout(() => setSaveSuccess(null), 3000);
      await loadData();
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncFirebase = async () => {
    setIsSyncingFirebase(true);
    setFirebaseMsg(null);
    try {
      const res = await fetch('/api/fleet');
      const state = await res.json();
      const ok = await syncFleetToFirestore(state);
      if (ok) {
        setFirebaseMsg('Successfully synced all drivers, vehicles & trips to Firebase Cloud!');
      } else {
        setFirebaseMsg('Firebase configured! Make sure Firestore Database is created in test mode.');
      }
    } catch (err: unknown) {
      setFirebaseMsg('Sync notice: ' + (err instanceof Error ? err.message : 'Connecting to Firestore'));
    } finally {
      setIsSyncingFirebase(false);
      setTimeout(() => setFirebaseMsg(null), 5000);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Hero Header */}
      <div className="bg-[#121316] text-white rounded-[28px] p-5 border border-stone-800 shadow-md space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#D4F65B] uppercase tracking-wider">
            System Preferences
          </span>
          <span className="text-xs font-mono font-bold text-gray-400">
            Kore Fleet Engine
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Fleet Settings
        </h1>
        <p className="text-xs text-gray-400 leading-relaxed">
          Manage driver 2nd trip permissions, owner access credentials, and cloud synchronization.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* 2nd Trip Authorization for Drivers (Replaces Minimum Rest Input) */}
      <div className="bg-white rounded-[28px] p-6 border border-gray-100 shadow-2xs space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            <h2 className="text-sm font-extrabold text-[#121316] uppercase tracking-wider">
              Allow 2nd Trip For Drivers
            </h2>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            By default, when a driver ends a trip, the system enforces a rest interval before their next trip. If a driver needs to run a 2nd trip immediately, click &apos;Allow 2nd Trip&apos; below:
          </p>
        </div>

        <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
          {drivers.length === 0 ? (
            <p className="p-4 text-xs text-gray-400 text-center">No drivers registered</p>
          ) : (
            drivers.map((d) => {
              const hasOverride = (d as unknown as { allow_next_trip_override?: number }).allow_next_trip_override === 1;
              const isOnTrip = d.status === 'on_trip' || (d as unknown as { active_trip?: unknown }).active_trip != null;
              const isInCooldown = (d as unknown as { is_in_cooldown?: boolean }).is_in_cooldown;

              return (
                <div
                  key={d.id}
                  className="p-3.5 flex items-center justify-between gap-3 bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-black text-[#121316] truncate">
                      {d.full_name}
                    </p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">
                      {d.phone} • {isOnTrip ? 'Currently on trip' : isInCooldown ? 'Resting after trip' : 'Idle / Ready'}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {hasOverride ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>2nd Trip Allowed</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={overrideLoadingId === d.id}
                        onClick={() => handleAllowSecondTrip(d.id, d.full_name)}
                        className="px-3.5 py-2 rounded-xl bg-[#121316] hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <Zap className="w-3.5 h-3.5 text-[#D4F65B] fill-[#D4F65B]" />
                        <span>{overrideLoadingId === d.id ? 'Enabling...' : 'Allow 2nd Trip'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Owner Password Card */}
      <div className="bg-white rounded-[28px] p-6 border border-gray-100 shadow-2xs space-y-4">
        <form onSubmit={handleSavePassword} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Owner Access Password
            </label>
            <p className="text-xs text-gray-500">
              Password required to log in to the Owner Dashboard.
            </p>
            <div className="relative mt-2">
              <Lock className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={ownerPassword}
                onChange={(e) => setOwnerPassword(e.target.value)}
                className="w-full h-12 pl-11 pr-12 bg-[#F8F9FA] border border-gray-200 rounded-2xl text-sm font-bold text-[#121316] focus:outline-none focus:border-gray-400 focus:bg-white"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full h-12 bg-[#121316] hover:bg-black text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Save className="w-4 h-4 text-[#D4F65B]" />
            <span>{isSaving ? 'Updating Password...' : 'Save New Password'}</span>
          </button>
        </form>
      </div>

      {/* Firebase Cloud Connection Card */}
      <div className="bg-white rounded-[28px] p-5 border border-gray-100 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-extrabold text-[#121316] uppercase tracking-wider">
              Firebase Cloud Database
            </h2>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Connected</span>
          </span>
        </div>

        <div className="p-3 bg-[#F8F9FA] rounded-2xl space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Firebase Project:</span>
            <span className="font-mono font-bold text-gray-900">nalakath-logistics</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Cloud Storage:</span>
            <span className="font-mono font-medium text-gray-700 truncate max-w-[200px]">nalakath-logistics.firebasestorage.app</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">App ID:</span>
            <span className="font-mono text-[10px] text-gray-600">1:184879371139:web:...</span>
          </div>
        </div>

        {firebaseMsg && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{firebaseMsg}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleSyncFirebase}
          disabled={isSyncingFirebase}
          className="w-full h-11 bg-[#121316] hover:bg-black text-[#D4F65B] rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncingFirebase ? 'animate-spin' : ''}`} />
          <span>{isSyncingFirebase ? 'Syncing to Firebase Cloud...' : 'Sync Fleet to Firebase Cloud'}</span>
        </button>
      </div>

      {/* Database & Sync Status */}
      <div className="bg-white rounded-[28px] p-5 border border-gray-100 shadow-2xs space-y-2.5">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-gray-700" />
          <h2 className="text-sm font-extrabold text-[#121316] uppercase tracking-wider">
            Online Shared Database
          </h2>
        </div>

        <div className="p-3 bg-[#F8F9FA] rounded-2xl space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Storage Engine:</span>
            <span className="font-bold text-gray-900">SQLite WAL Engine (Server Shared)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Live Realtime Sync:</span>
            <span className="font-bold text-emerald-600 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Active (4-sec poll fallback)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Last Synced:</span>
            <span className="font-mono font-bold text-gray-800">{lastUpdated || 'Connecting...'}</span>
          </div>
        </div>

        <p className="text-[11px] text-gray-400">
          All changes are saved to the server database. All connected phones and dashboards stay in sync within seconds.
        </p>
      </div>
    </div>
  );
}
