'use client';

import React, { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { StatusBadge } from '@/components/ui/Badge';
import { dataRepo } from '@/lib/data-service';
import { Driver, DriverStatus } from '@/types/database';
import { SimpleAddDriverModal } from '@/components/drivers/SimpleAddDriverModal';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Plus, Search, Users, Pencil, Phone, Trash2 } from 'lucide-react';

export default function DriversPage() {
  const { t } = useLanguage();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Add Driver Modal
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Edit Driver Modal
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStatus, setEditStatus] = useState<DriverStatus>('active');
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const dList = await dataRepo.getDrivers();
      setDrivers(dList);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenEdit = (d: Driver) => {
    setEditingDriver(d);
    setEditFullName(d.full_name);
    setEditPhone(d.phone);
    setEditStatus(d.status);
    setEditError(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver) return;
    setEditError(null);
    setIsEditSubmitting(true);
    try {
      await dataRepo.updateDriver(editingDriver.id, {
        full_name: editFullName.trim(),
        phone: editPhone.trim(),
        status: editStatus,
      });
      setEditingDriver(null);
      await loadData();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Failed to update driver');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleToggleStatus = async (driver: Driver) => {
    const nextStatus: DriverStatus =
      driver.status === 'active'
        ? 'on_leave'
        : driver.status === 'on_leave'
        ? 'inactive'
        : 'active';

    try {
      await dataRepo.updateDriver(driver.id, { status: nextStatus });
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (driver: Driver) => {
    if (!confirm(`${t('confirmDeleteDriver')} "${driver.full_name}"?`)) return;
    try {
      await dataRepo.deleteDriver(driver.id);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = drivers.filter((d) => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (
      search &&
      !d.full_name.toLowerCase().includes(search.toLowerCase()) &&
      !d.phone.includes(search)
    ) {
      return false;
    }
    return true;
  });

  return (
    <PageContainer
      title={t('driversTitle')}
      subtitle={t('driversSubtitle')}
      action={
        <Button
          variant="primary"
          size="sm"
          className="font-bold text-xs py-2 w-full sm:w-auto"
          onClick={() => setIsAddOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          {t('addDriverModalTitle')}
        </Button>
      }
    >
      {/* Search & Filter Bar — Mobile Touch Friendly */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder={t('searchDriversPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm font-semibold rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">{t('allStatuses')} ({drivers.length})</option>
            <option value="active">{t('activeOnly')}</option>
            <option value="on_leave">{t('onLeaveOnly')}</option>
            <option value="inactive">{t('inactiveOnly')}</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
          {t('loadingDrivers')}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-slate-500 text-xs space-y-2">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <p>{t('noDriversFound')}</p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              {t('addNewDriverBtn')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* MOBILE VIEW: Driver Cards (< 640px) */}
          <div className="sm:hidden space-y-2.5">
            {filtered.map((d) => (
              <div
                key={d.id}
                className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-sm shrink-0">
                      {d.full_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-black text-sm text-slate-900">{d.full_name}</div>
                      <div className="text-[11px] font-mono text-slate-500">{d.phone}</div>
                    </div>
                  </div>
                  <StatusBadge status={d.status} size="sm" />
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <a
                    href={`tel:${d.phone}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-xs font-bold shadow-xs active:scale-95"
                  >
                    <Phone className="w-3.5 h-3.5 fill-white" />
                    <span>{t('callDriverBtn')}</span>
                  </a>

                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs py-2 px-3 font-semibold"
                    onClick={() => handleToggleStatus(d)}
                  >
                    {d.status === 'active' ? t('setLeaveBtn') : t('setActiveBtn')}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs py-2 px-3 font-semibold"
                    onClick={() => handleOpenEdit(d)}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>

                  <button
                    onClick={() => handleDelete(d)}
                    title={t('deleteBtn')}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP VIEW: Table (>= 640px) */}
          <div className="hidden sm:block bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                  <tr>
                    <th className="px-5 py-3.5">{t('driverNameLabel')}</th>
                    <th className="px-5 py-3.5">{t('mobileNumberLabel')}</th>
                    <th className="px-5 py-3.5">{t('statusTh')}</th>
                    <th className="px-5 py-3.5 text-right">{t('editDriverModalTitle')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filtered.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {d.full_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-slate-900">{d.full_name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {d.employee_code}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-slate-800">
                            {d.phone}
                          </span>
                          <a
                            href={`tel:${d.phone}`}
                            title="Call Driver"
                            className="p-1 rounded bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-600 transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={d.status} size="sm" />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs py-1"
                            onClick={() => handleToggleStatus(d)}
                          >
                            {d.status === 'active'
                              ? t('setLeaveBtn')
                              : t('setActiveBtn')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs py-1"
                            onClick={() => handleOpenEdit(d)}
                            leftIcon={<Pencil className="w-3 h-3" />}
                          >
                            {t('editBtn')}
                          </Button>
                          <button
                            onClick={() => handleDelete(d)}
                            title={t('deleteBtn')}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Simple Add Driver Modal (Name & Phone only) */}
      <SimpleAddDriverModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={loadData}
      />

      {/* Edit Driver Modal */}
      <Modal
        isOpen={!!editingDriver}
        onClose={() => setEditingDriver(null)}
        title={t('editDriverModalTitle')}
        description={t('editDriverModalDesc')}
        maxWidth="sm"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          {editError && <Alert variant="danger">{editError}</Alert>}

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              {t('driverNameLabel')} <span className="text-rose-500">*</span>
            </label>
            <Input
              value={editFullName}
              onChange={(e) => setEditFullName(e.target.value)}
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
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              {t('dutyStatusLabel')}
            </label>
            <Select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as DriverStatus)}
            >
              <option value="active">{t('activeOnly')}</option>
              <option value="on_leave">{t('onLeaveOnly')}</option>
              <option value="inactive">{t('inactiveOnly')}</option>
            </Select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingDriver(null)}
              disabled={isEditSubmitting}
            >
              {t('cancelBtn')}
            </Button>
            <Button type="submit" variant="primary" isLoading={isEditSubmitting}>
              {t('saveBtn')}
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
}
