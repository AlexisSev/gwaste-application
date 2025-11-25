// hooks/useCollectorTracking.js
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { GEOFENCE_RADIUS_METERS, GPS_CONFIG } from '../constants/MapConfig';
import { supabase } from '../services/supabaseClient';
import { checkGeofence } from '../utils/geofence';

/**
 * Custom hook for managing collector GPS tracking and location updates
 * Handles permission requests, location tracking, and database updates
 */
export const useCollectorTracking = ({
  collector,
  updateMarkerPosition,
  routeDestRef,
  insideGeofenceRef,
  setCurrentArea,
  setCollectedAreas,
  setNextArea,
  addCollectedMarker,
  computeNextUncollected,
  planRouteToArea,
  findScheduleEntryByLocation,
  todaysSchedule,
  collectedAreas,
  routeType,
}) => {
  const [location, setLocation] = useState(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  /**
   * Request location permission from user
   */
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setHasLocationPermission(true);
        startTracking();
      } else {
        setHasLocationPermission(false);
        setIsLoadingLocation(false);
        console.warn('Location permission denied by user. GPS tracking disabled.');
        showLocationPermissionAlert();
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setIsLoadingLocation(false);
    }
  };

  /**
   * Show alert when location permission is denied
   */
  const showLocationPermissionAlert = () => {
    Alert.alert(
      'Location Permission Required',
      'Enable location services to track your position.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Enable Location', onPress: requestLocationPermission },
      ]
    );
  };

  /**
   * Start GPS tracking and update location in real-time
   */
  const startTracking = async () => {
    // Don't start tracking if collector data is not loaded yet
    if (!collector) {
      return;
    }

    try {
      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: GPS_CONFIG.timeInterval,
          distanceInterval: GPS_CONFIG.distanceInterval,
        },
        async (loc) => {
          const coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };

          // Update location state
          setLocation(coords);
          setIsLoadingLocation(false);

          // Update marker position on map
          updateMarkerPosition(coords.latitude, coords.longitude);

          // Geofence check against destination
          await checkGeofence(coords, routeDestRef.current, insideGeofenceRef, GEOFENCE_RADIUS_METERS, {
            setCurrentArea,
            setCollectedAreas,
            setNextArea,
            addCollectedMarker,
            computeNextUncollected,
            planRouteToArea,
            findScheduleEntryByLocation,
            todaysSchedule,
            collectedAreas,
          });

          // Update trucklocation in database
          await updateTruckLocation(coords);
        }
      );
    } catch (error) {
      console.error('Error starting tracking:', error);
    }
  };

  /**
   * Update truck location in Supabase database
   */
  const updateTruckLocation = async (coords) => {
    if (!collector) {
      console.warn('Collector not loaded yet; skipping trucklocation upsert.');
      return;
    }

    const collectorIdValue = collector?.collector_id || (collector?.id ? String(collector.id) : null);
    if (!collectorIdValue) {
      console.warn('Collector is missing collector_id/id; cannot upsert trucklocation.');
      return;
    }

    try {
      const basePayload = {
        collector_id: collectorIdValue,
        latitude: coords.latitude,
        longitude: coords.longitude,
        updated_at: new Date().toISOString(),
      };

      let payload = { ...basePayload, route_type: routeType || null };
      let { error: upsertError } = await supabase
        .from('trucklocation')
        .upsert(payload, { onConflict: 'collector_id' });

      // If schema doesn't have route_type yet, retry without it
      if (
        upsertError &&
        String(upsertError.message || '').toLowerCase().includes('column') &&
        String(upsertError.message || '').toLowerCase().includes('route_type')
      ) {
        payload = { ...basePayload };
        const retry = await supabase
          .from('trucklocation')
          .upsert(payload, { onConflict: 'collector_id' });
        if (retry.error) {
          console.error('Trucklocation upsert (retry without route_type) failed:', retry.error);
        }
      } else if (upsertError) {
        console.error('Supabase upsert to trucklocation failed:', upsertError);
      }
    } catch (err) {
      console.error('Unexpected error during trucklocation upsert:', err);
    }
  };

  // Request location permission when collector is loaded
  useEffect(() => {
    if (collector) {
      requestLocationPermission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collector]);

  return {
    location,
    hasLocationPermission,
    isLoadingLocation,
    requestLocationPermission,
  };
};

