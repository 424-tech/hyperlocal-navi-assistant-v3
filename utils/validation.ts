
import { RouteStep, Landmark, TrafficSegment, ItineraryLocation, ItineraryRoute, RouteCoordinate } from '../types';

// Safe JSON parser
export const safeJsonParse = <T>(jsonString: string, validator: (data: any) => data is T): T | null => {
    try {
        const parsed = JSON.parse(jsonString);
        return validator(parsed) ? parsed : null;
    } catch {
        return null;
    }
};

// --- Type Guards ---

const isNumber = (val: any): val is number => typeof val === 'number' && !isNaN(val);
const isString = (val: any): val is string => typeof val === 'string';
const isArray = (val: any): val is any[] => Array.isArray(val);

export const isRouteCoordinate = (data: any): data is RouteCoordinate => {
    return data && isNumber(data.lat) && isNumber(data.lng);
};

export const isRouteStep = (data: any): data is RouteStep => {
    return (
        data &&
        isString(data.description) &&
        isArray(data.path) &&
        data.path.every(isRouteCoordinate)
    );
};

export const isLandmark = (data: any): data is Landmark => {
    return (
        data &&
        isString(data.name) &&
        isRouteCoordinate(data.position)
    );
};

export const isTrafficSegment = (data: any): data is TrafficSegment => {
    return (
        data &&
        isArray(data.path) &&
        data.path.every(isRouteCoordinate) &&
        isString(data.level) &&
        ['light', 'moderate', 'heavy'].includes(data.level) &&
        isString(data.description)
    );
};

export const isItineraryLocation = (data: any): data is ItineraryLocation => {
    return (
        data &&
        isString(data.name) &&
        isString(data.description) &&
        isNumber(data.lat) &&
        isNumber(data.lng) &&
        (data.time === undefined || isString(data.time)) &&
        (data.duration === undefined || isString(data.duration)) &&
        (data.sequence === undefined || isNumber(data.sequence))
    );
};

export const isItineraryRoute = (data: any): data is ItineraryRoute => {
    return (
        data &&
        isString(data.name) &&
        isRouteCoordinate(data.start) &&
        isRouteCoordinate(data.end) &&
        (data.transport === undefined || isString(data.transport)) &&
        (data.travelTime === undefined || isString(data.travelTime))
    );
};
