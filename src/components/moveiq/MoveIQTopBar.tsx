'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { dataRepo } from '@/lib/data-service';
import { Profile } from '@/types/database';
import { Bell, LogOut, Check, Smartphone, Shield, RefreshCw, Settings } from 'lucide-react';

interface MoveIQTopBarProps {
  title?: string;
  subtitle?: string;
  hasNotification?: boolean;
  onNotificationClick?: () => void;
}

export function MoveIQTopBar({
  hasNotification = true,
  onNotificationClick,
}: MoveIQTopBarProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNotificationToast, setShowNotificationToast] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const loadProfile = () => {
    dataRepo.getCurrentProfile().then(setProfile);
    setLastUpdated(dataRepo.getLastUpdated());
  };

  useEffect(() => {
    loadProfile();
    const unsub = dataRepo.subscribe(() => {
      loadProfile();
    });
    return unsub;
  }, []);

  const handleRoleSwitch = async (role: 'owner' | 'driver') => {
    if (role === 'owner') {
      const isOwnerAuth = typeof window !== 'undefined' && localStorage.getItem('fleet_owner_auth') === 'authenticated';
      if (!isOwnerAuth) {
        setIsMenuOpen(false);
        router.push('/login?role=owner');
        return;
      }
    }
    await dataRepo.setSessionUser(role);
    const updated = await dataRepo.getCurrentProfile();
    setProfile(updated);
    setIsMenuOpen(false);
    if (role === 'driver') {
      router.push('/driver');
    } else {
      router.push('/drivers');
    }
  };

  const handleLogout = async () => {
    await dataRepo.logout();
    router.push('/login');
  };

  const handleBell = () => {
    if (onNotificationClick) {
      onNotificationClick();
    } else {
      setShowNotificationToast(true);
      setTimeout(() => setShowNotificationToast(false), 3000);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100/80 px-4 py-3 flex items-center justify-between">
        {/* Left: Bell icon in rounded-2xl button with lime dot */}
        <button
          type="button"
          onClick={handleBell}
          className="relative w-11 h-11 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex items-center justify-center text-gray-700 hover:text-black hover:border-gray-300 active:scale-95 transition-all cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 text-gray-800" strokeWidth={1.8} />
          {hasNotification && (
            <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-[#8BE234] border-2 border-white rounded-full animate-pulse" />
          )}
        </button>

        {/* Center: Nalakath Logistics Logo & Name */}
        <div
          onClick={() => {
            if (profile?.role === 'driver') router.push('/driver');
            else router.push('/drivers');
          }}
          className="flex items-center gap-2 cursor-pointer select-none px-2 active:scale-98 transition-transform"
          title="Nalakath Logistics"
        >
          <img
            src="/nalakath-logo.png"
            alt="Nalakath Logistics"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-contain shrink-0 shadow-2xs border border-gray-200/80"
          />
          <div className="flex flex-col text-left leading-none">
            <span className="font-black text-xs sm:text-sm tracking-tight text-[#121316]">
              NALAKATH
            </span>
            <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-widest text-gray-500 mt-0.5">
              LOGISTICS
            </span>
          </div>
        </div>

        {/* Right: User Profile Avatar */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-xs ring-1 ring-gray-200/90 active:scale-95 transition-transform flex items-center justify-center bg-gray-100 cursor-pointer"
              aria-label="User profile"
            >
              <div className="w-full h-full bg-[#121316] text-white flex items-center justify-center font-bold text-sm tracking-wide">
                {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'K'}
              </div>
            </button>

          {/* User dropdown menu */}
          {isMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-2xs"
                onClick={() => setIsMenuOpen(false)}
              />
              <div className="absolute right-0 top-13 z-50 w-72 bg-white rounded-3xl p-4 shadow-2xl border border-gray-100 text-sm animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                  <div className="w-11 h-11 rounded-full bg-[#121316] text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {profile?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">
                      {profile?.full_name || 'Fleet User'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {profile?.phone || '+91 98765 43200'}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="inline-block px-2 py-0.5 bg-[#D4F65B] text-black text-[10px] font-bold rounded-full uppercase tracking-wider">
                        {profile?.role === 'owner' ? 'Owner / Admin' : 'Driver'}
                      </span>
                      {lastUpdated && (
                        <span className="text-[10px] text-gray-400 font-mono">
                          • {lastUpdated}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Role Switcher - ONLY visible to verified Owners (DRIVERS NEVER SEE THIS) */}
                {profile?.role === 'owner' && (
                  <div className="py-3 border-b border-gray-100 space-y-1.5">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-1">
                      Mode
                    </p>
                    <button
                      type="button"
                      onClick={() => handleRoleSwitch('owner')}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-2xl bg-[#121316] text-white font-medium cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        <span>Owner Dashboard</span>
                      </div>
                      <Check className="w-4 h-4 text-[#D4F65B]" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRoleSwitch('driver')}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-2xl text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4" />
                        <span>Driver View Preview</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        router.push('/settings');
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-2xl text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4 text-gray-500" />
                        <span>Settings & Password</span>
                      </div>
                    </button>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-2xl text-rose-600 hover:bg-rose-50 font-semibold transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
          </div>
        </div>
      </header>

      {/* Floating notification feedback toast */}
      {showNotificationToast && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 bg-[#121316] text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 border border-gray-700/50 animate-in fade-in duration-150">
          <span className="w-2 h-2 rounded-full bg-[#8BE234] animate-pulse" />
          <span>Real-time fleet tracking active • Last sync: {lastUpdated || 'Now'}</span>
        </div>
      )}
    </>
  );
}
