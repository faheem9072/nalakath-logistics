'use client';

import React from 'react';
import { AssignmentWithDetails } from '@/types/models';
import { Card, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Clock,
  Truck,
  User,
  MapPin,
  Building2,
  CheckCircle2,
  History,
  AlertCircle,
  Pencil,
} from 'lucide-react';

export interface AssignmentCardProps {
  assignment: AssignmentWithDetails;
  onEdit?: (assignment: AssignmentWithDetails) => void;
  onReassign?: (assignment: AssignmentWithDetails) => void;
  onViewEvents?: (assignment: AssignmentWithDetails) => void;
}

export function AssignmentCard({
  assignment,
  onEdit,
  onReassign,
  onViewEvents,
}: AssignmentCardProps) {
  const isConfirmed = assignment.driver_confirmed_at !== null;
  const tripsCount = assignment.trips?.length || 0;
  const activeTrip = assignment.trips?.find((t) => t.status === 'in_progress');

  return (
    <Card className="hover:border-slate-300 hover:shadow-md transition-all">
      <CardContent className="p-5 space-y-4">
        {/* Top Header Row */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
              {assignment.duty_date}
            </span>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {assignment.planned_start_time.slice(0, 5)} –{' '}
                {assignment.planned_end_time.slice(0, 5)}
              </span>
            </div>
          </div>
          <StatusBadge status={assignment.status} size="sm" />
        </div>

        {/* Vehicle & Driver Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Vehicle Info */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100/80">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase mb-1">
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              <span>Vehicle</span>
            </div>
            <div className="text-sm font-bold text-slate-900 font-mono tracking-wide">
              {assignment.vehicle.registration_number}
            </div>
            <div className="text-xs text-slate-500 truncate mt-0.5">
              {assignment.vehicle.make_model}
            </div>
          </div>

          {/* Driver Info */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100/80">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>Driver</span>
              </div>
              {isConfirmed ? (
                <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> Confirmed
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                  <AlertCircle className="w-3 h-3" /> Unconfirmed
                </span>
              )}
            </div>
            <div className="text-sm font-bold text-slate-900">
              {assignment.driver.full_name}
            </div>
            <div className="text-xs text-slate-500 font-mono mt-0.5">
              {assignment.driver.employee_code} ({assignment.driver.phone})
            </div>
          </div>
        </div>

        {/* Route & Team Info */}
        <div className="space-y-1.5 text-xs text-slate-600 pt-1">
          {assignment.route && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-700">
                {assignment.route.code}:
              </span>
              <span className="truncate">{assignment.route.name}</span>
            </div>
          )}

          {assignment.team && (
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-700">Client:</span>
              <span className="truncate">{assignment.team.name}</span>
            </div>
          )}

          {assignment.notes && (
            <p className="text-xs text-slate-500 italic mt-1 bg-amber-50/50 p-2 rounded border border-amber-100">
              Note: {assignment.notes}
            </p>
          )}
        </div>

        {/* Trips Status pill */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
          <div className="text-slate-500 font-medium">
            {tripsCount === 0 ? (
              <span>No trips started</span>
            ) : (
              <span>
                {tripsCount} trip{tripsCount > 1 ? 's' : ''} logged{' '}
                {activeTrip && (
                  <span className="text-indigo-600 font-semibold font-mono">
                    (Trip #{activeTrip.trip_number} Active)
                  </span>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onViewEvents && (
              <button
                onClick={() => onViewEvents(assignment)}
                className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-medium cursor-pointer"
                title="View Audit Events"
              >
                <History className="w-3.5 h-3.5" />
                <span>Audit</span>
              </button>
            )}

            {onEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(assignment)}
                className="text-xs py-1"
                leftIcon={<Pencil className="w-3 h-3" />}
              >
                Edit
              </Button>
            )}

            {onReassign &&
              assignment.status !== 'completed' &&
              assignment.status !== 'cancelled' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReassign(assignment)}
                  className="text-xs py-1"
                >
                  Reassign
                </Button>
              )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
