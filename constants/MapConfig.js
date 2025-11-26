// constants/MapConfig.js

/**
 * Static coordinates for known areas in the garbage collection system
 * These coordinates are used for geocoding and routing within Bogo City
 */
export const AREA_COORDINATES = {
  // Route 1 Areas - Precise Coordinates
  'Don Pedro': { lat: 11.06278, lng: 123.97209 },
  'Polambato': { lat: 11.06589, lng: 123.99213 },
  'Cayang': { lat: 11.04287, lng: 123.95934 },
  'Taytayan': { lat: 11.04774, lng: 123.99144 },
  'Cogon': { lat: 11.04191375661928, lng: 123.99925751907287 },

  // Route 2 Areas - Precise Coordinates
  'Sto. Niño': { lat: 11.051908579658901, lng: 124.00987670220573 },
  'Sudlonon': { lat: 11.050099685907693, lng: 124.00944578728529 },
  'Lourdes': { lat: 11.04984907510797, lng: 124.00615139746175 },
  'Carbon': { lat: 11.051221343414376, lng: 124.00630299970629 },
  'Pandan': { lat: 11.045443807422034, lng: 124.01059833924798 },
  'Bungtod': { lat: 11.046556167974924, lng: 124.00564322195522 },

  // Route 3 Areas - Precise Coordinates
  'ARAPAL Farm': { lat: 10.993459775679144, lng: 123.95150670657063 },
  'Bungtod (Maharat & Laray)': { lat: 11.043064608107729, lng: 124.00632482492036 },
  'Dakit (Highway & Provincial Rd)': { lat: 11.0267024606469, lng: 124.00137227637995 },
  'Malingin Highway': { lat: 11.024495336133198, lng: 123.98401486763238 },

  // Route 4 Areas - Precise Coordinates
  'A/B Cogon': { lat: 11.04191375661928, lng: 123.99925751907287 },
  'Siocon': { lat: 11.034571353194844, lng: 124.0346230613197 },
  'Odlot': { lat: 10.995745310566797, lng: 124.03310671436782 },
  'Marangog': { lat: 11.014043519680058, lng: 124.03161830147067 },
  'Libertad': { lat: 11.0308842192137, lng: 124.0166792804385 },
  'Guadalupe': { lat: 10.996979448815534, lng: 124.00777586944444 },

  // Route 5 Areas - Precise Coordinates
  'Public Market': { lat: 11.056368485006644, lng: 124.01268493915852 },
  'Cantecson': { lat: 11.05364155819223, lng: 124.01322835005016 },
  'Sambag': { lat: 11.052731863205738, lng: 124.00888256245571 },
  'Sto. Rosario': { lat: 11.052750216559636, lng: 124.00577995083918 },
  'San Vicente': { lat: 11.051867555314313, lng: 124.00396979261947 },
  'LPC': { lat: 11.050316527114797, lng: 124.00230276170248 },

  // Route 6 Areas - Precise Coordinates
  'Gairan': { lat: 11.05062224662859, lng: 124.02003866446623 },
  'Nailon': { lat: 11.051050948257958, lng: 124.03488867506353 },

  // Additional Barangay Coordinates (estimated for remaining barangays)
  'Anonang Norte': { lat: 11.05123, lng: 123.98345 },
  'Anonang Sur': { lat: 11.04890, lng: 123.97890 },
  'Banban': { lat: 11.04567, lng: 123.96543 },
  'Binabag': { lat: 11.03890, lng: 123.97234 },
  'La Paz': { lat: 11.05890, lng: 123.97567 },
  'Malingin': { lat: 11.04523, lng: 123.98567 },
};

/**
 * Bogo City geographical bounds for constraining searches and routing
 */
export const BOGO_CITY_BOUNDS = {
  north: 11.08,   // Northernmost point (approx)
  south: 11.01,   // Southernmost point (approx)
  east: 124.01,   // Easternmost point (approx)
  west: 123.95,   // Westernmost point (approx)
};

/**
 * Default map location (center of Bogo City)
 */
export const DEFAULT_LOCATION = {
  latitude: 11.045,  // Center of Bogo City
  longitude: 123.985, // Center of Bogo City
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
  // Route-specific colors
  routeLines: {
    'Route 1': { color: '#34c759', weight: 5, opacity: 0.95 }, // Green
    'Route 2': { color: '#007aff', weight: 5, opacity: 0.95 }, // Blue
    'Route 3': { color: '#ff9500', weight: 5, opacity: 0.95 }, // Orange
    'Route 4': { color: '#ff3b30', weight: 5, opacity: 0.95 }, // Red
    'Route 5': { color: '#5856d6', weight: 5, opacity: 0.95 }, // Purple
    'Route 6': { color: '#ffcc00', weight: 5, opacity: 0.95 }, // Yellow
  },
  // Default route line (fallback)
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
 * Bogo City waste collection routes configuration
 */
export const BOGO_CITY_ROUTES = {
  'Route 1': {
    areas: [
      "Don Pedro",
      "Polambato",
      "Cayang",
      "Taytayan",
      "Cogon"
    ],
    time: "07:00",
    endTime: "15:00",
    type: "Dili Malata",
    frequency: "Daily",
    dayOff: "Sunday",
    color: "#34c759" // Green
  },
  'Route 2': {
    areas: [
      "Sto. Niño",
      "Sudlonon",
      "Lourdes",
      "Carbon",
      "Pandan",
      "Bungtod"
    ],
    time: "07:00",
    endTime: "15:00",
    type: "Dili Malata",
    frequency: "Daily",
    dayOff: "Sunday",
    color: "#007aff" // Blue
  },
  'Route 3': {
    areas: [
      "ARAPAL Farm",
      "Bungtod (Maharat & Laray)",
      "Dakit (Highway & Provincial Rd)",
      "Malingin Highway"
    ],
    time: "07:00",
    endTime: "15:00",
    type: "Dili Malata",
    frequency: "Daily",
    dayOff: "Sunday",
    color: "#ff9500" // Orange
  },
  'Route 4': {
    areas: [
      "A/B Cogon",
      "Siocon",
      "Odlot",
      "Marangog",
      "Libertad",
      "Guadalupe"
    ],
    time: "07:00",
    endTime: "15:00",
    type: "Dili Malata",
    frequency: "Daily",
    dayOff: "Saturday",
    color: "#ff3b30" // Red
  },
  'Route 5': {
    areas: [
      "Public Market",
      "Cantecson",
      "Sambag",
      "Sto. Rosario",
      "San Vicente",
      "LPC"
    ],
    time: "07:00",
    endTime: "15:00",
    type: "Dili Malata",
    frequency: "Daily",
    dayOff: "Saturday",
    color: "#5856d6" // Purple
  },
  'Route 6': {
    areas: [
      "Gairan",
      "Nailon"
    ],
    time: "07:00",
    endTime: "15:00",
    type: "Dili Malata",
    frequency: "Daily",
    dayOff: "Saturday",
    color: "#ffcc00" // Yellow
  }
};

/**
 * Nominatim geocoding configuration
 */
export const NOMINATIM_CONFIG = {
  baseUrl: 'https://nominatim.openstreetmap.org/search',
  userAgent: 'gwaste-app/1.0 (educational)',
  searchSuffix: ', Bogo City, Cebu, Philippines',
  // Bogo City bounds for more accurate geocoding
  viewbox: `${BOGO_CITY_BOUNDS.west},${BOGO_CITY_BOUNDS.south},${BOGO_CITY_BOUNDS.east},${BOGO_CITY_BOUNDS.north}`,
  bounded: 1, // Restrict results to viewbox
};

