import { describe, it, expect } from 'vitest';
import {
  calculateTripDistance,
  formatDistance,
} from '@/lib/utils/odometer-calculator';

describe('Odometer & Distance Calculator', () => {
  it('correctly calculates distance when both readings are valid', () => {
    const res = calculateTripDistance(125000, 125048.5);
    expect(res.hasValidPair).toBe(true);
    expect(res.distanceKm).toBe(48.5);
  });

  it('rejects odometer reversal when end odometer is less than start odometer', () => {
    const res = calculateTripDistance(125000, 124900);
    expect(res.hasValidPair).toBe(false);
    expect(res.distanceKm).toBeNull();
    expect(res.errorMessage).toContain('cannot be less than');
  });

  it('distinguishes missing readings from actual zero distance', () => {
    // Missing start odometer
    const resNoStart = calculateTripDistance(null, 125000);
    expect(resNoStart.hasValidPair).toBe(false);
    expect(resNoStart.distanceKm).toBeNull();

    // Missing end odometer
    const resNoEnd = calculateTripDistance(125000, null);
    expect(resNoEnd.hasValidPair).toBe(false);
    expect(resNoEnd.distanceKm).toBeNull();

    // Actual zero distance (e.g., duty was aborted before leaving depot)
    const resZero = calculateTripDistance(125000, 125000);
    expect(resZero.hasValidPair).toBe(true);
    expect(resZero.distanceKm).toBe(0);
  });

  it('properly formats distance and missing values', () => {
    expect(formatDistance(null)).toBe('—');
    expect(formatDistance(undefined)).toBe('—');
    expect(formatDistance(45.5)).toBe('45.5 km');
  });
});
