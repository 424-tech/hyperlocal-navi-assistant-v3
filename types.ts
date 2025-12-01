
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

export type Language = 'en' | 'or';
