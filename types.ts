
export interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
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

export interface Landmark {
  name: string;
  position: RouteCoordinate;
  floor?: number;
  internalLandmark?: string;
}

export interface ItineraryLocation {
  name: string;
  description: string;
  lat: number;
  lng: number;
  time?: string;
  duration?: string;
  sequence?: number;
  floor?: number;
  internalLandmark?: string;
}

export interface ItineraryRoute {
  name: string;
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
  transport?: string;
  travelTime?: string;
}

export type TrafficSeverity = 'light' | 'moderate' | 'heavy' | 'accident' | 'closure';

export interface UserTrafficReport {
  id: string;
  timestamp: number;
  severity: TrafficSeverity;
  location: string;
  description: string;
  originalText?: string;
  reporterName?: string;
  verificationCount?: number;
}

export type Language = 'en' | 'or';