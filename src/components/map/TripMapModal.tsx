'use client';

import React, { useEffect, useRef, useState } from 'react';
import { TripLocation } from '@/types/database';
import { X, MapPin, Navigation, Gauge, AlertCircle } from 'lucide-react';

interface TripMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripInfo: {
    tripId: string;
    dutyDate: string;
    driverName: string;
    vehicleRegistration: string;
    startPlace: string;
    endPlace: string;
    startOdometer: number | null;
    endOdometer: number | null;
    distanceKm: number;
    startLocation?: TripLocation | null;
    endLocation?: TripLocation | null;
  } | null;
}

export function TripMapModal({ isOpen, onClose, tripInfo }: TripMapModalProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !tripInfo) return;

    let isMounted = true;

    // Check if start or end location coordinates exist
    const hasStart =
      tripInfo.startLocation &&
      typeof tripInfo.startLocation.latitude === 'number' &&
      typeof tripInfo.startLocation.longitude === 'number' &&
      (tripInfo.startLocation.latitude !== 0 || tripInfo.startLocation.longitude !== 0);

    const hasEnd =
      tripInfo.endLocation &&
      typeof tripInfo.endLocation.latitude === 'number' &&
      typeof tripInfo.endLocation.longitude === 'number' &&
      (tripInfo.endLocation.latitude !== 0 || tripInfo.endLocation.longitude !== 0);

    if (!hasStart && !hasEnd) {
      setMapError('GPS coordinates were not captured for this trip leg (Location not available).');
      return;
    }

    setMapError(null);

    // Dynamically import Leaflet in browser only
    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Clean up previous map instance if any
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Default Kerala / Calicut coordinates fallback
      const defaultCenter: [number, number] = [11.2588, 75.7804];
      const startCoord: [number, number] = hasStart
        ? [tripInfo.startLocation!.latitude, tripInfo.startLocation!.longitude]
        : defaultCenter;

      const endCoord: [number, number] = hasEnd
        ? [tripInfo.endLocation!.latitude, tripInfo.endLocation!.longitude]
        : startCoord;

      const map = L.map(mapContainerRef.current, {
        center: startCoord,
        zoom: 12,
        zoomControl: true,
      });
      mapInstanceRef.current = map;

      // OpenStreetMap Tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Custom Start Marker (Green)
      const startIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `<div style="background-color: #10B981; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 11px; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">START</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      // Custom End Marker (Black/Dark)
      const endIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `<div style="background-color: #121316; color: #D4F65B; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 11px; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">END</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const bounds = L.latLngBounds([startCoord]);

      if (hasStart) {
        L.marker(startCoord, { icon: startIcon })
          .addTo(map)
          .bindPopup(
            `<b>Trip Start Point</b><br/>${tripInfo.startPlace}<br/><small>Odometer: ${tripInfo.startOdometer ?? '—'} km</small>`
          )
          .openPopup();
      }

      if (hasEnd) {
        bounds.extend(endCoord);
        L.marker(endCoord, { icon: endIcon })
          .addTo(map)
          .bindPopup(
            `<b>Trip Destination Point</b><br/>${tripInfo.endPlace}<br/><small>Odometer: ${tripInfo.endOdometer ?? '—'} km</small>`
          );

        // Draw connecting polyline
        L.polyline([startCoord, endCoord], {
          color: '#121316',
          weight: 4,
          opacity: 0.85,
          dashArray: '8, 8',
        }).addTo(map);
      }

      if (hasStart && hasEnd && (startCoord[0] !== endCoord[0] || startCoord[1] !== endCoord[1])) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      } else {
        map.setView(startCoord, 13);
      }

      // Invalidate size to ensure clean render inside modal
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 250);
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, tripInfo]);

  if (!isOpen || !tripInfo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[#121316] text-base">
                Trip Route Map
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#D4F65B] text-black">
                {tripInfo.distanceKm} km
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              {tripInfo.vehicleRegistration} • {tripInfo.driverName} • {tripInfo.dutyDate}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 hover:text-black transition-colors cursor-pointer"
            aria-label="Close map"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Location Summary Pills */}
        <div className="p-3.5 bg-[#F8F9FA] border-b border-gray-100 text-xs space-y-1.5 shrink-0">
          <div className="flex items-start gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-1" />
            <div className="min-w-0">
              <span className="text-gray-400 font-medium">Start: </span>
              <span className="font-semibold text-gray-900">{tripInfo.startPlace}</span>
              {tripInfo.startOdometer !== null && (
                <span className="text-gray-500 font-mono ml-1">({tripInfo.startOdometer} km)</span>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#121316] shrink-0 mt-1" />
            <div className="min-w-0">
              <span className="text-gray-400 font-medium">End: </span>
              <span className="font-semibold text-gray-900">{tripInfo.endPlace}</span>
              {tripInfo.endOdometer !== null && (
                <span className="text-gray-500 font-mono ml-1">({tripInfo.endOdometer} km)</span>
              )}
            </div>
          </div>
        </div>

        {/* Map Container Viewport */}
        <div className="flex-1 min-h-[340px] sm:min-h-[420px] relative bg-gray-100">
          {mapError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-gray-500 space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-500" />
              <p className="text-sm font-bold text-gray-800">{mapError}</p>
              <p className="text-xs text-gray-400 max-w-xs">
                Trip distance was calculated accurately via odometer readings ({tripInfo.distanceKm} km).
              </p>
            </div>
          ) : (
            <div ref={mapContainerRef} className="w-full h-full min-h-[340px] sm:min-h-[420px]" />
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-white border-t border-gray-100 text-center shrink-0">
          <p className="text-[11px] text-gray-400 font-medium">
            OpenStreetMap & Leaflet • Real-time GPS points captured at trip start and end
          </p>
        </div>
      </div>
    </div>
  );
}
