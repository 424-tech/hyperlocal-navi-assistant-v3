

export interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
  maps?: {
    uri?: string;
    title?: string;
  };
}

export interface RouteCoordinate {
  lat: number;
  lng: number;
}

export interface RouteStep {
  description: string;
  path: RouteCoordinate[];
}

export interface Landmark {
  name: string;
  position: RouteCoordinate;
}

export type TrafficLevel = 'light' | 'moderate' | 'heavy';

export interface TrafficSegment {
  path: RouteCoordinate[];
  level: TrafficLevel;
  description: string;
}

// --- New Types for Day Planner ---

export interface ItineraryLocation {
  name: string;
  description: string;
  lat: number;
  lng: number;
  time?: string;
  duration?: string;
  sequence?: number;
}

export interface ItineraryRoute {
  name: string;
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
  transport?: string;
  travelTime?: string;
}

// --- New Types for Traffic Reporting ---

export type TrafficSeverity = 'light' | 'moderate' | 'heavy' | 'accident' | 'closure';

export interface UserTrafficReport {
  id: string;
  timestamp: number;
  severity: TrafficSeverity;
  location: string;
  description: string;
  originalText?: string;
  reporterName?: string; // New: User Alias (e.g., "Neon Scout")
  verificationCount?: number; // New: Social proof counter
}




export type Language = 'en' | 'or';
