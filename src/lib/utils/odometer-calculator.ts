/**
 * FleetFlow Odometer & Distance Calculation Utilities
 * Strictly enforces that distance is calculated ONLY from valid odometer pairs
 * and distinguishes missing odometer measurements from zero distance.
 */

export interface DistanceResult {
  hasValidPair: boolean;
  distanceKm: number | null;
  errorMessage?: string;
}

/**
 * Calculates distance from start and end odometer readings.
 * Returns null if either reading is missing.
 */
export function calculateTripDistance(
  startOdometer: number | null | undefined,
  endOdometer: number | null | undefined
): DistanceResult {
  if (startOdometer === null || startOdometer === undefined) {
    return {
      hasValidPair: false,
      distanceKm: null,
      errorMessage: 'Start odometer reading is missing',
    };
  }

  if (endOdometer === null || endOdometer === undefined) {
    return {
      hasValidPair: false,
      distanceKm: null,
      errorMessage: 'End odometer reading is missing',
    };
  }

  const start = Number(startOdometer);
  const end = Number(endOdometer);

  if (isNaN(start) || isNaN(end) || start < 0 || end < 0) {
    return {
      hasValidPair: false,
      distanceKm: null,
      errorMessage: 'Invalid numeric odometer values',
    };
  }

  if (end < start) {
    return {
      hasValidPair: false,
      distanceKm: null,
      errorMessage: `End odometer (${end}) cannot be less than start odometer (${start})`,
    };
  }

  const diff = Number((end - start).toFixed(2));
  return {
    hasValidPair: true,
    distanceKm: diff,
  };
}

/**
 * Formats distance display with unit or a dash if missing
 */
export function formatDistance(distanceKm: number | null | undefined): string {
  if (distanceKm === null || distanceKm === undefined) {
    return '—';
  }
  return `${distanceKm.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} km`;
}

/**
 * Formats odometer reading
 */
export function formatOdometer(odometer: number | null | undefined): string {
  if (odometer === null || odometer === undefined) {
    return '—';
  }
  return `${Number(odometer).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}
