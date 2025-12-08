
import { useState, useEffect } from 'react';
import { GeolocationState } from '../types';


const useGeolocation = () => {
  const [location, setLocation] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const getLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setLoading(false);
        setError(null);
      },
      (error) => {
        setError(error.message); // removed "Error getting location: " prefix for cleaner UI
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    // Initial fetch
    getLocation();

    // Poll every 5 seconds
    const intervalId = setInterval(getLocation, 5000);

    return () => clearInterval(intervalId);
  }, []);

  return { location, error, loading };
};


export default useGeolocation;
