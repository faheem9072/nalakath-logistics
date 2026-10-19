'use client';

import React, { useState, useEffect } from 'react';
import {
  dataRepo,
  DriverMonthlySummary,
} from '@/lib/data-service';
import { Driver } from '@/types/database';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  X,
  Calculator,
  Truck,
  Calendar,
  Gauge,
  Phone,
  Printer,
  ChevronRight,
  UserCheck,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialDriverId?: string;
}

export function DriverMonthCalculatorModal({
  isOpen,
  onClose,
  initialDriverId,
}: Props) {
  const { lang, t } = useLanguage();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [summary, setSummary] = useState<DriverMonthlySummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      dataRepo.getDrivers().then((list) => {
        setDrivers(list);
        if (initialDriverId) {
          setSelectedDriverId(initialDriverId);
        } else if (list.length > 0 && !selectedDriverId) {
          setSelectedDriverId(list[0].id);
        }
      });
    }
  }, [isOpen, initialDriverId]);

  useEffect(() => {
    if (!selectedDriverId) return;
    setIsLoading(true);
    dataRepo
      .getDriverMonthlySummary(
        selectedDriverId,
        selectedMonth === 'ALL' ? undefined : selectedMonth
      )
      .then((res) => {
        setSummary(res);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, [selectedDriverId, selectedMonth]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/50 border border-blue-400/40 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                {t('driverMonthCalcTitle')}
              </h2>
              <p className="text-xs text-blue-200 font-medium">
                {t('driverMonthCalcDesc')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('selectDriverLabel')}
            </label>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
            >
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name} ({d.phone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('selectMonthLabel')}
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
            >
              <option value="2026-10">October 2026 (നടപ്പ് മാസം)</option>
              <option value="2026-09">September 2026</option>
              <option value="2026-08">August 2026</option>
              <option value="ALL">{t('allMonths')}</option>
            </select>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {isLoading ? (
            <div className="py-12 text-center text-slate-500 font-medium">
              കണക്കുകൾ തയ്യാറാക്കുന്നു (Calculating)...
            </div>
          ) : !summary ? (
            <div className="py-12 text-center text-slate-500 font-medium">
              {t('noTripsFound')}
            </div>
          ) : (
            <>
              {/* Driver Header Pill */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-blue-50 border border-blue-200/80 p-3.5 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                    {summary.driver.full_name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 leading-tight">
                      {summary.driver.full_name}
                    </h4>
                    <p className="text-xs text-slate-600 font-mono">
                      {summary.driver.phone}
                    </p>
                  </div>
                </div>

                <a
                  href={`tel:${summary.driver.phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{t('callDriverBtn')}</span>
                </a>
              </div>

              {/* 3 Key Metric Cards */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
                <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 text-center">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase block tracking-wider">
                    {t('totalKmRun')}
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-700 font-mono block mt-0.5">
                    {summary.totalKilometers}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold">KM</span>
                </div>

                <div className="bg-blue-50 border border-blue-200/80 rounded-xl p-3 text-center">
                  <span className="text-[11px] font-bold text-blue-800 uppercase block tracking-wider">
                    {t('daysWorked')}
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-blue-700 font-mono block mt-0.5">
                    {summary.totalDaysWorked}
                  </span>
                  <span className="text-[10px] text-blue-600 font-semibold">Days</span>
                </div>

                <div className="bg-indigo-50 border border-indigo-200/80 rounded-xl p-3 text-center">
                  <span className="text-[11px] font-bold text-indigo-800 uppercase block tracking-wider">
                    {t('vehiclesUsed')}
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-indigo-700 font-mono block mt-0.5">
                    {summary.vehiclesBreakdown.length}
                  </span>
                  <span className="text-[10px] text-indigo-600 font-semibold">
                    {summary.totalTripsCount} Trips
                  </span>
                </div>
              </div>

              {/* Vehicles Driven Breakdown */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-blue-600" />
                  {t('vehiclesBreakdownTitle')}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {summary.vehiclesBreakdown.map((vb) => (
                    <div
                      key={vb.vehicle.id}
                      className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                          <Truck className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-mono font-black text-sm text-slate-900 block">
                            {vb.vehicle.registration_number}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {vb.vehicle.make_model}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-black text-emerald-600 font-mono block">
                          {vb.totalKm} KM
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold">
                          {vb.tripsCount} trips
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed Trip History List */}
              <div className="space-y-2.5 pt-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  {lang === 'ml' ? 'ദിവസേനയുള്ള ട്രിപ്പുകൾ (Trip Logs)' : 'Daily Trip Log'}
                </h4>

                <div className="space-y-2">
                  {summary.tripDetails.map((trip) => (
                    <div
                      key={trip.tripId}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                            {trip.dutyDate}
                          </span>
                          <span className="font-mono font-black text-blue-700">
                            {trip.vehicleRegistration}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                          +{trip.distance} KM
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-600 text-[11px]">
                        <span className="truncate max-w-[240px]">
                          📍 {trip.destination}
                        </span>
                        <span className="font-mono text-slate-500">
                          {trip.startOdo} → {trip.endOdo || '...'}
                        </span>
                      </div>

                      {trip.notes && (
                        <p className="text-[10px] text-slate-500 italic">
                          &quot;{trip.notes}&quot;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            onClick={() => window.print()}
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg bg-white border border-slate-300 shadow-2xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t('printSummaryBtn')}</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
          >
            {lang === 'ml' ? 'ശരി (Done)' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
