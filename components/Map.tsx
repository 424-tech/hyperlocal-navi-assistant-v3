
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, Circle } from 'react-leaflet';
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
    className: 'pulsing-user-marker',
    html: `
      <div class="relative w-8 h-8 flex items-center justify-center">
        <div class="absolute w-full h-full bg-blue-500 rounded-full opacity-30 animate-ping"></div>
        <div class="relative w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-lg"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16] // Center of the 32x32 container
});

const destinationIcon = L.divIcon({
    className: 'destination-marker',
    html: `<div style="position: relative; width: 40px; height: 40px;">
             <div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 12px; height: 4px; background: rgba(0,0,0,0.3); border-radius: 50%; filter: blur(2px);"></div>
             <svg width="40" height="40" viewBox="0 0 24 24" fill="#ef4444" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3)); position: relative; z-index: 10;">
               <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
               <circle cx="12" cy="9" r="3.5" fill="white"/>
             </svg>
           </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
});

const landmarkIconDiv = L.divIcon({
    className: 'bg-transparent',
    html: '<div style="color: #facc15; filter: drop-shadow(0 0 2px rgba(0,0,0,0.5));"><svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>',
    iconSize: [28, 28],
    iconAnchor: [14, 28]
});

interface MapProps {
    userLocation: [number, number];
    userLocationAccuracy?: number | null;
    steps?: RouteStep[];
    landmarks?: Landmark[];
    traffic?: TrafficSegment[];
    currentStepIndex?: number;
    itineraryLocations?: ItineraryLocation[];
    itineraryLines?: ItineraryRoute[];
    highlightedItineraryIndex?: number | null;
    destinationLocation?: [number, number] | null;
    destinationName?: string;
}

// Helper: Strict Coordinate Validator
const isValidCoord = (lat: any, lng: any): boolean => {
    const nLat = Number(lat);
    const nLng = Number(lng);
    return !isNaN(nLat) && !isNaN(nLng) && nLat !== 0 && nLng !== 0;
};

// Component to handle map bounds updates (auto-center on load)
const MapController = ({
    userLocation,
    firstLoad,
    flyToTarget
}: {
    userLocation: [number, number],
    firstLoad: boolean,
    flyToTarget?: [number, number] | null
}) => {
    const map = useMap();

    // Fix map rendering issues in dynamic layouts
    useEffect(() => {
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 100);
        return () => clearTimeout(timer);
    }, [map]);

    useEffect(() => {
        if (firstLoad && isValidCoord(userLocation[0], userLocation[1])) {
            map.flyTo(userLocation, 16, { animate: true, duration: 2 });
        }
    }, [firstLoad, userLocation, map]);

    // Handle specific fly-to requests
    useEffect(() => {
        if (flyToTarget && isValidCoord(flyToTarget[0], flyToTarget[1])) {
            map.flyTo(flyToTarget, 18, { animate: true, duration: 1.5 });
        }
    }, [flyToTarget, map]);

    return null;
};

const MyLocationButton = ({ onClick }: { onClick: () => void }) => {
    return (
        <button
            onClick={onClick}
            className="absolute bottom-6 right-6 z-[1000] bg-white p-3 rounded-full shadow-lg text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="My Location"
            aria-label="Center map on my location"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        </button>
    );
};

export const Map: React.FC<MapProps> = ({
    userLocation,
    userLocationAccuracy,
    steps = [],
    landmarks = [],
    traffic = [],
    currentStepIndex = 0,
    itineraryLocations = [],
    itineraryLines = [],
    highlightedItineraryIndex = null,
    destinationLocation = null,
    destinationName = ''
}) => {
    const [mapInstance, setMapInstance] = React.useState<L.Map | null>(null);
    const [firstLoad, setFirstLoad] = React.useState(true);

    // Calculate dynamic fly-to target based on interactions
    const flyToTarget = React.useMemo(() => {
        if (highlightedItineraryIndex !== null && itineraryLocations[highlightedItineraryIndex]) {
            const loc = itineraryLocations[highlightedItineraryIndex];
            if (isValidCoord(loc.lat, loc.lng)) {
                return [loc.lat, loc.lng] as [number, number];
            }
        }
        return null;
    }, [highlightedItineraryIndex, itineraryLocations]);

    // When user location becomes valid for the first time, mark loaded
    useEffect(() => {
        if (firstLoad && isValidCoord(userLocation[0], userLocation[1])) {
            // Just let the controller handle the flyTo
            const timer = setTimeout(() => setFirstLoad(false), 3000); // Stop "first load" behavior after 3s
            return () => clearTimeout(timer);
        }
    }, [userLocation, firstLoad]);

    // Safe extraction of current step path
    const activePolyline = steps[currentStepIndex]?.path
        ?.filter(p => isValidCoord(p.lat, p.lng))
        .map(p => [p.lat, p.lng] as [number, number]) || [];

    const handleMyLocationClick = () => {
        if (mapInstance && isValidCoord(userLocation[0], userLocation[1])) {
            mapInstance.flyTo(userLocation, 18, { animate: true });
        }
    };

    return (
        <div className="h-[400px] w-full rounded-lg overflow-hidden border border-gray-700 shadow-lg relative z-0">
            <MapContainer
                center={isValidCoord(userLocation[0], userLocation[1]) ? userLocation : [20.4795, 85.8778]}
                zoom={16}
                style={{ height: '100%', width: '100%' }}
                className="z-0"
                ref={setMapInstance}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                <MapController userLocation={userLocation} firstLoad={firstLoad} flyToTarget={flyToTarget} />

                {/* Heads-Up Navigation Overlay */}
                {destinationName && (
                    <div className="absolute top-4 right-4 z-[1000] heading-badge bg-white/95 backdrop-blur-sm border border-blue-100 pr-4 pl-3 py-2 rounded-full shadow-lg flex items-center gap-3 max-w-[80vw]">
                        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white ring-2 ring-white shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider leading-none mb-0.5">Heading To</span>
                            <span className="font-bold text-slate-800 text-sm truncate max-w-[150px] leading-tight">{destinationName}</span>
                        </div>
                    </div>
                )}

                {/* User Location & Accuracy */}
                {isValidCoord(userLocation[0], userLocation[1]) && (
                    <>
                        <Marker position={userLocation} icon={userIcon}>
                            <Popup>You are here</Popup>
                        </Marker>
                        {userLocationAccuracy && (
                            <Circle
                                center={userLocation}
                                radius={userLocationAccuracy}
                                pathOptions={{
                                    color: '#3b82f6',
                                    fillColor: '#3b82f6',
                                    fillOpacity: 0.1,
                                    weight: 1,
                                    opacity: 0.3
                                }}
                            />
                        )}
                    </>
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

                {/* Destination Marker */}
                {destinationLocation && isValidCoord(destinationLocation[0], destinationLocation[1]) && (
                    <Marker position={destinationLocation} icon={destinationIcon} zIndexOffset={1000}>
                        <Popup className="font-bold">{destinationName || 'Destination'}</Popup>
                    </Marker>
                )}

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
                                <strong>{line.name}</strong><br />
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
                                <strong>{loc.sequence}. {loc.name}</strong><br />
                                {loc.time} - {loc.description}
                            </Popup>
                        </Marker>
                    );
                })}

            </MapContainer>

            {/* My Location Button (outside container for better z-index control if needed, but absolute inside works too) */}
            <MyLocationButton onClick={handleMyLocationClick} />
        </div>
    );
};