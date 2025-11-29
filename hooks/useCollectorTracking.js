// hooks/useCollectorTracking.js
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
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
  const lastDbUpdateRef = useRef(0); // Track last database update time for throttling
  const lastCoordsRef = useRef(null); // Track last coordinates to detect actual movement

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

          // console.log('GPS location update received:', { lat: coords.latitude, lng: coords.longitude });

          // Check if coordinates have actually changed
          const coordsChanged = !lastCoordsRef.current || 
            Math.abs(lastCoordsRef.current.latitude - coords.latitude) > 0.0001 ||
            Math.abs(lastCoordsRef.current.longitude - coords.longitude) > 0.0001;

          if (coordsChanged) {
            // console.log('Coordinates changed, updating...');
            lastCoordsRef.current = coords;
          }

          // Update location state
          setLocation(coords);
          setIsLoadingLocation(false);

          // Update marker position on map (always update, regardless of DB throttling)
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

          // Update trucklocation in database (throttled to reduce data usage)
          const now = Date.now();
          const dbUpdateInterval = GPS_CONFIG.dbUpdateInterval || 10000; // Default 10 seconds
          const timeSinceLastUpdate = now - lastDbUpdateRef.current;
          
          // Always update on first location, if coordinates changed significantly, or if enough time has passed
          const shouldUpdate = lastDbUpdateRef.current === 0 || 
                              timeSinceLastUpdate >= dbUpdateInterval ||
                              (coordsChanged && timeSinceLastUpdate >= 3000); // Update every 3s if moving
          
          if (shouldUpdate) {
            // console.log(`Updating database (time since last: ${timeSinceLastUpdate}ms, interval: ${dbUpdateInterval}ms, coords changed: ${coordsChanged})`);
            lastDbUpdateRef.current = now;
            try {
              await updateTruckLocation(coords);
            } catch (_err) {
              // console.error('Failed to update truck location in database:', _err);
            }
          } else {
            // console.log(`Skipping database update (throttled, ${Math.round((dbUpdateInterval - timeSinceLastUpdate) / 1000)}s remaining)`);
          }
        }
      );
    } catch (_error) {
      // console.error('Error starting tracking:', _error);
    }
  };

  /**
   * Update truck location in Supabase database
   */
  const updateTruckLocation = async (coords) => {
    if (!collector) {
      // console.warn('Collector not loaded yet; skipping trucklocation upsert.');
      return;
    }

    const collectorIdValue = collector?.collector_id || (collector?.id ? String(collector.id) : null);
    if (!collectorIdValue) {
      // console.warn('Collector is missing collector_id/id; cannot upsert trucklocation.');
      // console.warn('Collector object:', collector);
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
      // console.log('Attempting to upsert truck location:', payload);
      
      let { error: upsertError } = await supabase
        .from('trucklocation')
        .upsert(payload, { onConflict: 'collector_id' });
      
      // console.log('Upsert response:', { error: upsertError });

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
          // console.error('Trucklocation upsert (retry without route_type) failed:', retry.error);
          throw retry.error;
        } else {
          // console.log('Truck location updated successfully (without route_type):', { collector_id: collectorIdValue, lat: coords.latitude, lng: coords.longitude });
        }
      } else if (upsertError) {
        // console.error('Supabase upsert to trucklocation failed:', upsertError);
        throw upsertError;
      } else {
        // console.log('Truck location updated successfully:', { collector_id: collectorIdValue, lat: coords.latitude, lng: coords.longitude, route_type: routeType });
      }
    } catch (_err) {
      // console.error('Unexpected error during trucklocation upsert:', _err);
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

