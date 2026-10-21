import { TripLocation } from '@/types/database';

/**
 * Free Reverse Geocoding with OpenStreetMap Nominatim / BigDataCloud
 * with fast timeout and fallback so trip starting / ending is never stalled.
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  // If coordinates are invalid or zero
  if (!latitude && !longitude) {
    return 'Location not available';
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    // Primary: OpenStreetMap Nominatim reverse geocoding (free, no API key needed)
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`,
      {
        signal: controller.signal,
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'NalakathLogisticsFleet/1.0',
        },
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const parts = [
          addr.suburb || addr.neighbourhood || addr.village || addr.industrial || addr.commercial,
          addr.city || addr.town || addr.county || addr.state_district,
          addr.state,
        ].filter(Boolean);

        if (parts.length > 0) {
          return parts.join(', ');
        }
        if (data.display_name) {
          return data.display_name.split(',').slice(0, 3).join(', ');
        }
      }
    }
  } catch (err) {
    // Timeout or network offline - try secondary fallback
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    // Secondary: BigDataCloud free client-side reverse geocode
    const res2 = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (res2.ok) {
      const d2 = await res2.json();
      const parts2 = [d2.locality || d2.city, d2.principalSubdivision].filter(Boolean);
      if (parts2.length > 0) {
        return parts2.join(', ');
      }
    }
  } catch {
    // Offline / unavailable
  }

  // Graceful fallback coordinate string
  return `GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
}

/**
 * Capture phone GPS location via browser Geolocation API.
 * Asks for permission once. If denied or times out, returns null without blocking the trip.
 */
export async function captureCurrentLocation(): Promise<TripLocation | null> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return null;
  }

  return new Promise((resolve) => {
    // Give user up to 6 seconds to respond or acquire GPS lock
    const timeoutTimer = setTimeout(() => {
      resolve(null);
    }, 6000);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        clearTimeout(timeoutTimer);
        const { latitude, longitude } = pos.coords;
        try {
          const address = await reverseGeocode(latitude, longitude);
          const readableName = address || `GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
          resolve({
            latitude,
            longitude,
            address: readableName,
            place_name: readableName,
            accuracy: pos.coords.accuracy || null,
            captured_at: new Date().toISOString(),
          });
        } catch {
          const fallbackName = `GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
          resolve({
            latitude,
            longitude,
            address: fallbackName,
            place_name: fallbackName,
            accuracy: pos.coords.accuracy || null,
            captured_at: new Date().toISOString(),
          });
        }
      },
      (error) => {
        clearTimeout(timeoutTimer);
        console.warn('Geolocation capture skipped or denied:', error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60000,
      }
    );
  });
}
