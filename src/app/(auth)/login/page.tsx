'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Card, CardContent } from '@/components/ui/Card';
import { dataRepo } from '@/lib/data-service';
import { useLanguage, LanguageSwitcher } from '@/lib/i18n/LanguageContext';
import { ShieldCheck, Phone, KeyRound, ArrowRight, UserCheck, Smartphone } from 'lucide-react';
import { NalakathLogo } from '@/components/brand/NalakathLogo';

export default function LoginPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [loginRole, setLoginRole] = useState<'driver' | 'owner'>('driver');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [driverName, setDriverName] = useState('');
  const [phone, setPhone] = useState(''); // empty so driver enters their own number
  const [otp, setOtp] = useState('123456');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Switch role defaults
  const handleSelectRole = (role: 'driver' | 'owner') => {
    setLoginRole(role);
    setStep('phone');
    setError(null);
    setInfoMessage(null);
    if (role === 'driver') {
      setDriverName('');
      setPhone('');
    } else {
      setPhone('+919876543200');
    }
  };

  const handleDirectDriverLogin = async (driverPhone: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const profile = await dataRepo.loginByPhone(driverPhone, '123456');
      if (profile.role === 'driver') {
        router.push('/driver');
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    let cleaned = phone.replace(/[\s-]/g, '');
    if (cleaned.length === 10 && !cleaned.startsWith('+')) {
      cleaned = `+91${cleaned}`;
      setPhone(cleaned);
    }

    if (!cleaned.match(/^\+?[1-9]\d{9,14}$/)) {
      setError('Please enter a valid 10-digit mobile number / ശരിയായ മൊബൈൽ നമ്പർ നൽകുക');
      return;
    }

    setIsLoading(true);
    try {
      if (loginRole === 'driver') {
        const dName = driverName.trim();
        if (!dName) {
          setError(
            lang === 'ml'
              ? 'ഡ്രൈവറുടെ പേര് നൽകുക (ഓണർ ചേർത്ത പേര്)'
              : 'Please enter driver name as registered in owner dashboard'
          );
          setIsLoading(false);
          return;
        }
        await dataRepo.loginDriverByNameAndPhone(dName, cleaned);
        router.push('/driver');
      } else {
        const profile = await dataRepo.loginByPhone(cleaned, '123456');
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      if (loginRole === 'driver') {
        setError(err instanceof Error ? err.message : 'Sign in failed');
        setIsLoading(false);
      } else {
        // If error, show OTP step
        setStep('otp');
        setInfoMessage(`Code sent to: ${cleaned} (Demo code: 123456)`);
        setIsLoading(false);
      }
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otp.length < 6) {
      setError('Please enter the 6-digit verification code');
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

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-6 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center flex flex-col items-center">
        <div className="flex items-center justify-between w-full max-w-sm px-4 mb-2">
          <div className="flex-1" />
          <LanguageSwitcher />
        </div>
        <div className="p-2 bg-black rounded-full shadow-xl shadow-slate-900/10 mb-3 border border-slate-800">
          <NalakathLogo size="md" variant="circle" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
          {t('loginTitle')}
        </h1>
        <p className="text-[11px] text-rose-600 font-bold uppercase tracking-wider mt-0.5">
          {t('loginTagline')}
        </p>
      </div>

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md px-3 sm:px-0">
        <Card className="border-slate-200/80 shadow-md overflow-hidden bg-white rounded-2xl">
          {/* Role Tabs */}
          <div className="grid grid-cols-2 bg-slate-100 border-b border-slate-200 p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => handleSelectRole('driver')}
              className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                loginRole === 'driver'
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>{t('driverLoginTab')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectRole('owner')}
              className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                loginRole === 'owner'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span>{t('ownerLoginTab')}</span>
            </button>
          </div>

          <CardContent className="p-5 sm:p-6 space-y-4">
            {error && <Alert variant="danger">{error}</Alert>}
            {infoMessage && <Alert variant="info">{infoMessage}</Alert>}

            {/* Role Header Description */}
            <div className="text-center space-y-1">
              <h2 className="text-base font-black text-slate-900">
                {loginRole === 'driver'
                  ? t('driverLoginHeading')
                  : t('ownerLoginHeading')}
              </h2>
              <p className="text-xs text-slate-500">
                {loginRole === 'driver'
                  ? t('driverLoginSubtext')
                  : t('ownerLoginSubtext')}
              </p>
            </div>

            {step === 'phone' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                {loginRole === 'driver' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      {t('driverNameInputLabel')} <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      placeholder={t('driverNameInputPlaceholder')}
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      required
                      autoFocus
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      {t('driverNameHelper')}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    {t('phoneLabel')} <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="tel"
                    placeholder={t('phonePlaceholder')}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    leftIcon={<Phone className="w-4 h-4 text-slate-400" />}
                    required
                    autoFocus={loginRole !== 'driver'}
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    {t('phoneHelper')}
                  </p>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className={`w-full font-bold text-base py-3 ${
                    loginRole === 'driver' ? 'bg-emerald-600 hover:bg-emerald-700' : ''
                  }`}
                  isLoading={isLoading}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  {loginRole === 'driver' ? t('driverSignInBtn') : t('ownerSignInBtn')}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      {t('otpLabel')}
                    </label>
                    <button
                      type="button"
                      onClick={() => setStep('phone')}
                      className="text-xs text-blue-600 hover:underline cursor-pointer"
                    >
                      {t('changeNumber')}
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
                  className="w-full font-bold text-base py-3"
                  isLoading={isLoading}
                >
                  {t('verifyEnterBtn')}
                </Button>
              </form>
            )}

            {/* Role Notice / Admin helper */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              {loginRole === 'driver' ? (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block text-center">
                    {lang === 'ml' ? '👉 ഡ്രൈവർ 1-ടാപ്പ് പ്രവേശനം (Demo / Quick Pick)' : '👉 Quick 1-Tap Driver Access'}
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { name: 'Refnise', phone: '+919400112233' },
                      { name: 'Haneefa', phone: '+919400223344' },
                      { name: 'Firoz', phone: '+919400334455' },
                      { name: 'Ameer', phone: '+919400445566' },
                    ].map((d) => (
                      <button
                        key={d.phone}
                        type="button"
                        onClick={() => handleDirectDriverLogin(d.phone)}
                        className="p-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-slate-800 text-left cursor-pointer transition-colors"
                      >
                        <div className="font-bold text-emerald-900 text-xs truncate">{d.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{d.phone.slice(-4)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block text-center mb-1.5">
                    {t('demoLoginTitle')}
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleDirectDriverLogin('+919876543200')}
                      className="p-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-slate-800 text-left cursor-pointer transition-colors"
                    >
                      <div className="font-bold text-blue-900 text-xs">Shabeerali (Owner)</div>
                      <div className="text-[10px] text-slate-500 font-mono">+919876543200</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDirectDriverLogin('+919876543201')}
                      className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-800 text-left cursor-pointer transition-colors"
                    >
                      <div className="font-bold text-slate-900 text-xs">Dispatcher</div>
                      <div className="text-[10px] text-slate-500 font-mono">+919876543201</div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Security badge */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>{t('protectedBadge')}</span>
        </div>
      </div>
    </div>
  );
}
