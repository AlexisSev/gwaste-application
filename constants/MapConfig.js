// constants/MapConfig.js

/**
 * Static coordinates for known areas in the garbage collection system
 * These coordinates are used for geocoding and routing
 */
export const AREA_COORDINATES = {
  'Don Pedro': { lat: 11.07237, lng: 123.96657 },
  'Polambato': { lat: 11.06700, lng: 123.98923 },
  'Cayang': { lat: 11.04264, lng: 123.95960 },
  'Taytayan': { lat: 11.04756, lng: 123.99095 },
  'Cogon': { lat: 11.04261, lng: 124.00075 },
};

/**
 * Default map location (center of coverage area)
 */
export const DEFAULT_LOCATION = {
  latitude: 11.033333,
  longitude: 124.0,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

/**
 * Geofence radius in meters - defines the area around a destination
 * where the collector is considered to have "entered" the collection zone
 */
export const GEOFENCE_RADIUS_METERS = 1000;

/**
 * GPS tracking configuration
 */
export const GPS_CONFIG = {
  // Update interval in milliseconds
  timeInterval: 2000, // 2 seconds
  // Distance interval in meters (0 = update on any movement)
  distanceInterval: 0,
  // Maximum number of breadcrumb trail points to keep
  maxPathPoints: 300,
  // Delay between position updates in milliseconds
  updateDelay: 100,
};

/**
 * Map styling configuration
 */
export const MAP_STYLES = {
  // Planned route line (green)
  routeLine: {
    color: '#34c759',
    weight: 5,
    opacity: 0.95,
  },
  // Breadcrumb trail line (blue)
  pathLine: {
    color: '#1e88e5',
    weight: 4,
    opacity: 0.9,
  },
  // Geofence circle (red)
  geofenceCircle: {
    color: '#e53935',
    weight: 2,
    opacity: 1,
    fillColor: '#ff8a80',
    fillOpacity: 0.35,
  },
  // Collected area marker (green)
  collectedMarker: {
    radius: 7,
    color: '#2e7d32',
    fillColor: '#2e7d32',
    fillOpacity: 1,
  },
};

/**
 * Truck marker configuration
 */
export const TRUCK_MARKER = {
  emoji: '🚛',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
};

/**
 * Destination marker configuration
 */
export const DESTINATION_MARKER = {
  iconUrl: 'https://img.icons8.com/color/48/map-pin.png',
  iconSize: [36, 36],
  iconAnchor: [18, 34],
  popupAnchor: [0, -28],
};

/**
 * OpenStreetMap tile layer configuration
 */
export const OSM_TILE_LAYER = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '',
};

/**
 * OSRM routing service URL
 */
export const OSRM_ROUTING_URL = 'https://router.project-osrm.org/route/v1/driving';

/**
 * Nominatim geocoding configuration
 */
export const NOMINATIM_CONFIG = {
  baseUrl: 'https://nominatim.openstreetmap.org/search',
  userAgent: 'gwaste-app/1.0 (educational)',
  searchSuffix: ', Philippines',
};

