import { useState } from 'react';

export const useGeolocation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wraps the native browser Geolocation API in a Promise.
  // It handles permissions, timeouts, and state management (loading, error) for the component.
  const getPosition = (): Promise<{ lat: number; long: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      setLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLoading(false);
          resolve({
            lat: position.coords.latitude,
            long: position.coords.longitude,
          });
        },
        (err) => {
          setLoading(false);
          setError(err.message);
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  return { getPosition, loading, error };
};