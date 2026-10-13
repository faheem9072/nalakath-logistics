'use client';

import React, { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { dataRepo } from '@/lib/data-service';
import {
  aggregateDriverReport,
  aggregateVehicleReport,
  aggregateRouteReport,
  aggregateTeamReport,
} from '@/lib/utils/report-aggregator';
import { exportToCSV, triggerPrintReport } from '@/lib/utils/export-helpers';
import {
  DriverReportItem,
  VehicleReportItem,
  RouteReportItem,
  TeamReportItem,
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
} from 'lucide-react';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'driver' | 'vehicle' | 'route' | 'team'>('driver');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [driverReport, setDriverReport] = useState<DriverReportItem[]>([]);
  const [vehicleReport, setVehicleReport] = useState<VehicleReportItem[]>([]);
  const [routeReport, setRouteReport] = useState<RouteReportItem[]>([]);
  const [teamReport, setTeamReport] = useState<TeamReportItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const generateReports = async (sDate?: string, eDate?: string) => {
    setIsLoading(true);
    try {
      const raw = await dataRepo.getReportRawData();
      const input = {
        ...raw,
        startDate: sDate || startDate || undefined,
        endDate: eDate || endDate || undefined,
      };

      setDriverReport(aggregateDriverReport(input));
      setVehicleReport(aggregateVehicleReport(input));
      setRouteReport(aggregateRouteReport(input));
      setTeamReport(aggregateTeamReport(input));
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
    generateReports(s, e);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      generateReports();
    }
  }, [startDate, endDate]);

  const handleExportCSV = () => {
    const period = `${startDate}_to_${endDate}`;
    if (activeTab === 'driver') {
      exportToCSV(`fleetflow_driver_report_${period}`, driverReport, {
        driverName: 'Driver Name',
        employeeCode: 'Employee Code',
        phone: 'Phone',
        assignedDutyDays: 'Assigned Duty Days',
        confirmedAssignments: 'Confirmed Assignments',
        completedTripsCount: 'Completed Trips',
        totalDistanceKm: 'Recorded Distance (km)',
        vehiclesUsed: 'Vehicles Used',
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
    } else if (activeTab === 'route') {
      exportToCSV(`fleetflow_route_report_${period}`, routeReport, {
        routeCode: 'Route Code',
        routeName: 'Route Name',
        origin: 'Origin',
        destination: 'Destination',
        clientName: 'Client',
        completedTripsCount: 'Completed Trips',
        distinctDriversCount: 'Distinct Drivers',
        distinctVehiclesCount: 'Distinct Vehicles',
        totalDistanceKm: 'Total Distance (km)',
        routeId: 'Route ID',
      });
    } else {
      exportToCSV(`fleetflow_team_report_${period}`, teamReport, {
        teamName: 'Client / Team Name',
        contactPerson: 'Contact Person',
        completedTripsCount: 'Completed Trips',
        distinctVehiclesCount: 'Distinct Vehicles Deployed',
        distinctDriversCount: 'Distinct Drivers Involved',
        totalDistanceKm: 'Total Distance (km)',
        teamId: 'Team ID',
      });
    }
  };

  return (
    <PageContainer
      title="Monthly Fleet Operations Reports"
      subtitle="Audited duty days, completed trips, vehicle deployments, and verified odometer distances."
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
      {/* Date Filter & Tab Selection */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
        {/* Report Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-full md:w-auto">
          <button
            onClick={() => setActiveTab('driver')}
            className={`flex-1 md:flex-initial px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'driver'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Driver-wise</span>
          </button>
          <button
            onClick={() => setActiveTab('vehicle')}
            className={`flex-1 md:flex-initial px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'vehicle'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Vehicle-wise</span>
          </button>
          <button
            onClick={() => setActiveTab('route')}
            className={`flex-1 md:flex-initial px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'route'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Route-wise</span>
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`flex-1 md:flex-initial px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'team'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Client / Team</span>
          </button>
        </div>

        {/* Date Range Inputs */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-700 w-full md:w-auto">
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
      <div className="hidden print:block pb-4 border-b border-slate-300">
        <h2 className="text-xl font-bold text-slate-900">FleetFlow Commercial Operations Report</h2>
        <p className="text-xs text-slate-600">
          Report Type: {activeTab.toUpperCase()}-WISE | Date Range: {startDate} to {endDate}
        </p>
      </div>

      {/* Visual Chart Card */}
      <Card className="print:hidden">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span>
                {activeTab === 'driver'
                  ? 'Top Drivers by Verified Distance (km)'
                  : activeTab === 'vehicle'
                  ? 'Vehicle Utilization by Distance (km)'
                  : activeTab === 'route'
                  ? 'Route Trips Completed'
                  : 'Client / Team Service Completed Trips'}
              </span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              Accurate Odometer Pair Measurement
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
                      <span className="text-slate-800 font-semibold">{d.driverName}</span>
                      <span className="font-mono text-slate-600">{d.totalDistanceKm} km</span>
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

            {activeTab === 'route' &&
              routeReport.slice(0, 5).map((r) => {
                const maxTrips = Math.max(...routeReport.map((x) => x.completedTripsCount), 5);
                const percent = Math.min(
                  100,
                  Math.round((r.completedTripsCount / maxTrips) * 100)
                );
                return (
                  <div key={r.routeId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-800 font-semibold">
                        {r.routeCode} — {r.routeName}
                      </span>
                      <span className="font-mono text-slate-600">
                        {r.completedTripsCount} trips
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}

            {activeTab === 'team' &&
              teamReport.slice(0, 5).map((t) => {
                const maxTrips = Math.max(...teamReport.map((x) => x.completedTripsCount), 5);
                const percent = Math.min(
                  100,
                  Math.round((t.completedTripsCount / maxTrips) * 100)
                );
                return (
                  <div key={t.teamId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-800 font-semibold">{t.teamName}</span>
                      <span className="font-mono text-slate-600">
                        {t.completedTripsCount} trips
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-600 h-full rounded-full transition-all duration-500"
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
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Driver</th>
                    <th className="px-5 py-3.5">Code</th>
                    <th className="px-5 py-3.5">Assigned Duty Days</th>
                    <th className="px-5 py-3.5">Confirmed Duties</th>
                    <th className="px-5 py-3.5">Completed Trips</th>
                    <th className="px-5 py-3.5">Recorded Distance</th>
                    <th className="px-5 py-3.5">Vehicles Used</th>
                    <th className="px-5 py-3.5">Routes Operated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {driverReport.map((row) => (
                    <tr key={row.driverId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4 font-semibold text-slate-900">{row.driverName}</td>
                      <td className="px-5 py-4 font-mono text-xs">{row.employeeCode}</td>
                      <td className="px-5 py-4 font-mono font-bold text-slate-900">
                        {row.assignedDutyDays} days
                      </td>
                      <td className="px-5 py-4 font-mono text-xs">{row.confirmedAssignments}</td>
                      <td className="px-5 py-4 font-mono text-xs font-semibold">
                        {row.completedTripsCount} trips
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-emerald-600">
                        {row.totalDistanceKm} km
                        {row.hasMissingOdometerTrips && (
                          <span
                            className="ml-1 text-amber-500 text-[10px]"
                            title="Some trips lacked complete odometer pair"
                          >
                            *
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs font-mono">
                        {row.vehiclesUsed.length > 0 ? row.vehiclesUsed.join(', ') : '—'}
                      </td>
                      <td className="px-5 py-4 text-xs">
                        {row.routesOperated.length > 0 ? row.routesOperated.join(', ') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 2. Vehicle-wise Table */}
            {activeTab === 'vehicle' && (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Registration</th>
                    <th className="px-5 py-3.5">Make & Model</th>
                    <th className="px-5 py-3.5">Duty Days Deployed</th>
                    <th className="px-5 py-3.5">Completed Trips</th>
                    <th className="px-5 py-3.5">Recorded Distance</th>
                    <th className="px-5 py-3.5">Drivers Involved</th>
                    <th className="px-5 py-3.5">Routes Operated</th>
                    <th className="px-5 py-3.5">Current Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {vehicleReport.map((row) => (
                    <tr key={row.vehicleId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-slate-900">
                        {row.registrationNumber}
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
                      <td className="px-5 py-4 text-xs">
                        {row.driversUsed.length > 0 ? row.driversUsed.join(', ') : '—'}
                      </td>
                      <td className="px-5 py-4 text-xs">
                        {row.routesOperated.length > 0 ? row.routesOperated.join(', ') : '—'}
                      </td>
                      <td className="px-5 py-4 capitalize text-xs font-semibold">
                        {row.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 3. Route-wise Table */}
            {activeTab === 'route' && (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Route Code</th>
                    <th className="px-5 py-3.5">Route Name</th>
                    <th className="px-5 py-3.5">Client</th>
                    <th className="px-5 py-3.5">Completed Trips</th>
                    <th className="px-5 py-3.5">Distinct Drivers</th>
                    <th className="px-5 py-3.5">Distinct Vehicles</th>
                    <th className="px-5 py-3.5">Total Distance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {routeReport.map((row) => (
                    <tr key={row.routeId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-slate-900">
                        {row.routeCode}
                      </td>
                      <td className="px-5 py-4 text-xs">
                        <div className="font-semibold text-slate-900">{row.routeName}</div>
                        <div className="text-slate-400 text-[11px]">
                          {row.origin} → {row.destination}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs">{row.clientName}</td>
                      <td className="px-5 py-4 font-mono font-bold text-slate-900">
                        {row.completedTripsCount} trips
                      </td>
                      <td className="px-5 py-4 font-mono text-xs">{row.distinctDriversCount}</td>
                      <td className="px-5 py-4 font-mono text-xs">{row.distinctVehiclesCount}</td>
                      <td className="px-5 py-4 font-mono font-bold text-emerald-600">
                        {row.totalDistanceKm} km
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 4. Team-wise Table */}
            {activeTab === 'team' && (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Client / Team Name</th>
                    <th className="px-5 py-3.5">Contact Person</th>
                    <th className="px-5 py-3.5">Completed Trips</th>
                    <th className="px-5 py-3.5">Vehicles Deployed</th>
                    <th className="px-5 py-3.5">Drivers Assigned</th>
                    <th className="px-5 py-3.5">Total Service Distance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {teamReport.map((row) => (
                    <tr key={row.teamId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-900">{row.teamName}</td>
                      <td className="px-5 py-4 text-xs text-slate-600">
                        {row.contactPerson || '—'}
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-slate-900">
                        {row.completedTripsCount} trips
                      </td>
                      <td className="px-5 py-4 font-mono text-xs font-semibold">
                        {row.distinctVehiclesCount} vehicles
                      </td>
                      <td className="px-5 py-4 font-mono text-xs font-semibold">
                        {row.distinctDriversCount} drivers
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-emerald-600">
                        {row.totalDistanceKm} km
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
