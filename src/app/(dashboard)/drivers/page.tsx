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
import { Driver, DriverStatus, Route } from '@/types/database';
import { Plus, Search, Users } from 'lucide-react';

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [empCode, setEmpCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [licenseExp, setLicenseExp] = useState('2028-12-31');
  const [isFixedRoute, setIsFixedRoute] = useState(false);
  const [defaultRouteId, setDefaultRouteId] = useState('');
  const [notes, setNotes] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [dList, rList] = await Promise.all([
        dataRepo.getDrivers(),
        dataRepo.getRoutes(),
      ]);
      setDrivers(dList);
      setRoutes(rList);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSubmitting(true);
    try {
      await dataRepo.createDriver({
        employee_code: empCode.trim().toUpperCase(),
        full_name: fullName.trim(),
        phone: phone.trim(),
        license_number: licenseNo.trim(),
        license_expiry: licenseExp,
        is_fixed_route: isFixedRoute,
        default_route_id: isFixedRoute && defaultRouteId ? defaultRouteId : null,
        status: 'active',
        notes: notes.trim() || null,
      });
      setIsAddOpen(false);
      setEmpCode('');
      setFullName('');
      setPhone('');
      setLicenseNo('');
      loadData();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to register driver');
    } finally {
      setIsSubmitting(false);
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
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const routesMap = new Map(routes.map((r) => [r.id, r.name]));

  const filtered = drivers.filter((d) => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (
      search &&
      !d.full_name.toLowerCase().includes(search.toLowerCase()) &&
      !d.employee_code.toLowerCase().includes(search.toLowerCase()) &&
      !d.phone.includes(search)
    ) {
      return false;
    }
    return true;
  });

  return (
    <PageContainer
      title="Driver Roster"
      subtitle="Driver qualifications, license validity, route specializations, and operational statuses."
      action={
        <Button
          variant="primary"
          onClick={() => setIsAddOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Driver
        </Button>
      }
    >
      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search name, code, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">All Statuses ({drivers.length})</option>
            <option value="active">Active Only</option>
            <option value="on_leave">On Leave Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-slate-400 animate-pulse">
          Loading driver roster...
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-slate-500 text-sm">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            No drivers match your search query.
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                <tr>
                  <th className="px-5 py-3.5">Code</th>
                  <th className="px-5 py-3.5">Driver Name</th>
                  <th className="px-5 py-3.5">Phone (Auth)</th>
                  <th className="px-5 py-3.5">Commercial License</th>
                  <th className="px-5 py-3.5">Route Mode</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-slate-900">
                      {d.employee_code}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-xs text-slate-900">{d.full_name}</div>
                      {d.notes && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{d.notes}</div>
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-600">
                      {d.phone}
                    </td>
                    <td className="px-5 py-4 text-xs font-mono">
                      <div>{d.license_number}</div>
                      <div className="text-[10px] text-slate-400">Exp: {d.license_expiry}</div>
                    </td>
                    <td className="px-5 py-4 text-xs">
                      {d.is_fixed_route ? (
                        <div>
                          <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                            Fixed Route
                          </span>
                          {d.default_route_id && (
                            <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-xs">
                              {routesMap.get(d.default_route_id) || 'Default Route'}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 font-medium">Daily Flexible</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={d.status} size="sm" />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs py-1"
                        onClick={() => handleToggleStatus(d)}
                      >
                        {d.status === 'active'
                          ? 'Set Leave'
                          : d.status === 'on_leave'
                          ? 'Deactivate'
                          : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Driver Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Transport Driver"
        description="Register a driver for daily duty allocation and SMS OTP mobile portal access."
        maxWidth="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {modalError && <Alert variant="danger">{modalError}</Alert>}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Employee Code"
              placeholder="EMP-1009"
              value={empCode}
              onChange={(e) => setEmpCode(e.target.value.toUpperCase())}
              required
              autoFocus
            />
            <Input
              label="Full Name"
              placeholder="Driver Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Mobile Phone (SMS OTP)"
              type="tel"
              placeholder="+919400998877"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <Input
              label="License Number"
              placeholder="KL0720230009988"
              value={licenseNo}
              onChange={(e) => setLicenseNo(e.target.value)}
              required
            />
          </div>

          <Input
            label="License Expiry Date"
            type="date"
            value={licenseExp}
            onChange={(e) => setLicenseExp(e.target.value)}
            required
          />

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={isFixedRoute}
                onChange={(e) => setIsFixedRoute(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span>Fixed-Route Driver (Regular assigned corridor)</span>
            </label>

            {isFixedRoute && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Default Route Corridor
                </label>
                <Select
                  value={defaultRouteId}
                  onChange={(e) => setDefaultRouteId(e.target.value)}
                >
                  <option value="">Select primary corridor...</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code} — {r.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>

          <Input
            label="Notes"
            placeholder="E.g., Airport security clearance, night shifts only..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Register Driver
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
}
