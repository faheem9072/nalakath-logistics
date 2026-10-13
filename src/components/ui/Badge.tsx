import React from 'react';
import { clsx } from 'clsx';
import {
  AssignmentStatus,
  VehicleStatus,
  DriverStatus,
  TripStatus,
  UserRole,
} from '@/types/database';

export interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | 'default'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'neutral'
    | 'purple';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className,
}: BadgeProps) {
  const variants = {
    default: 'bg-slate-100 text-slate-800 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    neutral: 'bg-slate-50 text-slate-600 border-slate-200',
    purple: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  };

  const dotColors = {
    default: 'bg-slate-400',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-sky-500',
    neutral: 'bg-slate-400',
    purple: 'bg-indigo-500',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs font-medium px-2.5 py-1',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border tracking-wide uppercase font-semibold',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  );
}

export function StatusBadge({
  status,
  size = 'md',
}: {
  status: AssignmentStatus | VehicleStatus | DriverStatus | TripStatus | UserRole;
  size?: 'sm' | 'md';
}) {
  switch (status) {
    case 'scheduled':
      return (
        <Badge variant="warning" dot size={size}>
          Scheduled
        </Badge>
      );
    case 'confirmed':
      return (
        <Badge variant="info" dot size={size}>
          Confirmed
        </Badge>
      );
    case 'in_progress':
      return (
        <Badge variant="purple" dot size={size}>
          In Progress
        </Badge>
      );
    case 'completed':
      return (
        <Badge variant="success" dot size={size}>
          Completed
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge variant="danger" dot size={size}>
          Cancelled
        </Badge>
      );
    case 'reassigned':
      return (
        <Badge variant="neutral" dot size={size}>
          Reassigned
        </Badge>
      );
    case 'active':
      return (
        <Badge variant="success" dot size={size}>
          Active
        </Badge>
      );
    case 'maintenance':
      return (
        <Badge variant="danger" dot size={size}>
          Maintenance
        </Badge>
      );
    case 'inactive':
      return (
        <Badge variant="neutral" dot size={size}>
          Inactive
        </Badge>
      );
    case 'on_leave':
      return (
        <Badge variant="warning" dot size={size}>
          On Leave
        </Badge>
      );
    case 'owner':
      return (
        <Badge variant="purple" size={size}>
          Owner
        </Badge>
      );
    case 'dispatcher':
      return (
        <Badge variant="info" size={size}>
          Dispatcher
        </Badge>
      );
    case 'driver':
      return (
        <Badge variant="neutral" size={size}>
          Driver
        </Badge>
      );
    default:
      return (
        <Badge variant="default" size={size}>
          {String(status)}
        </Badge>
      );
  }
}
