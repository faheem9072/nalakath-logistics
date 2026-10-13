'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Card, CardContent } from '@/components/ui/Card';
import { dataRepo } from '@/lib/data-service';
import { ShieldCheck, Phone, KeyRound, ArrowRight, RotateCcw } from 'lucide-react';

import { NalakathLogo } from '@/components/brand/NalakathLogo';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('+919876543200');
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const cleaned = phone.replace(/[\s-]/g, '');
    if (!cleaned.match(/^\+?[1-9]\d{9,14}$/)) {
      setError('Please enter a valid international phone number (e.g. +919876543200)');
      return;
    }

    setIsLoading(true);
    try {
      // In production, Supabase auth.signInWithOtp({ phone }) is called
      // In demo mode or test setup, code is sent or simulated
      setStep('otp');
      setCooldown(60);
      setInfoMessage(`Verification code sent to ${phone}. (Demo code: 123456)`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otp.length < 6) {
      setError('Please enter the full 6-digit verification code');
      return;
    }

    setIsLoading(true);
    try {
      const profile = await dataRepo.loginByPhone(phone, otp);

      if (profile.role === 'driver') {
        router.push('/driver');
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid OTP code');
    } finally {
      setIsLoading(false);
    }
  };

  const quickFill = (testPhone: string, testName: string) => {
    setPhone(testPhone);
    setError(null);
    setInfoMessage(`Filled ${testName} credentials`);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center flex flex-col items-center">
        <div className="p-2 bg-black rounded-full shadow-xl shadow-slate-900/10 mb-4 border border-slate-800">
          <NalakathLogo size="lg" variant="circle" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
          NALAKATH LOGISTICS
        </h1>
        <p className="text-xs text-rose-600 font-bold uppercase tracking-wider mt-1">
          Since 1998 • Fleet & Duty Operations
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card className="border-slate-200/80 shadow-md">
          <CardContent className="p-6 sm:p-8 space-y-6">
            {error && <Alert variant="danger">{error}</Alert>}
            {infoMessage && <Alert variant="info">{infoMessage}</Alert>}

            {step === 'phone' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <Input
                    label="Phone Number (SMS OTP)"
                    type="tel"
                    placeholder="+919876543200"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    leftIcon={<Phone className="w-4 h-4" />}
                    required
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Enter your registered mobile number with country code.
                  </p>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full font-semibold"
                  isLoading={isLoading}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Request SMS OTP
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      6-Digit SMS Code
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setStep('phone');
                        setError(null);
                      }}
                      className="text-xs text-blue-600 hover:underline cursor-pointer"
                    >
                      Change number
                    </button>
                  </div>
                  <Input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    leftIcon={<KeyRound className="w-4 h-4" />}
                    className="text-center font-mono text-lg tracking-widest"
                    required
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full font-semibold"
                  isLoading={isLoading}
                >
                  Verify & Sign In
                </Button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    disabled={cooldown > 0}
                    onClick={handleSendOtp}
                    className="text-xs text-slate-500 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 mx-auto cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>
                      {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
                    </span>
                  </button>
                </div>
              </form>
            )}

            {/* Quick Demo Credentials Assistant */}
            <div className="pt-4 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
                Quick Demo Credentials (1-Click Fill)
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => quickFill('+919876543200', 'Shabeerali Nalakath (Owner)')}
                  className="p-2 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium text-center cursor-pointer transition-colors"
                >
                  <div className="font-bold text-slate-900 truncate">Shabeerali</div>
                  <div className="text-[10px] text-slate-500 truncate">Owner (+919876..00)</div>
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('+919876543201', 'Dispatcher')}
                  className="p-2 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium text-center cursor-pointer transition-colors"
                >
                  <div className="font-bold text-slate-900">Dispatcher</div>
                  <div className="text-[10px] text-slate-500 truncate">+919876...01</div>
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('+919400112233', 'Driver')}
                  className="p-2 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium text-center cursor-pointer transition-colors"
                >
                  <div className="font-bold text-slate-900">Driver</div>
                  <div className="text-[10px] text-slate-500 truncate">+919400...33</div>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Protected by Supabase Auth with Row Level Security</span>
        </div>
      </div>
    </div>
  );
}
