import {
  Profile,
  Vehicle,
  Driver,
  Team,
  Route,
  Assignment,
  Trip,
  AssignmentEvent,
  AuditLog,
  Expense,
} from '@/types/database';

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentMonthPrefix(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getMonthDate(day: number): string {
  const prefix = getCurrentMonthPrefix();
  return `${prefix}-${String(day).padStart(2, '0')}`;
}

// All mock and demo data removed permanently. Firebase Firestore is the ONLY database.
export const INITIAL_PROFILES: Profile[] = [];
export const INITIAL_TEAMS: Team[] = [];
export const INITIAL_ROUTES: Route[] = [];
export const INITIAL_VEHICLES: Vehicle[] = [];
export const INITIAL_DRIVERS: Driver[] = [];
export const INITIAL_ASSIGNMENTS: Assignment[] = [];
export const INITIAL_TRIPS: Trip[] = [];
export const INITIAL_EXPENSES: Expense[] = [];
export const INITIAL_EVENTS: AssignmentEvent[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];
