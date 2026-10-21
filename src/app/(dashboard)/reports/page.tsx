'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { dataRepo } from '@/lib/data-service';
import {
  aggregateDriverReport,
  aggregateVehicleReport,
} from '@/lib/utils/report-aggregator';
import { exportToCSV, triggerPrintReport } from '@/lib/utils/export-helpers';
import {
  DriverReportItem,
  VehicleReportItem,
} from '@/types/models';
import {
  Download,
  Printer,
  Calendar,
  Users,
  Truck,
  MapPin,
  Building2,
  BarChart3,
  Clock,
  TrendingUp,
  FileSpreadsheet,
  Search,
} from 'lucide-react';
import { NalakathLogo } from '@/components/brand/NalakathLogo';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'driver' | 'vehicle'>('driver');
  const [driverSearchQuery, setDriverSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [companyFilter, setCompanyFilter] = useState<'all' | 'Delhivery' | 'Shadowfax'>('all');

  const [driverReport, setDriverReport] = useState<DriverReportItem[]>([]);
  const [vehicleReport, setVehicleReport] = useState<VehicleReportItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedDriverAudit, setSelectedDriverAudit] = useState<DriverReportItem | null>(null);

  const generateReports = async (
    sDate?: string,
    eDate?: string,
    comp?: 'all' | 'Delhivery' | 'Shadowfax'
  ) => {
    setIsLoading(true);
    try {
      const activeComp = comp !== undefined ? comp : companyFilter;
      const raw = await dataRepo.getReportRawData(activeComp);
      const input = {
        ...raw,
        startDate: sDate || startDate || undefined,
        endDate: eDate || endDate || undefined,
      };

      setDriverReport(aggregateDriverReport(input));
      setVehicleReport(aggregateVehicleReport(input));
    } catch (err) {
      console.error('Failed to generate reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const s = `${y}-${m}-01`;
    const e = `${y}-${m}-${day}`;
    setStartDate(s);
    setEndDate(e);
    generateReports(s, e, companyFilter);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      generateReports(startDate, endDate, companyFilter);
    }
  }, [startDate, endDate, companyFilter]);

  const handleExportCSV = () => {
    const period = `${startDate}_to_${endDate}`;
    if (activeTab === 'driver') {
      exportToCSV(`nalakath_driver_report_${period}`, driverReport, {
        driverName: 'Driver Name',
        employeeCode: 'Employee Code',
        phone: 'Phone',
        assignedDutyDays: 'Assigned Duty Days',
        totalDutyHours: 'Total Job Time (Hours)',
        formattedDutyTime: 'Duty Hours (Formatted)',
        averageDailyHours: 'Average Hours Per Day',
        completedTripsCount: 'Completed Trips',
        totalDistanceKm: 'Recorded Distance (km)',
        vehiclesUsed: 'Vehicles Driven',
        routesOperated: 'Routes Operated',
        driverId: 'Driver ID',
        hasMissingOdometerTrips: 'Missing Odometer Notes',
      });
    } else if (activeTab === 'vehicle') {
      exportToCSV(`fleetflow_vehicle_report_${period}`, vehicleReport, {
        registrationNumber: 'Registration Number',
        makeModel: 'Make & Model',
        vehicleType: 'Type',
        currentOdometer: 'Current Odometer (km)',
        status: 'Status',
        driversCount: 'Distinct Drivers',
        dutyDatesCount: 'Duty Days Deployed',
        completedTripsCount: 'Completed Trips',
        totalDistanceKm: 'Recorded Distance (km)',
        driversUsed: 'Drivers Involved',
        routesOperated: 'Routes Operated',
        vehicleId: 'Vehicle ID',
        maintenancePeriodsCount: 'Maintenance Periods',
      });
    }
  };

  const filteredDriverReport = driverReport.filter(
    (d) =>
      d.driverName.toLowerCase().includes(driverSearchQuery.toLowerCase()) ||
      d.phone.includes(driverSearchQuery) ||
      (d.employeeCode && d.employeeCode.toLowerCase().includes(driverSearchQuery.toLowerCase()))
  );

  return (
    <PageContainer
      title="Monthly Fleet Reports"
      subtitle="Driver working days, kilometers operated across vehicles, and vehicle monthly expenses."
      action={
        <div className="flex items-center gap-2 print:hidden">
          <Button
            variant="outline"
            size="md"
            onClick={triggerPrintReport}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Print / PDF
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleExportCSV}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export CSV
          </Button>
        </div>
      }
    >
      {/* Date Filter, Tab Selection & Company Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col xl:flex-row items-center justify-between gap-4 print:hidden">
        {/* Report Tabs (Only 2 essential tabs: Driver & Vehicle) */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-full xl:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('driver')}
            className={`flex-1 xl:flex-initial px-4 py-2 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'driver'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Driver Performance</span>
          </button>
          <button
            onClick={() => setActiveTab('vehicle')}
            className={`flex-1 xl:flex-initial px-4 py-2 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'vehicle'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Vehicle Utilization</span>
          </button>
        </div>

        {/* Company Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-full xl:w-auto">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2 shrink-0">
            Company:
          </span>
          <button
            onClick={() => {
              setCompanyFilter('all');
              generateReports(startDate, endDate, 'all');
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              companyFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All
          </button>
          <button
            onClick={() => {
              setCompanyFilter('Delhivery');
              generateReports(startDate, endDate, 'Delhivery');
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              companyFilter === 'Delhivery'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-rose-700'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>Delhivery</span>
          </button>
          <button
            onClick={() => {
              setCompanyFilter('Shadowfax');
              generateReports(startDate, endDate, 'Shadowfax');
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              companyFilter === 'Shadowfax'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-amber-700'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Shadowfax</span>
          </button>
        </div>

        {/* Date Range Inputs */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-700 w-full xl:w-auto">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
          <span>From</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span>To</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Printable Header for PDF */}
      <div className="hidden print:block pb-5 mb-6 border-b-2 border-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <NalakathLogo size="md" variant="circle" />
            <div>
              <h2 className="text-xl font-black text-slate-950 uppercase tracking-tight">
                NALAKATH LOGISTICS
              </h2>
              <p className="text-xs font-bold text-rose-700 uppercase tracking-wider">
                Fleet & Duty Operations • Established 1998
              </p>
              <p className="text-[10px] text-slate-500">
                Official Commercial Logistics & Mileage Audit Report
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900">
              {activeTab.toUpperCase()}-WISE SUMMARY
            </div>
            <div className="text-[11px] font-mono text-slate-600">
              Period: {startDate} to {endDate}
            </div>
          </div>
        </div>
      </div>

      {/* Visual Chart Card */}
      <Card className="print:hidden">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span>
                {activeTab === 'driver'
                  ? 'Top Drivers by Hours & Distance'
                  : 'Vehicle Distance Run'}
              </span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              Audited Time & Odometer Measurement
            </span>
          </div>

          {/* Pure SVG Bar Visualizer */}
          <div className="space-y-3 pt-1">
            {activeTab === 'driver' &&
              driverReport.slice(0, 5).map((d) => {
                const maxDist = Math.max(...driverReport.map((x) => x.totalDistanceKm), 10);
                const percent = Math.min(100, Math.round((d.totalDistanceKm / maxDist) * 100));
                return (
                  <div key={d.driverId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-800 font-semibold">{d.driverName}</span>
                        <span className="text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-mono font-bold border border-blue-100 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{d.formattedDutyTime}</span>
                        </span>
                      </div>
                      <span className="font-mono text-slate-600">
                        {d.totalDistanceKm} km • {d.assignedDutyDays} duty days
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}

            {activeTab === 'vehicle' &&
              vehicleReport.slice(0, 5).map((v) => {
                const maxDist = Math.max(...vehicleReport.map((x) => x.totalDistanceKm), 10);
                const percent = Math.min(100, Math.round((v.totalDistanceKm / maxDist) * 100));
                return (
                  <div key={v.vehicleId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-800 font-mono font-bold">
                        {v.registrationNumber} ({v.makeModel})
                      </span>
                      <span className="font-mono text-slate-600">{v.totalDistanceKm} km</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Main Report Table */}
      {isLoading ? (
        <div className="py-16 text-center text-sm text-slate-400 animate-pulse">
          Calculating audited fleet metrics...
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            {/* 1. Driver-wise Table */}
            {activeTab === 'driver' && (
              <>
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={driverSearchQuery}
                      onChange={(e) => setDriverSearchQuery(e.target.value)}
                      placeholder="Search driver by name or phone..."
                      className="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    />
                  </div>
                  <div className="text-xs font-bold text-slate-600">
                    {filteredDriverReport.length} Drivers found
                  </div>
                </div>

                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5">Driver</th>
                      <th className="px-5 py-3.5">Days Worked</th>
                      <th className="px-5 py-3.5">Duty Hours</th>
                      <th className="px-5 py-3.5">Total KM</th>
                      <th className="px-5 py-3.5">Vehicles Driven</th>
                      <th className="px-5 py-3.5">Routes</th>
                      <th className="px-5 py-3.5 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredDriverReport.map((row) => (
                    <tr key={row.driverId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">{row.driverName}</div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          {row.employeeCode} • {row.phone}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-slate-900">
                        <div>{row.assignedDutyDays} days</div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          {row.confirmedAssignments} confirmed
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="font-mono font-black text-slate-900 text-sm">
                            {row.totalDutyHours} hrs
                          </span>
                        </div>
                        <div className="text-[11px] text-blue-700 font-semibold font-mono mt-0.5">
                          {row.formattedDutyTime}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Avg: {row.averageDailyHours} hrs/day
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-mono font-bold text-emerald-600">
                          {row.totalDistanceKm} km
                          {row.hasMissingOdometerTrips && (
                            <span
                              className="ml-1 text-amber-500 text-[10px]"
                              title="Some trips lacked complete odometer pair"
                            >
                              *
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          {row.completedTripsCount} trips
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5 max-w-sm">
                          {row.vehicleBreakdown.map((vb) => (
                            <span
                              key={vb.vehicleId}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-800 border border-slate-200"
                              title={`${vb.makeModel}: ${vb.dutyDaysCount} duty days, ${vb.tripsCount} trips, ${vb.distanceKm} km`}
                            >
                              <Truck className="w-3 h-3 text-blue-600 shrink-0" />
                              <span className="font-bold">{vb.registrationNumber}</span>
                              <span className="text-slate-500 text-[10px]">
                                ({vb.tripsCount} tr • {vb.distanceKm} km)
                              </span>
                            </span>
                          ))}
                          {row.vehicleBreakdown.length === 0 && (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs">
                        {row.routesOperated.length > 0 ? row.routesOperated.join(', ') : '—'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs py-1"
                          onClick={() => setSelectedDriverAudit(row)}
                          leftIcon={<FileSpreadsheet className="w-3.5 h-3.5" />}
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
            )}

            {/* 2. Vehicle-wise Table */}
            {activeTab === 'vehicle' && (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Registration</th>
                    <th className="px-5 py-3.5">Company</th>
                    <th className="px-5 py-3.5">Make & Model</th>
                    <th className="px-5 py-3.5">Duty Days</th>
                    <th className="px-5 py-3.5">Trips</th>
                    <th className="px-5 py-3.5">Total KM</th>
                    <th className="px-5 py-3.5">Drivers</th>
                    <th className="px-5 py-3.5">Routes</th>
                    <th className="px-5 py-3.5 text-right">Expenses</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {vehicleReport.map((row) => (
                    <tr key={row.vehicleId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-slate-900">
                        {row.registrationNumber}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            row.company === 'Delhivery'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              row.company === 'Delhivery' ? 'bg-rose-500' : 'bg-amber-500'
                            }`}
                          />
                          <span>{row.company || 'Delhivery'}</span>
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs">{row.makeModel}</td>
                      <td className="px-5 py-4 font-mono font-bold text-slate-900">
                        {row.dutyDatesCount} days
                      </td>
                      <td className="px-5 py-4 font-mono text-xs font-semibold">
                        {row.completedTripsCount} trips
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-emerald-600">
                        {row.totalDistanceKm} km
                      </td>
                      <td className="px-5 py-4 text-xs font-medium">
                        {row.driversUsed.length > 0 ? row.driversUsed.join(', ') : '—'}
                      </td>
                      <td className="px-5 py-4 text-xs">
                        {row.routesOperated.length > 0 ? row.routesOperated.join(', ') : '—'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link href={`/vehicles/${row.registrationNumber.slice(-4)}`}>
                          <Button size="sm" variant="outline" className="text-xs py-1">
                            View Details
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Driver Detailed Monthly Audit Modal */}
      <Modal
        isOpen={!!selectedDriverAudit}
        onClose={() => setSelectedDriverAudit(null)}
        title={`${selectedDriverAudit?.driverName || 'Driver'} — Monthly Duty & Vehicle Audit`}
        description={`Audit period: ${startDate} to ${endDate} | Code: ${selectedDriverAudit?.employeeCode} | Mobile: ${selectedDriverAudit?.phone}`}
        maxWidth="lg"
      >
        {selectedDriverAudit && (
          <div className="space-y-5">
            {/* 3 Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-100">
                <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Total Job Time</span>
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                  {selectedDriverAudit.totalDutyHours} <span className="text-xs font-normal text-slate-600">hrs</span>
                </div>
                <div className="text-xs text-blue-800 font-semibold mt-0.5 font-mono">
                  {selectedDriverAudit.formattedDutyTime}
                </div>
              </div>

              <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-100">
                <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Duty Days Worked</span>
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                  {selectedDriverAudit.assignedDutyDays} <span className="text-xs font-normal text-slate-600">days</span>
                </div>
                <div className="text-xs text-emerald-800 font-semibold mt-0.5">
                  Avg: {selectedDriverAudit.averageDailyHours} hrs / day
                </div>
              </div>

              <div className="bg-purple-50/70 p-3.5 rounded-xl border border-purple-100">
                <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Transit Distance</span>
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                  {selectedDriverAudit.totalDistanceKm} <span className="text-xs font-normal text-slate-600">km</span>
                </div>
                <div className="text-xs text-purple-800 font-semibold mt-0.5 font-mono">
                  {selectedDriverAudit.completedTripsCount} trips completed
                </div>
              </div>
            </div>

            {/* Vehicle-wise Deployment Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>Exact Vehicles Driven & Transit Mileage (Month-End Breakdown)</span>
              </h4>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">Vehicle Registration</th>
                      <th className="px-4 py-2.5">Make & Model</th>
                      <th className="px-4 py-2.5">Days Deployed</th>
                      <th className="px-4 py-2.5">Trips Completed</th>
                      <th className="px-4 py-2.5">Distance Covered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {selectedDriverAudit.vehicleBreakdown.map((vb) => (
                      <tr key={vb.vehicleId} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-900">
                          {vb.registrationNumber}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{vb.makeModel || 'Commercial Vehicle'}</td>
                        <td className="px-4 py-2.5 font-mono">{vb.dutyDaysCount} days</td>
                        <td className="px-4 py-2.5 font-mono">{vb.tripsCount} trips</td>
                        <td className="px-4 py-2.5 font-mono font-bold text-emerald-600">
                          {vb.distanceKm} km
                        </td>
                      </tr>
                    ))}
                    {selectedDriverAudit.vehicleBreakdown.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                          No vehicle transit records for this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Routes Corridor Summary */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Corridors / Routes Operated
              </span>
              <div className="text-xs text-slate-800 font-medium">
                {selectedDriverAudit.routesOperated.length > 0
                  ? selectedDriverAudit.routesOperated.join(', ')
                  : 'Flexible Daily Routes'}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setSelectedDriverAudit(null)}>
                Close Audit View
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}
