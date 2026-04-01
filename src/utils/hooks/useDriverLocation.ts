/**
 * useDriverLocation Hook
 * Manages real-time geolocation for drivers
 */

import { useState, useEffect, useCallback } from 'react';
import { database } from '../database';
import { toast } from 'sonner@2.0.3';

interface LocationData {
  lat: number;
  lng: number;
  city: string;
  state: string;
  lastUpdated: string;
}

interface UseDriverLocationOptions {
  driverId: string;
  enabled?: boolean;
  updateInterval?: number; // milliseconds, default 30000 (30 seconds)
}

export function useDriverLocation({ 
  driverId, 
  enabled = true,
  updateInterval = 30000 
}: UseDriverLocationOptions) {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Get city and state from coordinates using reverse geocoding
  const getCityFromCoordinates = useCallback(async (lat: number, lng: number): Promise<{ city: string; state: string }> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch location details');
      }
      
      const data = await response.json();
      const address = data.address || {};
      
      return {
        city: address.city || address.town || address.village || address.municipality || 'Cidade não identificada',
        state: address.state || 'Estado não identificado',
      };
    } catch (error) {
      console.error('Error getting city from coordinates:', error);
      return {
        city: 'Cidade não identificada',
        state: 'Estado não identificado',
      };
    }
  }, []);

  // Update location in database
  const updateLocationInDatabase = useCallback(async (locationData: LocationData) => {
    try {
      const result = await database.drivers.updateLocation(driverId, locationData);
      
      if (!result.success) {
        console.error('Failed to update location in database:', result.error);
        setError(result.error || 'Erro ao atualizar localização');
      }
    } catch (error) {
      console.error('Error updating location:', error);
      setError('Erro ao atualizar localização');
    }
  }, [driverId]);

  // Get current position
  const getCurrentPosition = useCallback(async () => {
    if (!enabled || !navigator.geolocation) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      });

      const { latitude, longitude } = position.coords;
      
      // Get city and state from coordinates
      const { city, state } = await getCityFromCoordinates(latitude, longitude);

      const locationData: LocationData = {
        lat: latitude,
        lng: longitude,
        city,
        state,
        lastUpdated: new Date().toISOString(),
      };

      setLocation(locationData);
      await updateLocationInDatabase(locationData);
      setLoading(false);
      
    } catch (error: any) {
      setLoading(false);
      
      if (error.code === 1) { // PERMISSION_DENIED
        setPermissionDenied(true);
        setError('Permissão de localização negada');
        toast.error('Permissão de localização negada', {
          description: 'Habilite a localização nas configurações do navegador',
        });
      } else if (error.code === 2) { // POSITION_UNAVAILABLE
        setError('Localização indisponível');
        console.error('Position unavailable:', error);
      } else if (error.code === 3) { // TIMEOUT
        setError('Tempo esgotado ao obter localização');
        console.error('Geolocation timeout:', error);
      } else {
        setError('Erro ao obter localização');
        console.error('Geolocation error:', error);
      }
    }
  }, [enabled, getCityFromCoordinates, updateLocationInDatabase]);

  // Watch position continuously
  useEffect(() => {
    if (!enabled || !navigator.geolocation || permissionDenied) {
      return;
    }

    // Get initial position
    getCurrentPosition();

    // Set up interval to update position
    const intervalId = setInterval(() => {
      getCurrentPosition();
    }, updateInterval);

    // Cleanup
    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, updateInterval, getCurrentPosition, permissionDenied]);

  // Manual refresh function
  const refresh = useCallback(() => {
    getCurrentPosition();
  }, [getCurrentPosition]);

  // Request permission explicitly
  const requestPermission = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada', {
        description: 'Seu navegador não suporta geolocalização',
      });
      return false;
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      
      if (result.state === 'granted') {
        setPermissionDenied(false);
        getCurrentPosition();
        return true;
      } else if (result.state === 'prompt') {
        // Will prompt user when we call getCurrentPosition
        setPermissionDenied(false);
        getCurrentPosition();
        return true;
      } else {
        setPermissionDenied(true);
        toast.error('Permissão de localização negada', {
          description: 'Por favor, habilite a localização nas configurações do navegador',
        });
        return false;
      }
    } catch (error) {
      console.error('Error checking permission:', error);
      // If permissions API not supported, just try to get position
      setPermissionDenied(false);
      getCurrentPosition();
      return true;
    }
  }, [getCurrentPosition]);

  return {
    location,
    loading,
    error,
    permissionDenied,
    refresh,
    requestPermission,
  };
}
