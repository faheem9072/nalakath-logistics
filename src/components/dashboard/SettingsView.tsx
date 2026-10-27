'use client';

import React, { useState, useEffect } from 'react';
import { dataRepo } from '@/lib/data-service';
import { isFirebaseConfigured, db } from '@/lib/firebase/config';
import { syncFleetToFirestore } from '@/lib/firebase/sync';
import { doc, setDoc } from 'firebase/firestore';
import {
  Lock,
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  Cloud,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

export function SettingsView() {
  const [currentPassword, setCurrentPassword] = useState('kore2026');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState('');
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingFirebase, setIsSyncingFirebase] = useState(false);
  const [firebaseMsg, setFirebaseMsg] = useState<string | null>(null);

  const loadData = async () => {
    const s = await dataRepo.getSettings();
    const storedPass = s.owner_password || (typeof window !== 'undefined' ? localStorage.getItem('fleet_owner_password') : null) || 'kore2026';
    setCurrentPassword(storedPass);
    setLastUpdated(dataRepo.getLastUpdated());
  };

  useEffect(() => {
    loadData();
    const unsub = dataRepo.subscribe(loadData);
    return unsub;
  }, []);

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setSaveSuccess(null);

    const cleanPass = newPassword.trim();
    if (!cleanPass) {
      setPasswordError('Please enter a new password');
      return;
    }
    if (cleanPass.length < 4) {
      setPasswordError('Password must be at least 4 characters long');
      return;
    }
    if (cleanPass !== confirmPassword.trim()) {
      setPasswordError('New password and confirm password do not match');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Direct fast client-side Firestore write if available
      if (isFirebaseConfigured && db) {
        const settingsRef = doc(db, 'settings', 'fleet_settings');
        await setDoc(
          settingsRef,
          {
            owner_password: cleanPass,
            updated_at: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      // 2. Server API sync & memory state update
      await dataRepo.updateSettings('owner_password', cleanPass);

      // 3. Update localStorage and local state
      if (typeof window !== 'undefined') {
        localStorage.setItem('fleet_owner_password', cleanPass);
      }
      setCurrentPassword(cleanPass);
      setNewPassword('');
      setConfirmPassword('');
      setSaveSuccess(`Owner password updated successfully to "${cleanPass}"! Please note this for your next login.`);
      setTimeout(() => setSaveSuccess(null), 6000);
    } catch (err: unknown) {
      console.error('Failed to update owner password:', err);
      setPasswordError(err instanceof Error ? err.message : 'Failed to update owner password');
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
          Manage owner access password, credentials, and live cloud synchronization.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Owner Access Password Card */}
      <div className="bg-white rounded-[28px] p-6 border border-gray-100 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#121316] text-[#D4F65B] flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[#121316] uppercase tracking-wider">
                Owner Access Password
              </h2>
              <p className="text-xs text-gray-400">
                Security key for logging into the Owner Dashboard
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Admin Protected</span>
          </span>
        </div>

        {/* Current Active Password display with reveal toggle */}
        <div className="p-4 bg-[#F8F9FA] rounded-2xl border border-gray-100 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Current Active Password:
            </span>
            <p className="font-mono text-sm font-black text-[#121316]">
              {showCurrentPassword ? currentPassword : '•'.repeat(Math.max(currentPassword.length, 6))}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-xs font-bold text-gray-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs active:scale-95"
          >
            {showCurrentPassword ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-gray-500" />
                <span>Hide</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-gray-500" />
                <span>Reveal</span>
              </>
            )}
          </button>
        </div>

        {/* Change Password Form */}
        <form onSubmit={handleSavePassword} className="space-y-3.5 pt-1">
          <div className="space-y-3">
            {/* New Password */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  placeholder="Enter new password (min. 4 characters)"
                  className="w-full h-12 pl-11 pr-12 bg-[#F8F9FA] border border-gray-200 rounded-2xl text-sm font-bold text-[#121316] placeholder:font-normal placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:bg-white transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  placeholder="Re-enter new password to confirm"
                  className="w-full h-12 pl-11 pr-12 bg-[#F8F9FA] border border-gray-200 rounded-2xl text-sm font-bold text-[#121316] placeholder:font-normal placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:bg-white transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {passwordError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs font-bold text-rose-700 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSaving || !newPassword.trim()}
            className="w-full h-12 bg-[#121316] hover:bg-black text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 text-[#D4F65B] animate-spin" />
                <span>Updating Password...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-[#D4F65B]" />
                <span>Save New Owner Password</span>
              </>
            )}
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
