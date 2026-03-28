import { useState, useEffect, useCallback, useRef } from 'react';
import { GPSState } from '../types';

const DEFAULT_STATE: GPSState = {
  lat: null,
  lng: null,
  accuracy: null,
  speed: null,
  heading: null,
  timestamp: null,
  error: null,
  tracking: false,
  following: false,
};

export function useGPS() {
  const [state, setState] = useState<GPSState>(DEFAULT_STATE);
  const watchIdRef = useRef<number | null>(null);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setState(s => ({ ...s, error: 'Geolocation is not supported by your browser.' }));
      return;
    }

    setState(s => ({ ...s, tracking: true, following: true, error: null }));

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setState(s => ({
          ...s,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          timestamp: pos.timestamp,
          error: null,
          tracking: true,
        }));
      },
      (err) => {
        let message = 'Unable to get location.';
        if (err.code === err.PERMISSION_DENIED) {
          message = 'Location access denied. Please enable in browser settings.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          message = 'Location unavailable.';
        } else if (err.code === err.TIMEOUT) {
          message = 'Location request timed out.';
        }
        setState(s => ({ ...s, error: message, tracking: false }));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 15000,
      }
    );
  }, []);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState(s => ({ ...s, tracking: false, following: false }));
  }, []);

  const setFollowing = useCallback((value: boolean) => {
    setState(s => ({ ...s, following: value }));
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return { gps: state, startTracking, stopTracking, setFollowing };
}
