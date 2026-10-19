'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { dataRepo } from '@/lib/data-service';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { UserCheck, Phone, CheckCircle2 } from 'lucide-react';

interface SimpleAddDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SimpleAddDriverModal({
  isOpen,
  onClose,
  onSuccess,
}: SimpleAddDriverModalProps) {
  const { t } = useLanguage();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const name = fullName.trim();
    let mobile = phone.trim().replace(/[\s-]/g, '');

    if (!name) {
      setError('Please enter driver name / ഡ്രൈവറുടെ പേര് നൽകുക');
      return;
    }

    if (!mobile) {
      setError('Please enter mobile number / മൊബൈൽ നമ്പർ നൽകുക');
      return;
    }

    // Auto format 10-digit Indian numbers with +91 if country code missing
    if (mobile.length === 10 && !mobile.startsWith('+')) {
      mobile = `+91${mobile}`;
    }

    setIsLoading(true);
    try {
      await dataRepo.createDriver({
        full_name: name,
        phone: mobile,
      });

      setFullName('');
      setPhone('');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to register driver');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('addDriverModalTitle')}
      description={t('addDriverModalDesc')}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="danger">{error}</Alert>}

        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
            {t('driverNameLabel')} <span className="text-rose-500">*</span>
          </label>
          <Input
            placeholder={t('driverNamePlaceholder')}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
            {t('mobileNumberLabel')} <span className="text-rose-500">*</span>
          </label>
          <Input
            type="tel"
            placeholder={t('mobileNumberPlaceholder')}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            leftIcon={<Phone className="w-4 h-4 text-slate-400" />}
            required
          />
          <p className="text-[11px] text-slate-500 mt-1">
            {t('mobileHelpText')}
          </p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">{t('noOtherDetailsBanner')}</div>
            <div className="text-[11px] text-emerald-700 mt-0.5">
              {t('noOtherDetailsDesc')}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {t('cancelBtn')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            leftIcon={<UserCheck className="w-4 h-4" />}
          >
            {t('registerBtn')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
