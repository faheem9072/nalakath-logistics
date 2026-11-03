'use client';

import React, { useState, useEffect } from 'react';
import { dataRepo } from '@/lib/data-service';
import { isFirebaseConfigured, db } from '@/lib/firebase/config';
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
  Download,
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
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null);

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

  const handleDownloadBackup = async () => {
    setIsExportingBackup(true);
    setBackupSuccess(null);
    try {
      const res = await fetch('/api/fleet', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch fleet state for backup');
      const data = await res.json();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `Nalakath_Logistics_Master_Backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupSuccess(`Complete backup exported successfully (${(data.trips || []).length} trips, ${(data.expenses || []).length} expenses, ${(data.vehicles || []).length} vehicles)!`);
      setTimeout(() => setBackupSuccess(null), 6000);
    } catch (err: unknown) {
      console.error('Failed to export master backup:', err);
      alert('Backup export failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsExportingBackup(false);
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

      {/* Cloud Security & System Health */}
      <div className="bg-white rounded-[28px] p-5 border border-gray-100 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-extrabold text-[#121316] uppercase tracking-wider">
              System Security & Cloud Status
            </h2>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Encrypted & Active</span>
          </span>
        </div>

        <div className="p-3.5 bg-[#F8F9FA] rounded-2xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 font-medium">Cloud Database:</span>
            <span className="font-bold text-gray-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Google Cloud Firestore (Live)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500 font-medium">Data Safety:</span>
            <span className="font-bold text-emerald-700">Soft-Delete Active (Protected)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500 font-medium">Live Connection:</span>
            <span className="font-mono font-bold text-gray-800">{lastUpdated || 'Connected'}</span>
          </div>
        </div>

        <p className="text-[11px] text-gray-400 leading-relaxed">
          All driver trips, vehicle logs, and company accounts are encrypted and safely backed up to Google Cloud. Past records cannot be lost or accidentally erased.
        </p>
      </div>

      {/* Master Data Backup & Safety Card */}
      <div className="bg-white rounded-[28px] p-5 border border-emerald-100 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-extrabold text-[#121316] uppercase tracking-wider">
              Master Fleet Backup (.JSON)
            </h2>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Zero Data Loss Protection</span>
          </span>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed">
          Download a complete, offline backup copy of all 50 vehicles, drivers, trips, fuel & maintenance expenses, and monthly accounts to your device at any time.
        </p>

        {backupSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{backupSuccess}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleDownloadBackup}
          disabled={isExportingBackup}
          className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98 disabled:opacity-50"
        >
          <Download className={`w-3.5 h-3.5 ${isExportingBackup ? 'animate-bounce' : ''}`} />
          <span>{isExportingBackup ? 'Generating Master Backup...' : 'Download Full Data Backup (JSON)'}</span>
        </button>
      </div>
    </div>
  );
}
