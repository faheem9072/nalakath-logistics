'use client';

import React, { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { dataRepo } from '@/lib/data-service';
import { TripWithDetails } from '@/types/models';
import { calculateTripDistance, formatDistance } from '@/lib/utils/odometer-calculator';
import { Navigation } from 'lucide-react';

export default function TripsPage() {
  const [trips, setTrips] = useState<TripWithDetails[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadTrips = async () => {
    setIsLoading(true);
    try {
      const list = await dataRepo.getTripsWithDetails();
      setTrips(list);
    } catch (err) {
      console.error('Failed to load trips:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, []);

  const filteredTrips = trips.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    return true;
  });

  return (
    <PageContainer
      title="Fleet Trips Log"
      subtitle="Complete chronological record of all duty trips, odometer readings, and verified kilometers."
    >
      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Total Recorded Trips: {trips.length}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">All Trips</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-slate-400 animate-pulse">
          Loading fleet trips log...
        </div>
      ) : filteredTrips.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-slate-500 text-sm">
            <Navigation className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            No trips matching the selected criteria.
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                <tr>
                  <th className="px-5 py-3.5">Trip</th>
                  <th className="px-5 py-3.5">Duty Date</th>
                  <th className="px-5 py-3.5">Vehicle</th>
                  <th className="px-5 py-3.5">Driver</th>
                  <th className="px-5 py-3.5">Route / Destination</th>
                  <th className="px-5 py-3.5">Location</th>
                  <th className="px-5 py-3.5">Odometer (Start → End)</th>
                  <th className="px-5 py-3.5">Distance</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredTrips.map((trip) => {
                  const dist = calculateTripDistance(trip.start_odometer, trip.end_odometer);

                  let hasLocation = false;
                  let locationText = '';
                  try {
                    let parsedLoc: any = trip.start_location;
                    if (typeof parsedLoc === 'string') parsedLoc = JSON.parse(parsedLoc);
                    if (
                      parsedLoc &&
                      !parsedLoc.no_location &&
                      (typeof parsedLoc.latitude === 'number' || typeof parsedLoc.longitude === 'number')
                    ) {
                      hasLocation = true;
                      locationText = parsedLoc.address || parsedLoc.place_name || `GPS (${parsedLoc.latitude?.toFixed(4)}, ${parsedLoc.longitude?.toFixed(4)})`;
                    }
                  } catch {}

                  return (
                    <tr key={trip.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-slate-900">
                        #{trip.trip_number}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-600">
                        {trip.assignment.duty_date}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-mono font-bold text-xs text-slate-900">
                          {trip.assignment.vehicle.registration_number}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {trip.assignment.vehicle.make_model}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-xs text-slate-900">
                          {trip.assignment.driver.full_name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {trip.assignment.driver.employee_code}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs font-semibold text-slate-800">
                          {trip.assigned_route?.name ||
                            trip.assignment.route?.name ||
                            'Ad-hoc Transit'}
                        </div>
                        {trip.actual_destination && (
                          <div className="text-[11px] text-blue-600 truncate mt-0.5">
                            Dest: {trip.actual_destination}
                          </div>
                        )}
                        {trip.driver_notes && (
                          <div className="text-[11px] text-slate-400 italic truncate mt-0.5">
                            Notes: {trip.driver_notes}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {hasLocation ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs text-slate-700 max-w-[160px] truncate"
                            title={locationText}
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <span className="truncate">{locationText}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            No location
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs">
                        <span>{trip.start_odometer ?? '—'}</span>
                        <span className="text-slate-400 mx-1.5">→</span>
                        <span>{trip.end_odometer ?? '—'}</span>
                      </td>
                      <td className="px-5 py-4">
                        {dist.hasValidPair ? (
                          <span className="font-bold text-emerald-600 font-mono text-xs">
                            {formatDistance(dist.distanceKm)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={trip.status} size="sm" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
