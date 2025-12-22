
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Landmark } from '../types';

try {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
} catch (e) {
  console.warn("Leaflet icon fix warning:", e);
}

// User Location Icon (Blue Dot)
const userIcon = L.divIcon({
    className: 'bg-transparent',
    html: '<div class="user-pulse" style="width: 20px; height: 20px; border: 3px solid white; box-shadow: 0 0 15px rgba(34, 211, 238, 0.9);"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

// The "Star" Waypoint Icon
const starIcon = L.divIcon({
    className: 'bg-transparent',
    html: `
      <div class="star-container">
        <div class="star-core"></div>
        <div class="star-glow"></div>
      </div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
});

// Final Destination Icon
const destinationIcon = L.divIcon({
    className: 'bg-transparent',
    html: '<div class="dest-pin"><svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>',
    iconSize: [40, 40],
    iconAnchor: [20, 40]
});

const isValidCoord = (lat: any, lng: any): boolean => {
    const nLat = Number(lat);
    const nLng = Number(lng);
    return !isNaN(nLat) && !isNaN(nLng) && nLat !== 0 && nLng !== 0 && Math.abs(nLat) <= 90 && Math.abs(nLng) <= 180;
};

const MapController = ({ 
    userLocation, 
    path 
}: { 
    userLocation: [number, number], 
    path: [number, number][]
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const validUser = isValidCoord(userLocation[0], userLocation[1]);
    
    // Smooth transition to bounds
    if (path.length > 0) {
        const bounds = L.latLngBounds(path);
        if (validUser) bounds.extend(userLocation);
        map.fitBounds(bounds, { padding: [80, 80], animate: true, duration: 1 });
    } else if (validUser) {
        map.flyTo(userLocation, 17, { animate: true, duration: 1.5 });
    }
  }, [map, userLocation, path]);

  return null;
};

interface MapProps {
  userLocation: [number, number];
  landmarks?: Landmark[];
  destination?: [number, number] | null; 
}

export const Map: React.FC<MapProps> = ({ 
  userLocation, 
  landmarks = [], 
  destination = null
}) => {
  
  // Calibrate center and user location to the "Blue Dot" area shown in screenshot if actual GPS is missing
  // Area between Anatomy and Blood Bank: 20.4814, 85.8808
  const defaultCenter: [number, number] = [20.4814, 85.8808];
  const effectiveUserLoc: [number, number] = isValidCoord(userLocation[0], userLocation[1]) ? userLocation : defaultCenter;

  // Create path for the "Follow the Stars" trail
  const path: [number, number][] = landmarks
    .filter(lm => isValidCoord(lm.position.lat, lm.position.lng))
    .map(lm => [lm.position.lat, lm.position.lng]);

  if (destination && isValidCoord(destination[0], destination[1])) {
      path.push(destination);
  }

  return (
    <div className="absolute inset-0 h-full w-full bg-slate-200 overflow-hidden">
      <MapContainer 
        center={effectiveUserLoc} 
        zoom={18} 
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController userLocation={effectiveUserLoc} path={path} />

        {/* Shimmering Path Line */}
        {path.length > 0 && (
            <Polyline 
                positions={[effectiveUserLoc, ...path]} 
                pathOptions={{ 
                    color: '#3b82f6', 
                    weight: 4, 
                    opacity: 0.7, 
                    dashArray: '8, 12',
                    lineCap: 'round',
                    interactive: false
                }} 
            />
        )}

        {/* User Marker (Blue Dot) */}
        <Marker position={effectiveUserLoc} icon={userIcon} zIndexOffset={1000} />

        {/* Star Waypoints (The "Stardust" Trail) */}
        {landmarks.map((lm, idx) => {
            if (!isValidCoord(lm.position.lat, lm.position.lng)) return null;
            return (
                <Marker key={`star-${idx}`} position={[lm.position.lat, lm.position.lng]} icon={starIcon}>
                    <Popup>
                        <div className="p-1 font-bold text-blue-700 text-xs">
                            {lm.name} {lm.floor ? `(Floor ${lm.floor})` : ''}
                        </div>
                    </Popup>
                </Marker>
            );
        })}

        {/* Destination Pin (aligned to Main Hub Cluster in screenshot) */}
        {destination && isValidCoord(destination[0], destination[1]) && (
            <Marker position={destination} icon={destinationIcon} zIndexOffset={600} />
        )}

      </MapContainer>

      <style>{`
        .star-container { position: relative; display: flex; align-items: center; justify-content: center; }
        .star-core { width: 8px; height: 8px; background: #fff; border-radius: 50%; box-shadow: 0 0 12px #3b82f6, 0 0 24px #3b82f6; z-index: 2; }
        .star-glow { position: absolute; width: 22px; height: 22px; background: rgba(59, 130, 246, 0.45); border-radius: 50%; animation: pulse-star 1.8s infinite ease-in-out; z-index: 1; }
        .dest-pin { color: #ef4444; filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.2)); animation: float 2.5s infinite ease-in-out; }
        @keyframes pulse-star { 0%, 100% { transform: scale(0.8); opacity: 0.3; } 50% { transform: scale(1.4); opacity: 0.7; } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
      `}</style>
    </div>
  );
};
