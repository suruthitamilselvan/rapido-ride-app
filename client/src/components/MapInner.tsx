'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom HTML Icons with Pastel Styling
function createCustomMarker(emoji: string, label: string, color: string, textColor: string = '#ffffff') {
  return L.divIcon({
    className: 'custom-map-icon',
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        filter: drop-shadow(0 4px 8px rgba(45,40,62,0.18));
      ">
        <div style="
          background: ${color};
          color: ${textColor};
          font-weight: 700;
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 9999px;
          white-space: nowrap;
          border: 1.5px solid #ffffff;
          margin-bottom: 2px;
        ">${label}</div>
        <div style="
          width: 36px;
          height: 36px;
          background: #ffffff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 19px;
          border: 3px solid ${color};
        ">${emoji}</div>
      </div>
    `,
    iconSize: [40, 54],
    iconAnchor: [20, 54],
  });
}

function createVehicleMarker(vehicleType: string, label: string = 'Captain Live') {
  let emoji = '🛵';
  let color = '#957DAD';
  if (vehicleType === 'AUTO') {
    emoji = '🛺';
    color = '#957DAD';
  } else if (vehicleType === 'CAB_ECONOMY' || vehicleType === 'CAB_COMFORT') {
    emoji = '🚗';
    color = '#957DAD';
  }

  return L.divIcon({
    className: 'custom-vehicle-icon',
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        filter: drop-shadow(0 4px 10px rgba(45,40,62,0.2));
      ">
        <div style="
          background: #FDFDFD;
          color: #2D283E;
          font-weight: 700;
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 9999px;
          border: 1.5px solid #957DAD;
          white-space: nowrap;
          margin-bottom: 2px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        ">${label}</div>
        <div style="
          width: 44px;
          height: 44px;
          background: ${color};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          border: 3px solid #ffffff;
          animation: pulse-ring 2s infinite;
        ">${emoji}</div>
      </div>
    `,
    iconSize: [48, 58],
    iconAnchor: [24, 29],
  });
}

interface MapProps {
  pickup: { lat: number; lng: number; address?: string };
  dropoff?: { lat: number; lng: number; address?: string } | null;
  captainLocation?: { lat: number; lng: number; vehicleType?: string } | null;
  nearbyCaptains?: Array<{ id: string; lat: number; lng: number; vehicleType: string }>;
  telemetry?: {
    distanceRemainingKm: number;
    durationRemainingMin: number;
    progressPercent: number;
    currentSpeed: number;
  } | null;
  interactive?: boolean;
}

// Controller to smoothly update map bounds on route changes (stable during vehicle animation)
function MapController({
  pickup,
  dropoff,
}: {
  pickup: { lat: number; lng: number };
  dropoff?: { lat: number; lng: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [[pickup.lat, pickup.lng]];
    if (dropoff) points.push([dropoff.lat, dropoff.lng]);

    if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    } else {
      map.setView([pickup.lat, pickup.lng], 14);
    }
  }, [map, pickup.lat, pickup.lng, dropoff?.lat, dropoff?.lng]);

  return null;
}

function ReactiveVehicleMarker({
  position,
  vehicleType,
  label = 'Captain Live',
}: {
  position: { lat: number; lng: number };
  vehicleType: string;
  label?: string;
}) {
  const markerRef = useRef<L.Marker | null>(null);
  const icon = useMemo(() => createVehicleMarker(vehicleType, label), [vehicleType, label]);

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLatLng([position.lat, position.lng]);
    }
  }, [position.lat, position.lng]);

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setIcon(icon);
    }
  }, [icon]);

  return (
    <Marker
      ref={markerRef}
      key="live-captain-vehicle-marker"
      zIndexOffset={1000}
      position={[position.lat, position.lng]}
      icon={icon}
    >
      <Popup>
        <div className="text-xs font-bold text-[#2D283E]">{label}</div>
        <div className="text-[11px] text-[#6E6680]">
          Lat: {position.lat.toFixed(4)}, Lng: {position.lng.toFixed(4)}
        </div>
      </Popup>
    </Marker>
  );
}

export default function MapInner({
  pickup,
  dropoff,
  captainLocation,
  nearbyCaptains = [],
  telemetry,
}: MapProps) {
  const pickupIcon = useMemo(() => createCustomMarker('📍', 'Pickup Point', '#7BA644'), []);
  const dropoffIcon = useMemo(() => createCustomMarker('🏁', 'Drop-off', '#D97706'), []);

  // Compute curved realistic road route between pickup and dropoff
  const routeCoordinates = useMemo(() => {
    if (!dropoff) return [];

    const lat1 = pickup.lat;
    const lng1 = pickup.lng;
    const lat2 = dropoff.lat;
    const lng2 = dropoff.lng;

    // Generate interpolated road points with realistic detour
    const points: [number, number][] = [];
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Linear interpolation with a slight arc for road realism
      const lat = lat1 + (lat2 - lat1) * t + Math.sin(t * Math.PI) * 0.003;
      const lng = lng1 + (lng2 - lng1) * t + Math.sin(t * Math.PI) * 0.002;
      points.push([lat, lng]);
    }
    return points;
  }, [pickup.lat, pickup.lng, dropoff?.lat, dropoff?.lng]);

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-3xl overflow-hidden shadow-xs border border-[#EFEFEF]">
      {/* Floating Pastel Live Trip ETA & Telemetry Badge */}
      {telemetry && telemetry.distanceRemainingKm > 0 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-[#FDFDFD]/95 text-[#2D283E] backdrop-blur-md px-4 py-2 rounded-2xl shadow-md border border-[#E0E0E0] flex items-center space-x-3 pointer-events-none">
          <span className="w-2.5 h-2.5 rounded-full bg-[#957DAD] animate-ping" />
          <div className="flex items-center space-x-2 text-xs font-bold">
            <span className="text-[#957DAD] font-black text-sm">{telemetry.distanceRemainingKm} km left</span>
            <span className="text-[#C0C0C0]">•</span>
            <span className="text-[#2D283E] font-bold">{telemetry.durationRemainingMin} mins</span>
            <span className="text-[#C0C0C0]">•</span>
            <span className="text-[#415720] font-mono text-[11px] font-bold">{telemetry.currentSpeed} km/h</span>
          </div>
        </div>
      )}

      <MapContainer
        center={[pickup.lat, pickup.lng]}
        zoom={14}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%', minHeight: '420px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController pickup={pickup} dropoff={dropoff} />

        {/* Pickup Pin */}
        <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
          <Popup>
            <div className="font-semibold text-xs text-[#2D283E]">Pickup Location</div>
            <div className="text-[11px] text-[#6E6680]">{pickup.address || 'Selected Pickup'}</div>
          </Popup>
        </Marker>

        {/* Dropoff Pin - shown while heading to destination */}
        {dropoff && (!captainLocation || Math.hypot(captainLocation.lat - dropoff.lat, captainLocation.lng - dropoff.lng) >= 0.0006) && (
          <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon}>
            <Popup>
              <div className="font-semibold text-xs text-[#2D283E]">Destination</div>
              <div className="text-[11px] text-[#6E6680]">{dropoff.address || 'Selected Dropoff'}</div>
            </Popup>
          </Marker>
        )}

        {/* Route Polyline */}
        {routeCoordinates.length > 0 && (
          <>
            {/* Soft ambient aura */}
            <Polyline
              positions={routeCoordinates}
              pathOptions={{ color: '#957DAD', weight: 8, opacity: 0.18 }}
            />
            {/* Main pastel purple route path */}
            <Polyline
              positions={routeCoordinates}
              pathOptions={{ color: '#957DAD', weight: 4.5, opacity: 0.95 }}
            />
          </>
        )}

        {/* Live Assigned Captain Pin with smooth reactive movement */}
        {captainLocation && (() => {
          let label = 'Captain Live';
          const distToPickup = Math.hypot(captainLocation.lat - pickup.lat, captainLocation.lng - pickup.lng);
          const distToDropoff = dropoff ? Math.hypot(captainLocation.lat - dropoff.lat, captainLocation.lng - dropoff.lng) : 999;

          // Check destination arrival first!
          if (dropoff && distToDropoff < 0.0006) {
            label = 'Arrived at Destination 🏁';
          } else if (distToPickup < 0.0006) {
            label = 'Captain at Pickup 🎯';
          } else {
            label = 'Captain Driving ⚡';
          }

          return (
            <ReactiveVehicleMarker
              position={captainLocation}
              vehicleType={captainLocation.vehicleType || 'BIKE'}
              label={label}
            />
          );
        })()}

        {/* Other Nearby Online Captains */}
        {!captainLocation &&
          nearbyCaptains.map((cap) => (
            <Marker
              key={cap.id}
              position={[cap.lat, cap.lng]}
              icon={createVehicleMarker(cap.vehicleType, 'Available')}
            >
              <Popup>
                <div className="text-xs font-medium">Available Captain ({cap.vehicleType})</div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}
