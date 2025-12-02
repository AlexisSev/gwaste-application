// utils/geofence.js
import { notifyResidentsInArea } from '../services/geofenceSmsService';
import { supabase } from '../services/supabaseClient';

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - First latitude
 * @param {number} lon1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lon2 - Second longitude
 * @returns {number} Distance in meters
 */
export const distanceMeters = (lat1, lon1, lat2, lon2) => {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Handle geofence entry - notify residents and update current area
 * @param {string} areaName - Name of the area entered
 * @param {Function} setCurrentArea - Setter for current area state
 * @param {Function} findScheduleEntryByLocation - Function to find schedule entry
 * @returns {Promise<void>}
 */
export const handleGeofenceEntry = async (areaName, setCurrentArea, findScheduleEntryByLocation) => {
  try {
    // Notify residents in this area via SMS
    await notifyResidentsInArea(areaName);
    
    // Set Current Area based on actual location (geofence entry)
    const entry = findScheduleEntryByLocation(areaName);
    if (entry) {
      setCurrentArea(entry);
    } else {
      // Fallback: minimal current area when no schedule match
      setCurrentArea({ location: areaName, time: null, endTime: null });
    }
  } catch (error) {
    console.error('Error handling geofence entry:', error);
  }
};

/**
 * Handle geofence exit - mark area as collected and plan next route
 * @param {string} areaName - Name of the area exited
 * @param {number} lat - Latitude of the area
 * @param {number} lng - Longitude of the area
 * @param {Function} setCurrentArea - Setter for current area state
 * @param {Function} setCollectedAreas - Setter for collected areas state
 * @param {Function} setNextArea - Setter for next area state
 * @param {Function} addCollectedMarker - Function to add marker on map
 * @param {Function} computeNextUncollected - Function to compute next area
 * @param {Function} planRouteToArea - Function to plan route to next area
 * @param {Array} todaysSchedule - Today's schedule
 * @param {Set} collectedAreas - Set of already collected areas
 * @returns {Promise<void>}
 */
export const handleGeofenceExit = async (
  areaName,
  lat,
  lng,
  setCurrentArea,
  setCollectedAreas,
  setNextArea,
  addCollectedMarker,
  computeNextUncollected,
  planRouteToArea,
  todaysSchedule,
  collectedAreas
) => {
  try {
    // Notify admin that the area's garbage is collected
    await supabase.from('notifications').insert({
      title: 'Collection Completed',
      message: `${areaName} garbage has been collected`,
      area: areaName,
      is_read: false
    });
  } catch (error) {
    console.error('Error creating collection notification:', error);
  }

  // Mark area as collected (normalize name for consistent comparison)
  setCollectedAreas((prev) => {
    const next = new Set(prev);
    if (areaName) {
      // Normalize area name (trim and lowercase) for consistent comparison
      const normalized = String(areaName).trim().toLowerCase();
      next.add(normalized);
    }
    return next;
  });

  // Clear Current Area on exit (collection finished)
  setCurrentArea(null);
  
  // Add collected marker to map
  addCollectedMarker(lat, lng, areaName);
  
  // Plan route to next area
  try {
    const nextCandidate = computeNextUncollected(todaysSchedule, new Set([...collectedAreas, areaName]));
    if (nextCandidate) {
      setNextArea(nextCandidate);
      await planRouteToArea(nextCandidate.location, nextCandidate.routeNumber);
    }
  } catch (error) {
    console.error('Error planning next route:', error);
  }
};

/**
 * Check if collector is inside geofence and handle entry/exit
 * @param {Object} coords - Current coordinates {latitude, longitude}
 * @param {Object} destInfo - Destination info {name, lat, lng}
 * @param {Object} insideGeofenceRef - Ref to track if inside geofence
 * @param {number} geofenceRadius - Radius in meters
 * @param {Object} handlers - Object containing all handler functions
 * @returns {Promise<void>}
 */
export const checkGeofence = async (
  coords,
  destInfo,
  insideGeofenceRef,
  geofenceRadius,
  handlers
) => {
  if (!destInfo || destInfo.lat == null || destInfo.lng == null) return;

  try {
    const dist = distanceMeters(coords.latitude, coords.longitude, destInfo.lat, destInfo.lng);
    const wasInside = insideGeofenceRef.current;
    const isInside = dist <= geofenceRadius;

    if (!wasInside && isInside) {
      // Entered geofence
      insideGeofenceRef.current = true;
      await handleGeofenceEntry(
        destInfo.name,
        handlers.setCurrentArea,
        handlers.findScheduleEntryByLocation
      );
    } else if (wasInside && !isInside) {
      // Exited geofence
      insideGeofenceRef.current = false;
      await handleGeofenceExit(
        destInfo.name,
        destInfo.lat,
        destInfo.lng,
        handlers.setCurrentArea,
        handlers.setCollectedAreas,
        handlers.setNextArea,
        handlers.addCollectedMarker,
        handlers.computeNextUncollected,
        handlers.planRouteToArea,
        handlers.todaysSchedule,
        handlers.collectedAreas
      );
    }
  } catch (error) {
    console.error('Error in geofence check:', error);
  }
};

