import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { RouteStep, Landmark, TrafficSegment, ItineraryLocation, ItineraryRoute } from '../types';

// Fix Leaflet's default icon path issues by pointing to the CDN safely
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

// Custom Icons
const createNumberedIcon = (number: number, isHighlighted: boolean) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${isHighlighted ? '#22d3ee' : '#374151'}; color: ${isHighlighted ? '#000' : '#fff'}; width: 24px; height: 24px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${number}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

const userIcon = L.divIcon({
    className: 'bg-transparent',
    html: '<div style="color: #22d3ee; filter: drop-shadow(0 0 4px rgba(0,0,0,0.5));"><svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>',
    iconSize: [32, 32],
    iconAnchor: [16, 32]
});

const landmarkIconDiv = L.divIcon({
    className: 'bg-transparent',
    html: '<div style="color: #facc15; filter: drop-shadow(0 0 2px rgba(0,0,0,0.5));"><svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>',
    iconSize: [28, 28],
    iconAnchor: [14, 28]
});

interface MapProps {
  userLocation: [number, number];
  steps?: RouteStep[];
  landmarks?: Landmark[];
  traffic?: TrafficSegment[];
  currentStepIndex?: number;
  itineraryLocations?: ItineraryLocation[];
  itineraryLines?: ItineraryRoute[];
  highlightedItineraryIndex?: number | null;
}

// Helper: Strict Coordinate Validator
const isValidCoord = (lat: any, lng: any): boolean => {
    const nLat = Number(lat);
    const nLng = Number(lng);
    return !isNaN(nLat) && !isNaN(nLng) && nLat !== 0 && nLng !== 0;
};

// Component to handle map bounds updates
const MapController = ({ 
    userLocation, 
    steps, 
    itineraryLocations, 
    highlightedItineraryIndex 
}: { 
    userLocation: [number, number], 
    steps?: RouteStep[], 
    itineraryLocations?: ItineraryLocation[], 
    highlightedItineraryIndex?: number | null 
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    try {
        const validUserLoc = isValidCoord(userLocation[0], userLocation[1]);
        if (!validUserLoc) return;

        const bounds = L.latLngBounds([userLocation]);

        // Add steps to bounds
        if (steps && steps.length > 0) {
            steps.forEach(step => {
                if (step.path) {
                    step.path.forEach(p => {
                        if (isValidCoord(p.lat, p.lng)) {
                            bounds.extend([p.lat, p.lng]);
                        }
                    });
                }
            });
        }

        // Add itinerary to bounds
        if (itineraryLocations && itineraryLocations.length > 0) {
            itineraryLocations.forEach(loc => {
                if (isValidCoord(loc.lat, loc.lng)) {
                    bounds.extend([loc.lat, loc.lng]);
                }
            });
        }

        if (bounds.isValid()) {
             // If a specific itinerary item is highlighted, pan to it
            if (highlightedItineraryIndex !== null && highlightedItineraryIndex !== undefined && itineraryLocations && itineraryLocations[highlightedItineraryIndex]) {
                 const loc = itineraryLocations[highlightedItineraryIndex];
                 if (isValidCoord(loc.lat, loc.lng)) {
                     map.flyTo([loc.lat, loc.lng], 17, { animate: true });
                 }
            } else {
                // Otherwise fit all
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        } else {
             map.setView(userLocation, 16);
        }

    } catch (e) {
        console.warn("Map bounds error:", e);
        if (isValidCoord(userLocation[0], userLocation[1])) {
             map.setView(userLocation, 16);
        }
    }
  }, [map, userLocation, steps, itineraryLocations, highlightedItineraryIndex]);

  return null;
};

export const Map: React.FC<MapProps> = ({ 
  userLocation, 
  steps = [], 
  landmarks = [], 
  traffic = [], 
  currentStepIndex = 0,
  itineraryLocations = [],
  itineraryLines = [],
  highlightedItineraryIndex = null
}) => {
  
  // Safe extraction of current step path
  const activePolyline = steps[currentStepIndex]?.path
    ?.filter(p => isValidCoord(p.lat, p.lng))
    .map(p => [p.lat, p.lng] as [number, number]) || [];

  return (
    <div className="h-[400px] w-full rounded-lg overflow-hidden border border-gray-700 shadow-lg relative z-0">
      <MapContainer 
        center={isValidCoord(userLocation[0], userLocation[1]) ? userLocation : [20.4795, 85.8778]} 
        zoom={16} 
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController 
            userLocation={userLocation} 
            steps={steps} 
            itineraryLocations={itineraryLocations}
            highlightedItineraryIndex={highlightedItineraryIndex}
        />

        {/* User Location */}
        {isValidCoord(userLocation[0], userLocation[1]) && (
            <Marker position={userLocation} icon={userIcon}>
                <Popup>You are here</Popup>
            </Marker>
        )}

        {/* --- ROUTE MODE LAYERS --- */}
        
        {/* Full Route Background (Gray) */}
        {steps.map((step, idx) => {
           const validPath = step.path?.filter(p => isValidCoord(p.lat, p.lng)).map(p => [p.lat, p.lng] as [number, number]) || [];
           if (validPath.length < 2) return null;
           
           return (
            <Polyline 
                key={`bg-${idx}`}
                positions={validPath}
                pathOptions={{ color: '#6b7280', weight: 4, opacity: 0.5 }}
            />
           );
        })}

        {/* Traffic Segments (Overlay) */}
        {traffic.map((seg, idx) => {
            const validPath = seg.path?.filter(p => isValidCoord(p.lat, p.lng)).map(p => [p.lat, p.lng] as [number, number]) || [];
            if (validPath.length < 2) return null;

            const color = seg.level === 'heavy' ? '#ef4444' : seg.level === 'moderate' ? '#eab308' : '#22c55e';
            return (
                <Polyline 
                    key={`traffic-${idx}`}
                    positions={validPath}
                    pathOptions={{ color: color, weight: 6, opacity: 0.7 }}
                >
                    <Popup>{seg.description} ({seg.level} traffic)</Popup>
                </Polyline>
            );
        })}

        {/* Active Step (Cyan) */}
        {activePolyline.length > 1 && (
            <Polyline 
                positions={activePolyline}
                pathOptions={{ color: '#06b6d4', weight: 6, opacity: 0.9 }}
            />
        )}

        {/* Landmarks */}
        {landmarks.map((lm, idx) => {
             if (!isValidCoord(lm.position?.lat, lm.position?.lng)) return null;
             return (
                <Marker key={`lm-${idx}`} position={[lm.position.lat, lm.position.lng]} icon={landmarkIconDiv}>
                    <Popup>{lm.name}</Popup>
                </Marker>
             );
        })}

        {/* --- DAY PLANNER MODE LAYERS --- */}

        {/* Itinerary Lines */}
        {itineraryLines.map((line, idx) => {
             if (!isValidCoord(line.start?.lat, line.start?.lng) || !isValidCoord(line.end?.lat, line.end?.lng)) return null;
             return (
                 <Polyline 
                    key={`line-${idx}`}
                    positions={[
                        [line.start.lat, line.start.lng],
                        [line.end.lat, line.end.lng]
                    ]}
                    pathOptions={{ color: '#3b82f6', weight: 3, dashArray: '10, 10', opacity: 0.8 }}
                 >
                     <Popup>
                         <strong>{line.name}</strong><br/>
                         {line.transport} ({line.travelTime})
                     </Popup>
                 </Polyline>
             );
        })}

        {/* Itinerary Markers */}
        {itineraryLocations.map((loc, idx) => {
            if (!isValidCoord(loc.lat, loc.lng)) return null;
            const isHighlighted = highlightedItineraryIndex === idx;
            
            return (
                <Marker 
                    key={`loc-${idx}`}
                    position={[loc.lat, loc.lng]}
                    icon={createNumberedIcon(loc.sequence || idx + 1, isHighlighted)}
                    zIndexOffset={isHighlighted ? 1000 : 0}
                >
                    <Popup>
                        <strong>{loc.sequence}. {loc.name}</strong><br/>
                        {loc.time} - {loc.description}
                    </Popup>
                </Marker>
            );
        })}

      </MapContainer>
    </div>
  );
};