// hooks/useLeafletMap.js
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AREA_COORDINATES,
  BOGO_CITY_BOUNDS,
  DEFAULT_LOCATION,
  DESTINATION_MARKER,
  GEOFENCE_RADIUS_METERS,
  MAP_STYLES,
  NOMINATIM_CONFIG,
  OSM_TILE_LAYER,
  OSRM_ROUTING_URL,
} from '../constants/MapConfig';

/**
 * Custom hook for managing Leaflet map operations via WebView
 * Handles map initialization, marker updates, routing, and geocoding
 */
export const useLeafletMap = (driverLabel) => {
  const [mapInitialized, setMapInitialized] = useState(false);
  const webviewRef = useRef(null);
  const geocodeCacheRef = useRef({});
  const routeCacheRef = useRef({}); // Cache routes to reduce OSRM API calls
  const pendingLocationRef = useRef(null); // Store location updates before map is ready

  
  const getMapHtml = useCallback(() => {
    return `<!doctype html>
      <html>
        <head>
          <meta name="viewport" content="initial-scale=1.0, width=device-width" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
            <style>
            html,body,#map{height:100%;margin:0;padding:0;}
            .leaflet-control-zoom { display: none !important; }
            .custom-icon {
              background: transparent;
              border: none;
              text-align: center;
              line-height: 1;
              display: flex;
              align-items: center;
              justify-content: center;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <script>
            window.map = L.map('map', {
              zoomControl: false,
              attributionControl: false,
              maxBounds: [[${BOGO_CITY_BOUNDS.south}, ${BOGO_CITY_BOUNDS.west}], [${BOGO_CITY_BOUNDS.north}, ${BOGO_CITY_BOUNDS.east}]],
              maxBoundsViscosity: 1.0 // Prevents dragging outside bounds
            }).setView([${DEFAULT_LOCATION.latitude}, ${DEFAULT_LOCATION.longitude}], 13);
            L.tileLayer('${OSM_TILE_LAYER.url}', {
              attribution: '${OSM_TILE_LAYER.attribution}',
              maxZoom: ${OSM_TILE_LAYER.maxZoom || 18},
              minZoom: ${OSM_TILE_LAYER.minZoom || 10},
              crossOrigin: true,
            }).addTo(window.map);
            window.marker = L.marker([${DEFAULT_LOCATION.latitude}, ${DEFAULT_LOCATION.longitude}], {
              icon: L.divIcon({
                className: 'custom-icon',
                html: '<div style="font-size: 28px; line-height: 1; text-align: center; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">🚛</div>',
                iconSize: [28, 28],
                iconAnchor: [14, 28],
                popupAnchor: [0, -28]
              })
            }).addTo(window.map).bindPopup("You (${driverLabel.replace(/"/g, '\\"')})");
            window.__pathPoints = [];
            window.pathLine = L.polyline(window.__pathPoints, { color: '${MAP_STYLES.pathLine.color}', weight: ${MAP_STYLES.pathLine.weight}, opacity: ${MAP_STYLES.pathLine.opacity} }).addTo(window.map);
            window.routeLine = null;
            window.ReactNativeWebView.postMessage(JSON.stringify({type: 'mapReady'}));
          </script>
        </body>
      </html>`;
  }, [driverLabel]);

  /**
   * Update marker position on the map
   */
  const updateMarkerPosition = useCallback((newLat, newLng) => {
    // Store location if map isn't ready yet (will be applied when map initializes)
    if (!webviewRef.current || !mapInitialized) {
      pendingLocationRef.current = { lat: newLat, lng: newLng };
      return;
    }
    
    // Clear pending location since we're applying it now
    if (pendingLocationRef.current) {
      pendingLocationRef.current = null;
    }

    const script = `
      try {
        if (window.marker && window.map) {
          // Ensure icon is properly set
          if (!window.marker.getIcon() || !window.marker.getIcon().options.html) {
            window.marker.setIcon(L.divIcon({
              className: 'custom-icon',
              html: '<div style="font-size: 28px; line-height: 1; text-align: center; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">🚛</div>',
              iconSize: [28, 28],
              iconAnchor: [14, 28],
              popupAnchor: [0, -28]
            }));
          }
          // Smooth animation to new position
          window.marker.setLatLng([${newLat}, ${newLng}]);
          // Update popup content with current coordinates
          try {
            window.marker.getPopup().setContent(
              "You (${driverLabel.replace(/"/g, '\\"')})<br>Lat: ${newLat.toFixed(5)}<br>Lng: ${newLng.toFixed(5)}"
            );
          } catch (e) {
            // Popup might not exist yet, create it
            window.marker.bindPopup("You (${driverLabel.replace(/"/g, '\\"')})<br>Lat: ${newLat.toFixed(5)}<br>Lng: ${newLng.toFixed(5)}");
          }

          // Update or create the path polyline
          try {
            window.__pathPoints = window.__pathPoints || [];
            window.__pathPoints.push([${newLat}, ${newLng}]);
            if (window.__pathPoints.length > 300) {
              window.__pathPoints = window.__pathPoints.slice(window.__pathPoints.length - 300);
            }
            if (!window.pathLine) {
              window.pathLine = L.polyline(window.__pathPoints, { color: '${MAP_STYLES.pathLine.color}', weight: ${MAP_STYLES.pathLine.weight}, opacity: ${MAP_STYLES.pathLine.opacity} }).addTo(window.map);
            } else {
              window.pathLine.setLatLngs(window.__pathPoints);
            }
          } catch (e) {
            // console.error('Error updating path line:', e);
          }
        } else {
          // console.warn('Marker or map not available for position update');
        }
      } catch (e) {
        // console.error('Error updating marker position:', e);
      }
    `;
    webviewRef.current.injectJavaScript(script);
  }, [mapInitialized, driverLabel]);

  /**
   * Set initial marker position when map loads
   */
  const setInitialMarkerPosition = useCallback((lat, lng) => {
    if (!webviewRef.current || !mapInitialized) return;

    const script = `
      if (window.marker && window.map) {
        // Update icon if not set properly
        if (!window.marker.getIcon() || !window.marker.getIcon().options.html) {
          window.marker.setIcon(L.divIcon({
            className: 'custom-icon',
            html: '<div style="font-size: 28px; line-height: 1; text-align: center; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">🚛</div>',
            iconSize: [28, 28],
            iconAnchor: [14, 28],
            popupAnchor: [0, -28]
          }));
        }
        // Set initial position without animation
        window.marker.setLatLng([${lat}, ${lng}]);
        window.marker.getPopup().setContent(
          "You (${driverLabel.replace(/"/g, '\\"')})<br>Lat: ${lat.toFixed(5)}<br>Lng: ${lng.toFixed(5)}"
        );
      }
    `;
    webviewRef.current.injectJavaScript(script);
  }, [mapInitialized, driverLabel]);

  /**
   * Add a collected marker to the map
   */
  const addCollectedMarker = useCallback((lat, lng, name) => {
    if (!webviewRef.current || !mapInitialized) return;

    const js = `
      try {
        window.__collectedLayer = window.__collectedLayer || L.layerGroup().addTo(window.map);
        const m = L.circleMarker([${lat}, ${lng}], { 
          radius: ${MAP_STYLES.collectedMarker.radius}, 
          color: '${MAP_STYLES.collectedMarker.color}', 
          fillColor: '${MAP_STYLES.collectedMarker.fillColor}', 
          fillOpacity: ${MAP_STYLES.collectedMarker.fillOpacity} 
        });
        m.bindPopup(${JSON.stringify('Collected: ')} + ${JSON.stringify(name)});
        window.__collectedLayer.addLayer(m);
        try { m.bringToFront(); } catch (e) {}
      } catch (e) {}
    `;
    webviewRef.current.injectJavaScript(js);
  }, [mapInitialized]);

  /**
   * Geocode an area name to lat/lng coordinates
   */
  const geocodeArea = useCallback(async (query) => {
    if (!query) return null;
    const raw = String(query).trim();
    const key = raw.toLowerCase();

    // 1) Check hardcoded area coordinates first
    if (AREA_COORDINATES[raw]) return AREA_COORDINATES[raw];
    if (AREA_COORDINATES[key]) return AREA_COORDINATES[key];

    try {
      const lowerIndex = Object.fromEntries(
        Object.entries(AREA_COORDINATES || {}).map(([k, v]) => [String(k).toLowerCase().trim(), v])
      );
      if (lowerIndex[key]) return lowerIndex[key];
    } catch (_) {}

    // 2) Check cache (persists for app session, reduces API calls)
    if (geocodeCacheRef.current[key]) return geocodeCacheRef.current[key];

    // 3) Fetch from Nominatim with Bogo City bounds
    try {
      const url = `${NOMINATIM_CONFIG.baseUrl}?format=json&limit=1&q=${encodeURIComponent(query + NOMINATIM_CONFIG.searchSuffix)}&viewbox=${NOMINATIM_CONFIG.viewbox}&bounded=${NOMINATIM_CONFIG.bounded}`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': NOMINATIM_CONFIG.userAgent
        }
      });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);

        // Validate that result is within Bogo City bounds
        if (lat >= BOGO_CITY_BOUNDS.south && lat <= BOGO_CITY_BOUNDS.north &&
            lng >= BOGO_CITY_BOUNDS.west && lng <= BOGO_CITY_BOUNDS.east) {
          const value = { lat, lng };
          geocodeCacheRef.current[key] = value;
          return value;
        } else {
          console.warn(`Geocoded location for "${query}" is outside Bogo City bounds:`, { lat, lng });
        }
      }
    } catch (_e) {}

    return null;
  }, []);

  /**
   * Draw a planned route on the map using OSRM
   */
  const drawPlannedRoute = useCallback(async (startLat, startLng, endLat, endLng, destName = 'Destination', routeNumber = null) => {
    if (!webviewRef.current || !mapInitialized) return;

    try {
      // Validate that both start and end points are within Bogo City bounds
      const isWithinBounds = (lat, lng) =>
        lat >= BOGO_CITY_BOUNDS.south && lat <= BOGO_CITY_BOUNDS.north &&
        lng >= BOGO_CITY_BOUNDS.west && lng <= BOGO_CITY_BOUNDS.east;

      // Get route-specific color or fallback to default
      const routeKey = routeNumber ? `Route ${routeNumber}` : null;
      const routeStyle = routeKey && MAP_STYLES.routeLines[routeKey]
        ? MAP_STYLES.routeLines[routeKey]
        : MAP_STYLES.routeLine;

      if (!isWithinBounds(startLat, startLng) || !isWithinBounds(endLat, endLng)) {
        console.warn('Route start or end point is outside Bogo City bounds - using direct line instead');
        // Fall back to direct line if points are outside bounds
        const coords = [[startLng, startLat], [endLng, endLng]];
        const latlngs = coords.map(([lng, lat]) => [lat, lng]);
        const js = `
          try {
            window.routeLatLngs = ${JSON.stringify(latlngs)};
            if (!window.routeLine) {
              window.routeLine = L.polyline(window.routeLatLngs, {
                color: '${routeStyle.color}',
                weight: ${routeStyle.weight},
                opacity: ${routeStyle.opacity}
              }).addTo(window.map);
            } else {
              window.routeLine.setLatLngs(window.routeLatLngs);
              // Update color if route changed
              if (window.routeLine.options.color !== '${routeStyle.color}') {
                window.routeLine.setStyle({ color: '${routeStyle.color}' });
              }
            }
            // Add destination marker and geofence for direct route
            const __dest = window.routeLatLngs[window.routeLatLngs.length - 1];
            if (!window.routeDestMarker) {
              const __pinUrl = '${DESTINATION_MARKER.iconUrl}';
              window.routeDestMarker = L.marker(__dest, {
                icon: L.icon({
                  iconUrl: __pinUrl,
                  iconRetinaUrl: __pinUrl,
                  iconSize: [${DESTINATION_MARKER.iconSize[0]}, ${DESTINATION_MARKER.iconSize[1]}],
                  iconAnchor: [${DESTINATION_MARKER.iconAnchor[0]}, ${DESTINATION_MARKER.iconAnchor[1]}],
                  popupAnchor: [${DESTINATION_MARKER.popupAnchor[0]}, ${DESTINATION_MARKER.popupAnchor[1]}]
                })
              }).addTo(window.map);
              window.routeDestMarker.bindPopup(${JSON.stringify(' ')} + ${JSON.stringify(destName)});
            } else {
              window.routeDestMarker.setLatLng(__dest);
            }
            if (!window.routeGeofence) {
              window.routeGeofence = L.circle(__dest, {
                radius: ${GEOFENCE_RADIUS_METERS},
                color: '${MAP_STYLES.geofenceCircle.color}',
                weight: ${MAP_STYLES.geofenceCircle.weight},
                opacity: '${MAP_STYLES.geofenceCircle.opacity}',
                fillColor: '${MAP_STYLES.geofenceCircle.fillColor}',
                fillOpacity: ${MAP_STYLES.geofenceCircle.fillOpacity}
              }).addTo(window.map);
            } else {
              window.routeGeofence.setLatLng(__dest);
            }
          } catch (e) {}
        `;
        webviewRef.current.injectJavaScript(js);
        return;
      }

      // Check route cache first (round coordinates to reduce cache misses)
      const routeCacheKey = `${Math.round(startLat * 1000)}_${Math.round(startLng * 1000)}_${Math.round(endLat * 1000)}_${Math.round(endLng * 1000)}`;
      if (routeCacheRef.current[routeCacheKey]) {
        let coords = routeCacheRef.current[routeCacheKey];
        // Filter and process cached route
        coords = coords.filter(([lng, lat]) => isWithinBounds(lat, lng));
        if (coords.length < 2) {
          coords = [[startLng, startLat], [endLng, endLng]];
        }
        const latlngs = coords.map(([lng, lat]) => [lat, lng]);
        // Use cached route (skip to rendering)
        const js = `
          try {
            window.routeLatLngs = ${JSON.stringify(latlngs)};
            if (!window.routeLine) {
              window.routeLine = L.polyline(window.routeLatLngs, {
                color: '${routeStyle.color}',
                weight: ${routeStyle.weight},
                opacity: ${routeStyle.opacity}
              }).addTo(window.map);
            } else {
              window.routeLine.setLatLngs(window.routeLatLngs);
              if (window.routeLine.options.color !== '${routeStyle.color}') {
                window.routeLine.setStyle({ color: '${routeStyle.color}' });
              }
            }
            try { window.routeLine.bringToFront(); } catch (e) {}
            const __dest = window.routeLatLngs[window.routeLatLngs.length - 1];
            if (!window.routeDestMarker) {
              const __pinUrl = '${DESTINATION_MARKER.iconUrl}';
              window.routeDestMarker = L.marker(__dest, {
                icon: L.icon({
                  iconUrl: __pinUrl,
                  iconRetinaUrl: __pinUrl,
                  iconSize: [${DESTINATION_MARKER.iconSize[0]}, ${DESTINATION_MARKER.iconSize[1]}],
                  iconAnchor: [${DESTINATION_MARKER.iconAnchor[0]}, ${DESTINATION_MARKER.iconAnchor[1]}],
                  popupAnchor: [${DESTINATION_MARKER.popupAnchor[0]}, ${DESTINATION_MARKER.popupAnchor[1]}]
                })
              }).addTo(window.map);
              window.routeDestMarker.bindPopup(${JSON.stringify(' ')} + ${JSON.stringify(destName)});
            } else {
              window.routeDestMarker.setLatLng(__dest);
              try { window.routeDestMarker.setPopupContent(${JSON.stringify('')} + ${JSON.stringify(destName)}); } catch (e) {}
            }
            if (!window.routeGeofence) {
              window.routeGeofence = L.circle(__dest, {
                radius: ${GEOFENCE_RADIUS_METERS},
                color: '${MAP_STYLES.geofenceCircle.color}',
                weight: ${MAP_STYLES.geofenceCircle.weight},
                opacity: ${MAP_STYLES.geofenceCircle.opacity},
                fillColor: '${MAP_STYLES.geofenceCircle.fillColor}',
                fillOpacity: ${MAP_STYLES.geofenceCircle.fillOpacity}
              }).addTo(window.map);
            } else {
              window.routeGeofence.setLatLng(__dest);
              window.routeGeofence.setRadius(${GEOFENCE_RADIUS_METERS});
            }
            try { window.routeGeofence.bringToFront(); } catch (e) {}
            try { window.routeDestMarker.bringToFront(); } catch (e) {}
            try { window.map.fitBounds(window.routeLine.getBounds(), { padding: [20, 20] }); } catch (e) {}
          } catch (e) {}
        `;
        webviewRef.current.injectJavaScript(js);
        return;
      }

      // Fetch route from OSRM API - uses shortest path algorithm by default
      // OSRM returns the shortest/fastest route automatically
      // Parameters: overview=full (detailed geometry), geometries=geojson (GeoJSON format), alternatives=false (only shortest route)
      const url = `${OSRM_ROUTING_URL}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&alternatives=false&steps=false`;
      const res = await fetch(url);
      const data = await res.json();
      
      // OSRM returns routes sorted by duration (shortest first), so routes[0] is always the shortest path
      let coords = data?.routes?.[0]?.geometry?.coordinates || [];
      
      // Cache the route for future use
      if (coords.length > 0) {
        routeCacheRef.current[routeCacheKey] = coords;
        // Limit cache size to prevent memory issues (keep last 50 routes)
        const cacheKeys = Object.keys(routeCacheRef.current);
        if (cacheKeys.length > 50) {
          delete routeCacheRef.current[cacheKeys[0]];
        }
      }

      // Fallback to straight line if routing fails
      if (!Array.isArray(coords) || coords.length === 0) {
        coords = [[startLng, startLat], [endLng, endLat]];
      }

      // Filter out coordinates that are outside Bogo City bounds (in case OSRM returns a route that goes outside)
      coords = coords.filter(([lng, lat]) => isWithinBounds(lat, lng));

      // Ensure we still have at least the start and end points
      if (coords.length < 2) {
        coords = [[startLng, startLat], [endLng, endLng]];
      }

      const latlngs = coords.map(([lng, lat]) => [lat, lng]);

      const js = `
        try {
          window.routeLatLngs = ${JSON.stringify(latlngs)};
          if (!window.routeLine) {
            window.routeLine = L.polyline(window.routeLatLngs, {
              color: '${routeStyle.color}',
              weight: ${routeStyle.weight},
              opacity: ${routeStyle.opacity}
            }).addTo(window.map);
          } else {
            window.routeLine.setLatLngs(window.routeLatLngs);
            // Update color if route changed
            if (window.routeLine.options.color !== '${routeStyle.color}') {
              window.routeLine.setStyle({ color: '${routeStyle.color}' });
            }
          }
          try { window.routeLine.bringToFront(); } catch (e) {}
          
          // Create or update destination marker
          try {
            const __dest = window.routeLatLngs[window.routeLatLngs.length - 1];
            if (!window.routeDestMarker) {
              const __pinUrl = '${DESTINATION_MARKER.iconUrl}';
              window.routeDestMarker = L.marker(__dest, {
                icon: L.icon({
                  iconUrl: __pinUrl,
                  iconRetinaUrl: __pinUrl,
                  iconSize: [${DESTINATION_MARKER.iconSize[0]}, ${DESTINATION_MARKER.iconSize[1]}],
                  iconAnchor: [${DESTINATION_MARKER.iconAnchor[0]}, ${DESTINATION_MARKER.iconAnchor[1]}],
                  popupAnchor: [${DESTINATION_MARKER.popupAnchor[0]}, ${DESTINATION_MARKER.popupAnchor[1]}]
                })
              }).addTo(window.map);
              window.routeDestMarker.bindPopup(${JSON.stringify(' ')} + ${JSON.stringify(destName)});
            } else {
              window.routeDestMarker.setLatLng(__dest);
              try { window.routeDestMarker.setPopupContent(${JSON.stringify('')} + ${JSON.stringify(destName)}); } catch (e) {}
            }
            
            // Create or update geofence circle
            if (!window.routeGeofence) {
              window.routeGeofence = L.circle(__dest, {
                radius: ${GEOFENCE_RADIUS_METERS},
                color: '${MAP_STYLES.geofenceCircle.color}',
                weight: ${MAP_STYLES.geofenceCircle.weight},
                opacity: ${MAP_STYLES.geofenceCircle.opacity},
                fillColor: '${MAP_STYLES.geofenceCircle.fillColor}',
                fillOpacity: ${MAP_STYLES.geofenceCircle.fillOpacity}
              }).addTo(window.map);
            } else {
              window.routeGeofence.setLatLng(__dest);
              window.routeGeofence.setRadius(${GEOFENCE_RADIUS_METERS});
            }
            try { window.routeGeofence.bringToFront(); } catch (e) {}
            try { window.routeDestMarker.bringToFront(); } catch (e) {}
          } catch (e) {}
          
          // Fit map to route bounds
          try { window.map.fitBounds(window.routeLine.getBounds(), { padding: [20, 20] }); } catch (e) {}
        } catch (e) {}
      `;
      webviewRef.current.injectJavaScript(js);
    } catch (_e) {}
  }, [mapInitialized]);

  // Apply pending location when map initializes
  useEffect(() => {
    if (mapInitialized && pendingLocationRef.current && webviewRef.current) {
      const { lat, lng } = pendingLocationRef.current;
      updateMarkerPosition(lat, lng);
      pendingLocationRef.current = null;
    }
  }, [mapInitialized, updateMarkerPosition]);

  return {
    webviewRef,
    mapInitialized,
    setMapInitialized,
    getMapHtml,
    updateMarkerPosition,
    setInitialMarkerPosition,
    addCollectedMarker,
    geocodeArea,
    drawPlannedRoute,
  };
};

