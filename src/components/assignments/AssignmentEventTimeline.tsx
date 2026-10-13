'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { AssignmentWithDetails } from '@/types/models';
import { AssignmentEvent } from '@/types/database';
import {
  Clock,
  UserCheck,
  Play,
  CheckCircle,
  RefreshCw,
  XCircle,
  PlusCircle,
} from 'lucide-react';

export interface AssignmentEventTimelineProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: AssignmentWithDetails | null;
  driversMap?: Map<string, string>;
  vehiclesMap?: Map<string, string>;
}

export function AssignmentEventTimeline({
  isOpen,
  onClose,
  assignment,
  driversMap,
  vehiclesMap,
}: AssignmentEventTimelineProps) {
  if (!assignment) return null;

  const events = assignment.events || [];

  const getEventIcon = (type: AssignmentEvent['event_type']) => {
    switch (type) {
      case 'created':
        return <PlusCircle className="w-4 h-4 text-blue-600" />;
      case 'confirmed':
        return <UserCheck className="w-4 h-4 text-emerald-600" />;
      case 'started':
        return <Play className="w-4 h-4 text-indigo-600" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'reassigned':
        return <RefreshCw className="w-4 h-4 text-amber-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-rose-600" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Duty Audit History"
      description={`Assignment ID: ${assignment.id.slice(0, 8)}... — ${assignment.duty_date}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {events.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">
            No audit records recorded yet.
          </p>
        ) : (
          <div className="relative border-l-2 border-slate-200 ml-3 space-y-6 py-2">
            {events.map((event) => (
              <div key={event.id} className="relative pl-6">
                <span className="absolute -left-[9px] top-1 bg-white p-0.5 rounded-full border border-slate-200">
                  {getEventIcon(event.event_type)}
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    {event.event_type}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(event.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {event.reason && (
                  <p className="text-xs text-slate-600 mt-1 font-medium">
                    {event.reason}
                  </p>
                )}
                {event.event_type === 'reassigned' && (
                  <div className="text-[11px] text-slate-500 mt-1 bg-amber-50 p-2 rounded border border-amber-200/60 font-mono">
                    {event.previous_driver_id && event.new_driver_id && (
                      <div>
                        Driver changed:{' '}
                        {driversMap?.get(event.previous_driver_id) || event.previous_driver_id.slice(0, 8)}{' '}
                        →{' '}
                        {driversMap?.get(event.new_driver_id) || event.new_driver_id.slice(0, 8)}
                      </div>
                    )}
                    {event.previous_vehicle_id && event.new_vehicle_id && (
                      <div>
                        Vehicle changed:{' '}
                        {vehiclesMap?.get(event.previous_vehicle_id) || event.previous_vehicle_id.slice(0, 8)}{' '}
                        →{' '}
                        {vehiclesMap?.get(event.new_vehicle_id) || event.new_vehicle_id.slice(0, 8)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
