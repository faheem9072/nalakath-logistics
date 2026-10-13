'use client';

import React, { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { AssignmentCard } from '@/components/assignments/AssignmentCard';
import { AssignmentFormModal } from '@/components/assignments/AssignmentFormModal';
import { EditAssignmentModal } from '@/components/assignments/EditAssignmentModal';
import { ReassignModal } from '@/components/assignments/ReassignModal';
import { AssignmentEventTimeline } from '@/components/assignments/AssignmentEventTimeline';
import { Button } from '@/components/ui/Button';
import { dataRepo } from '@/lib/data-service';
import { AssignmentWithDetails } from '@/types/models';
import { Vehicle, Driver, Route, Team } from '@/types/database';
import { getTodayDateString } from '@/lib/mock/mock-store';
import {
  Plus,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';

export default function AssignmentsPage() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AssignmentWithDetails | null>(null);
  const [reassignTarget, setReassignTarget] = useState<AssignmentWithDetails | null>(null);
  const [eventsTarget, setEventsTarget] = useState<AssignmentWithDetails | null>(null);

  const [todayDate, setTodayDate] = useState<string>('');

  const loadData = async (dateToLoad?: string) => {
    setIsLoading(true);
    try {
      const targetDate = dateToLoad || selectedDate;
      const [allAssignments, v, d, r, t] = await Promise.all([
        dataRepo.getAssignmentsWithDetails(targetDate || undefined),
        dataRepo.getVehicles(),
        dataRepo.getDrivers(),
        dataRepo.getRoutes(),
        dataRepo.getTeams(),
      ]);
      setAssignments(allAssignments);
      setVehicles(v);
      setDrivers(d);
      setRoutes(r);
      setTeams(t);
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const today = getTodayDateString();
    setTodayDate(today);
    setSelectedDate(today);
    loadData(today);
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadData(selectedDate);
    }
  }, [selectedDate]);

  const handleDateShift = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const filteredAssignments = assignments.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    return true;
  });

  const driversMap = new Map(drivers.map((d) => [d.id, d.full_name]));
  const vehiclesMap = new Map(vehicles.map((v) => [v.id, v.registration_number]));

  return (
    <PageContainer
      title="Daily Duty Allocations"
      subtitle="Schedule and monitor driver-to-vehicle duty allocations with concurrency protection."
      action={
        <Button
          variant="primary"
          onClick={() => setIsCreateOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Allocate Duty
        </Button>
      }
    >
      {/* Date Bar & Filter Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDateShift(-1)}
            aria-label="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDateShift(1)}
            aria-label="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          {todayDate && selectedDate !== todayDate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDate(todayDate)}
              className="text-xs text-blue-600"
            >
              Today
            </Button>
          )}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Statuses ({assignments.length})</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <button
            onClick={() => loadData()}
            title="Reload Duties"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Assignments Cards Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-sm text-slate-400 animate-pulse">
          Loading duty allocations for {selectedDate}...
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-semibold text-slate-700">
            No Duty Allocations for {selectedDate}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No drivers or vehicles have been scheduled for this date matching the current filter.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Create Duty for this Date
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAssignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              onEdit={(a) => setEditTarget(a)}
              onReassign={(a) => setReassignTarget(a)}
              onViewEvents={(a) => setEventsTarget(a)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <AssignmentFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={loadData}
        vehicles={vehicles}
        drivers={drivers}
        routes={routes}
        teams={teams}
      />

      {/* Edit Duty Modal */}
      <EditAssignmentModal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={loadData}
        assignment={editTarget}
        vehicles={vehicles}
        drivers={drivers}
        routes={routes}
        teams={teams}
      />

      {/* Reassign Modal */}
      <ReassignModal
        isOpen={!!reassignTarget}
        onClose={() => setReassignTarget(null)}
        onSuccess={loadData}
        assignment={reassignTarget}
        vehicles={vehicles}
        drivers={drivers}
      />

      {/* Audit Events Timeline Modal */}
      <AssignmentEventTimeline
        isOpen={!!eventsTarget}
        onClose={() => setEventsTarget(null)}
        assignment={eventsTarget}
        driversMap={driversMap}
        vehiclesMap={vehiclesMap}
      />
    </PageContainer>
  );
}
