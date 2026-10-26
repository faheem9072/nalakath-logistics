'use client';

import React, { useState, useEffect } from 'react';
import {
  dataRepo,
  VehicleTravelHistory,
} from '@/lib/data-service';
import { Vehicle } from '@/types/database';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  X,
  Truck,
  MapPin,
  Calendar,
  Gauge,
  Phone,
  Printer,
  Search,
  Users,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialVehicleId?: string;
}

export function VehicleTravelHistoryModal({
  isOpen,
  onClose,
  initialVehicleId,
}: Props) {
  const { lang, t } = useLanguage();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleQuery, setSelectedVehicleQuery] = useState<string>('');
  const [historyData, setHistoryData] = useState<VehicleTravelHistory | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      dataRepo.getVehicles().then((list) => {
        setVehicles(list);
        if (initialVehicleId) {
          setSelectedVehicleQuery(initialVehicleId);
        } else if (list.length > 0 && !selectedVehicleQuery) {
          setSelectedVehicleQuery(list[0].registration_number);
        }
      });
    }
  }, [isOpen, initialVehicleId]);

  useEffect(() => {
    if (!selectedVehicleQuery) return;
    setIsLoading(true);
    dataRepo
      .getVehicleTravelHistory(selectedVehicleQuery)
      .then((res) => {
        setHistoryData(res);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, [selectedVehicleQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/50 border border-blue-400/40 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                {t('vehicleHistoryTitle')}
              </h2>
              <p className="text-xs text-blue-200 font-medium">
                {t('vehicleHistoryDesc')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vehicle Selector */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-2 shrink-0">
          <label className="block text-xs font-bold text-slate-700">
            {t('selectVehicleLabel')}
          </label>
          <div className="flex gap-2">
            <select
              value={selectedVehicleQuery}
              onChange={(e) => setSelectedVehicleQuery(e.target.value)}
              className="flex-1 h-11 px-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-mono"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.registration_number}>
                  {v.registration_number} — {v.make_model}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {isLoading ? (
            <div className="py-12 text-center text-slate-500 font-medium">
              Loading travel history...
            </div>
          ) : !historyData ? (
            <div className="py-12 text-center text-slate-500 font-medium">
              {t('noTripsFound')}
            </div>
          ) : (
            <>
              {/* Vehicle Highlight Card */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white p-4 rounded-xl shadow-xs">
                <div>
                  <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">
                    Vehicle Registration
                  </span>
                  <span className="text-xl font-black font-mono tracking-tight text-white block">
                    {historyData.vehicle.registration_number}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {historyData.vehicle.make_model} • {historyData.vehicle.vehicle_type}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {t('currentOdoLabel')}
                  </span>
                  <span className="text-lg font-black text-emerald-400 font-mono block">
                    {historyData.vehicle.current_odometer.toLocaleString()} KM
                  </span>
                </div>
              </div>

              {/* 3 Metric Stats */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
                <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 text-center">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase block tracking-wider">
                    {t('lifetimeKm')}
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-700 font-mono block mt-0.5">
                    {historyData.totalRecordedDistance}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold">KM Run</span>
                </div>

                <div className="bg-blue-50 border border-blue-200/80 rounded-xl p-3 text-center">
                  <span className="text-[11px] font-bold text-blue-800 uppercase block tracking-wider">
                    Total Trips
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-blue-700 font-mono block mt-0.5">
                    {historyData.tripsCount}
                  </span>
                  <span className="text-[10px] text-blue-600 font-semibold">Trips Logged</span>
                </div>

                <div className="bg-indigo-50 border border-indigo-200/80 rounded-xl p-3 text-center">
                  <span className="text-[11px] font-bold text-indigo-800 uppercase block tracking-wider">
                    {t('uniqueDrivers')}
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-indigo-700 font-mono block mt-0.5">
                    {historyData.uniqueDrivers.length}
                  </span>
                  <span className="text-[10px] text-indigo-600 font-semibold">Drivers</span>
                </div>
              </div>

              {/* Drivers Who Drove This Vehicle */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  Drivers Who Operated This Vehicle
                </h4>

                <div className="flex flex-wrap gap-2">
                  {historyData.uniqueDrivers.map((ud) => (
                    <div
                      key={ud.driver.id}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-medium flex items-center gap-2"
                    >
                      <span className="font-bold text-slate-800">{ud.driver.full_name}</span>
                      <span className="font-mono text-emerald-700 font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">
                        {ud.totalKm} KM ({ud.tripsCount} trips)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Complete Travel & Route History Log */}
              <div className="space-y-2.5 pt-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  Complete Travel & Destination Log
                </h4>

                <div className="space-y-2.5">
                  {historyData.history.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">
                      No trips recorded yet for this vehicle.
                    </p>
                  ) : (
                    historyData.history.map((item) => (
                    <div
                      key={item.tripId}
                      className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2"
                    >
                      {/* Top Row: Date & Distance */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            📅 {item.dutyDate}
                          </span>
                          <span className="text-xs font-bold text-slate-700">
                            {item.routeName}
                          </span>
                        </div>
                        <span className="font-mono font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs">
                          +{item.distance} KM
                        </span>
                      </div>

                      {/* Destination */}
                      <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{item.destination}</span>
                      </div>

                      {/* Driver & Meter Reading */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px] text-slate-600">
                        <div className="flex items-center gap-2">
                          <span>
                            Driver:{' '}
                            <strong className="text-slate-900">{item.driverName}</strong>
                          </span>
                          {item.driverPhone && (
                            <a
                              href={`tel:${item.driverPhone}`}
                              className="text-blue-600 hover:underline font-mono inline-flex items-center gap-0.5"
                            >
                              <Phone className="w-3 h-3" />
                              {item.driverPhone}
                            </a>
                          )}
                        </div>

                        <div className="font-mono text-slate-500 text-[10px]">
                          Meter: {item.startOdo} → {item.endOdo || 'Live'}
                        </div>
                      </div>

                      {item.notes && (
                        <p className="text-[10px] text-slate-500 italic">
                          &quot;{item.notes}&quot;
                        </p>
                      )}
                    </div>
                  )))}
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
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
