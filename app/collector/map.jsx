/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useCollectorAuth } from '../../hooks/useCollectorAuthSupabase';
import { supabase } from '../../services/supabaseClient';

// Lightweight UUID v4 generator for location_id when inserting rows
const genUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = Math.random() * 16 | 0;
  const v = c === 'x' ? r : (r & 0x3 | 0x8);
  return v.toString(16);
});

export default function CollectorMapScreen() {
  const [location, setLocation] = useState(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [logs, setLogs] = useState([]); 
  const [mapInitialized, setMapInitialized] = useState(false);
  const [todaysSchedule, setTodaysSchedule] = useState([]);
  const [currentArea, setCurrentArea] = useState(null);
  const [nextArea, setNextArea] = useState(null);
  const [collectedAreas, setCollectedAreas] = useState(new Set());
  const [routeType, setRouteType] = useState(null);
  const [pathCoords, setPathCoords] = useState([]); // driver's breadcrumb trail
  const webviewRef = useRef(null);
  const geocodeCacheRef = useRef({});
  const routeDestRef = useRef({ name: null, lat: null, lng: null });
  const insideGeofenceRef = useRef(false);
  const GEOFENCE_RADIUS_METERS = 1000; // fixed visual and detection radius
  const areaCoords = {
    // Provided static 123.96657coordinates for known areas
    'Don Pedro': { lat: 11.07237, lng: 123.96657 },
    'Polambato': { lat: 11.06700, lng: 123.98923 },
    'Cayang': { lat: 11.04264, lng: 123.95960 },
    'Taytayan': { lat: 11.04756, lng: 123.99095 },
    'Cogon': { lat: 11.04261, lng: 124.00075 },
  };

  const findScheduleEntryByLocation = (locationName) => {
    if (!locationName) return null;
    const name = String(locationName).trim();
    return (todaysSchedule || []).find((s) => String(s.location).trim() === name) || null;
  };

  const addCollectedMarker = (lat, lng, name) => {
    if (!webviewRef.current || !mapInitialized) return;
    const js = `
      try {
        window.__collectedLayer = window.__collectedLayer || L.layerGroup().addTo(window.map);
        const m = L.circleMarker([${lat}, ${lng}], { radius: 7, color: '#2e7d32', fillColor: '#2e7d32', fillOpacity: 1 });
        m.bindPopup(${JSON.stringify('Collected: ')} + ${JSON.stringify(name)});
        window.__collectedLayer.addLayer(m);
        try { m.bringToFront(); } catch (e) {}
      } catch (e) {}
    `;
    webviewRef.current.injectJavaScript(js);
  };

  const planRouteToArea = async (areaName) => {
    if (!areaName || !location) return;
    const dest = await geocodeArea(areaName);
    if (!dest) return;
    routeDestRef.current = { name: areaName, lat: dest.lat, lng: dest.lng };
    insideGeofenceRef.current = false;
    await drawPlannedRoute(location.latitude, location.longitude, dest.lat, dest.lng, areaName);
  };

  const computeNextUncollected = (schedule, collected) => {
    if (!Array.isArray(schedule) || schedule.length === 0) return null;
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const currentMins = toMinutes(currentTime);
    let candidate = null;
    for (let i = 0; i < schedule.length; i++) {
      const it = schedule[i];
      if (collected.has(it.location)) continue;
      const startM = toMinutes(it.time);
      if (startM == null) continue;
      if (currentMins <= startM) { candidate = it; break; }
      if (!candidate) candidate = it; // fallback to earliest if all started
    }
    return candidate;
  };
  const MAP_HEIGHT = Math.round(Dimensions.get('window').height * 0.78);
  const { collector, loading: authLoading } = useCollectorAuth();
  const router = useRouter();
  const driverLabel = ((collector?.driver) || (collector?.collector_name) || (collector?.first_name) || 'Collector');

  const defaultLocation = {
    latitude: 11.033333,
    longitude: 124.0,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (error) {
      return timeString;
    }
  };

  const toMinutes = (hhmm) => {
    try {
      const [h, m] = String(hhmm).split(':').map((v) => parseInt(v));
      return h * 60 + (m || 0);
    } catch (_) { return null; }
  };

  const toHHMM = (minsTotal) => {
    const h = Math.floor(minsTotal / 60) % 24;
    const m = minsTotal % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  };

  // Haversine distance in meters
  const distanceMeters = (lat1, lon1, lat2, lon2) => {
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371000; // meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Normalize areas coming from DB (can be JSON string, comma-separated, or array)
  const normalizeAreas = (areasVal) => {
    if (!areasVal) return [];
    if (Array.isArray(areasVal)) return areasVal.filter(Boolean);
    if (typeof areasVal === 'string') {
      const s = areasVal.trim();
      // Try JSON parse first
      if ((s.startsWith('[') && s.endsWith(']')) || (s.startsWith('{') && s.endsWith('}'))) {
        try {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) return parsed.filter(Boolean);
        } catch (_) {}
      }
      // Fallback: comma-separated list
      return s.split(',').map(v => v.trim()).filter(Boolean);
    }
    return [];
  };

  // Geocode an area name to lat/lng via Nominatim (cached) with robust local lookup
  const geocodeArea = async (query) => {
    if (!query) return null;
    const raw = String(query).trim();
    const key = raw.toLowerCase();
    // 1) Check hardcoded area coordinates first (case-insensitive and trimmed)
    if (areaCoords[raw]) return areaCoords[raw];
    if (areaCoords[key]) return areaCoords[key];
    try {
      const lowerIndex = Object.fromEntries(Object.entries(areaCoords || {}).map(([k, v]) => [String(k).toLowerCase().trim(), v]));
      if (lowerIndex[key]) return lowerIndex[key];
    } catch (_) {}
    if (geocodeCacheRef.current[key]) return geocodeCacheRef.current[key];
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query + ', Philippines')}`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'gwaste-app/1.0 (educational)'
        }
      });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        const value = { lat, lng };
        geocodeCacheRef.current[key] = value;
        return value;
      }
    } catch (_e) {}
    return null;
  };

  // Fetch route from OSRM and draw on the Leaflet map
  const drawPlannedRoute = async (startLat, startLng, endLat, endLng, destName = 'Destination') => {
    if (!webviewRef.current || !mapInitialized) return;
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      let coords = data?.routes?.[0]?.geometry?.coordinates || [];
      // Fallback to straight line if routing fails
      if (!Array.isArray(coords) || coords.length === 0) {
        coords = [[startLng, startLat],[endLng, endLat]];
      }
      const latlngs = coords.map(([lng, lat]) => [lat, lng]);
      const js = `
        try {
          window.routeLatLngs = ${JSON.stringify(latlngs)};
          if (!window.routeLine) {
            window.routeLine = L.polyline(window.routeLatLngs, { color: '#34c759', weight: 5, opacity: 0.95 }).addTo(window.map);
          } else {
            window.routeLine.setLatLngs(window.routeLatLngs);
          }
          try { window.routeLine.bringToFront(); } catch (e) {}
          // Create or update a red destination marker at the end of the route
          try {
            const __dest = window.routeLatLngs[window.routeLatLngs.length - 1];
            if (!window.routeDestMarker) {
              const __pinUrl = 'https://img.icons8.com/color/48/map-pin.png';
              window.routeDestMarker = L.marker(__dest, {
                icon: L.icon({
                  iconUrl: __pinUrl,
                  iconRetinaUrl: __pinUrl,
                  iconSize: [36, 36],
                  iconAnchor: [18, 34],
                  popupAnchor: [0, -28]
                })
              }).addTo(window.map);
              window.routeDestMarker.bindPopup(${JSON.stringify(' ')} + ${JSON.stringify(destName)});
            } else {
              window.routeDestMarker.setLatLng(__dest);
              try { window.routeDestMarker.setPopupContent(${JSON.stringify('')} + ${JSON.stringify(destName)}); } catch (e) {}
            }
            // Create or update a visible geofence circle around the destination (solid outline)
            if (!window.routeGeofence) {
              window.routeGeofence = L.circle(__dest, {
                radius: ${GEOFENCE_RADIUS_METERS},
                color: '#e53935',
                weight: 2,
                opacity: 1,
                fillColor: '#ff8a80',
                fillOpacity: 0.35
              }).addTo(window.map);
            } else {
              window.routeGeofence.setLatLng(__dest);
              window.routeGeofence.setRadius(${GEOFENCE_RADIUS_METERS});
              try { window.routeGeofence.setStyle({ weight: 2, opacity: 1, color: '#e53935', fillColor: '#ff8a80', fillOpacity: 0.35 }); } catch (e) {}
            }
            try { window.routeGeofence.bringToFront(); } catch (e) {}
            try { window.routeDestMarker.bringToFront(); } catch (e) {}
          } catch (e) {}
          // Fit once when route drawn
          try { window.map.fitBounds(window.routeLine.getBounds(), { padding: [20, 20] }); } catch (e) {}
        } catch (e) {}
      `;
      webviewRef.current.injectJavaScript(js);
    } catch (_e) {}
  };

  // When next area or location changes, compute a planned route from current GPS to next scheduled area
  useEffect(() => {
    const run = async () => {
      if (!nextArea || !nextArea.location) return;
      if (!location) return;
      const dest = await geocodeArea(nextArea.location);
      if (!dest) return;
      // Store current destination for geofencing
      routeDestRef.current = { name: nextArea.location, lat: dest.lat, lng: dest.lng };
      insideGeofenceRef.current = false; // reset on new destination
      await drawPlannedRoute(location.latitude, location.longitude, dest.lat, dest.lng, nextArea.location);
    };
    run();
  }, [nextArea, mapInitialized]);

  const generateTimeIntervals = (startTime, endTime, areasInput) => {
    const areas = normalizeAreas(areasInput);
    if (!startTime || areas.length === 0) return [];
    
    try {
      const startMins = toMinutes(startTime);
      let intervalMinutes = 60;
      if (endTime) {
        const endMins = toMinutes(endTime);
        const totalMinutes = Math.max(0, endMins - startMins);
        intervalMinutes = Math.max(30, Math.min(120, Math.floor(totalMinutes / areas.length) || 60));
      }
      
      const intervals = [];
      let currentMins = startMins;
      
      areas.forEach((area, index) => {
        let intervalEndMins = currentMins + intervalMinutes;
        if (endTime) {
          const endMins = toMinutes(endTime);
          if (intervalEndMins > endMins) intervalEndMins = endMins;
        }
        
        intervals.push({
          area: area,
          startTime: toHHMM(currentMins),
          endTime: toHHMM(intervalEndMins),
          index: index + 1
        });
        
        currentMins = intervalEndMins;
        
        // Stop if we've reached the end time
        if (endTime && currentMins >= toMinutes(endTime)) return;
      });
      
      return intervals;
    } catch (error) {
      console.error('Error generating time intervals:', error);
      return areas.map((area, index) => ({
        area: area,
        startTime: startTime,
        endTime: endTime,
        index: index + 1
      }));
    }
  };

  const loadScheduleData = async () => {
    try {
      // Prefer exact driver match, fallback to name field if present
      let queryValue = collector?.driver || collector?.collector_name || collector?.first_name || null;
      if (!queryValue) return;

      const buildSchedule = (rows) => {
        const scheduleList = [];
        (rows || []).forEach((data) => {
          const areasArr = normalizeAreas(data?.areas);
          const startTime = data?.time || data?.startTime || data?.start_time || null;
          const endTime = data?.endTime || data?.end_time || null;
          const routeNum = data?.route || data?.route_number || data?.routeNo || null;
          if (startTime && areasArr.length > 0) {
            const timeIntervals = generateTimeIntervals(startTime, endTime, areasArr);
            timeIntervals.forEach((interval) => {
              scheduleList.push({
                time: interval.startTime,
                endTime: interval.endTime,
                location: interval.area,
                routeNumber: routeNum,
                type: data?.type || 'Waste Collection',
                frequency: data?.frequency,
                dayOff: data?.dayOff || data?.day_off,
                areaIndex: interval.index,
              });
            });
          }
        });
        scheduleList.sort((a, b) => new Date(`2000-01-01 ${a.time}`) - new Date(`2000-01-01 ${b.time}`));
        return scheduleList;
      };

      let { data: routesData, error } = await supabase
        .from('routes')
        .select('*')
        .eq('driver', queryValue);
      if (error) throw error;

      let scheduleList = buildSchedule(routesData);

      // Fallback: if nothing found and we have a different possible driver name
      if (scheduleList.length === 0 && collector?.collector_name && collector.collector_name !== queryValue) {
        const alt = await supabase.from('routes').select('*').eq('driver', collector.collector_name);
        if (!alt.error) {
          scheduleList = buildSchedule(alt.data);
        }
      }

      setTodaysSchedule(scheduleList);
      updateCurrentAndNextAreas(scheduleList);
    } catch (error) {
      console.error('Error loading schedule data:', error);
      setTodaysSchedule([]);
      setCurrentArea(null);
      setNextArea(null);
    }
  };

  const updateCurrentAndNextAreas = (schedule) => {
    if (!schedule || schedule.length === 0) {
      setCurrentArea(null);
      setNextArea(null);
      return;
    }

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const currentMins = toMinutes(currentTime);
    
    // Find current area (if we're within its time range)
    let current = null;
    let next = null;
    
    for (let i = 0; i < schedule.length; i++) {
      const item = schedule[i];
      const isCollected = collectedAreas.has(item.location);
      
      if (!isCollected) {
        const startM = toMinutes(item.time);
        let endM = toMinutes(item.endTime);
        if (endM == null) {
          endM = (startM || 0) + 90; // assume 90 mins window if end missing
        }
        if (!current && startM != null && currentMins >= startM && currentMins <= endM) {
          current = item;
        } else if (!next && startM != null && currentMins < startM) {
          next = item;
          break;
        }
      }
    }
    
    // If no current area found, the next uncollected area becomes next
    if (!current && !next) {
      const uncollectedAreas = schedule.filter(item => !collectedAreas.has(item.location));
      if (uncollectedAreas.length > 0) {
        next = uncollectedAreas[0];
      }
    }
    
    setCurrentArea(current);
    setNextArea(next);
  };

  // Load schedule data when collector is available
  useEffect(() => {
    if (collector && !authLoading) {
      loadScheduleData();
    }
  }, [collector, authLoading]);

  // Update current and next areas every minute
  useEffect(() => {
    if (todaysSchedule.length > 0) {
      updateCurrentAndNextAreas(todaysSchedule);
      
      const interval = setInterval(() => {
        updateCurrentAndNextAreas(todaysSchedule);
      }, 60000); // Update every minute
      
      return () => clearInterval(interval);
    }
  }, [todaysSchedule, collectedAreas]);

  // 🔹 Step 1: When collector data is loaded, request GPS permission
  useEffect(() => {
    if (collector && !authLoading) {
      // addLog(`✅ Driver loaded: ${collector.driver || collector.firstName} (ID: ${collector.id})`);
      requestLocationPermission();
    }
  }, [collector, authLoading]);

  // Fetch and cache the driver's route type once
  useEffect(() => {
    const fetchRouteTypeOnce = async () => {
      try {
        if (!collector?.driver) return;
        const { data, error } = await supabase
          .from('routes')
          .select('type')
          .eq('driver', collector.driver)
          .limit(1);
        if (!error && Array.isArray(data) && data.length > 0) {
          setRouteType(data[0]?.type || null);
        }
      } catch (_e) {
        // ignore
      }
    };
    fetchRouteTypeOnce();
  }, [collector?.driver]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !collector) {
      router.replace('/login');
    }
  }, [collector, authLoading, router]);

  // Set initial marker position when map is ready and we have location
  useEffect(() => {
    if (mapInitialized && location) {
      setInitialMarkerPosition(location.latitude, location.longitude);
    }
  }, [mapInitialized, location]);


  // const addLog = (msg) => {
  //   setLogs((prev) => [`${new Date().toLocaleTimeString()} - ${msg}`, ...prev].slice(0, 10));
  // };

  // Function to update marker position smoothly
  const updateMarkerPosition = (newLat, newLng) => {
    if (webviewRef.current && mapInitialized) {
      // keep a short breadcrumb trail in state (max 300 points)
      setPathCoords((prev) => {
        const next = [...prev, { latitude: newLat, longitude: newLng }];
        return next.length > 300 ? next.slice(next.length - 300) : next;
      });
      const script = `
        if (window.marker && window.map) {
          // Do not auto-pan to driver to avoid camera bouncing when a route is displayed
          // Smooth animation to new position
          window.marker.setLatLng([${newLat}, ${newLng}]);
          // Update popup content with current coordinates
          window.marker.getPopup().setContent(
            "You (${driverLabel.replace(/"/g, '\\"')})<br>Lat: ${newLat.toFixed(5)}<br>Lng: ${newLng.toFixed(5)}"
          );

          // Update or create the path polyline
          try {
            window.__pathPoints = window.__pathPoints || [];
            window.__pathPoints.push([${newLat}, ${newLng}]);
            if (window.__pathPoints.length > 300) {
              window.__pathPoints = window.__pathPoints.slice(window.__pathPoints.length - 300);
            }
            if (!window.pathLine) {
              window.pathLine = L.polyline(window.__pathPoints, { color: '#1e88e5', weight: 4, opacity: 0.9 }).addTo(window.map);
            } else {
              window.pathLine.setLatLngs(window.__pathPoints);
            }
          } catch (e) {}
        }
      `;
      webviewRef.current.injectJavaScript(script);
    }
  };

  // Function to set initial marker position when map loads
  const setInitialMarkerPosition = (lat, lng) => {
    if (webviewRef.current && mapInitialized) {
      const script = `
        if (window.marker && window.map) {
          // Set initial position without animation (do not change camera here)
          window.marker.setLatLng([${lat}, ${lng}]);
          // keep current zoom/center to prevent bouncing
          window.marker.getPopup().setContent(
            "You (${driverLabel.replace(/"/g, '\\"')})<br>Lat: ${lat.toFixed(5)}<br>Lng: ${lng.toFixed(5)}"
          );
        }
      `;
      webviewRef.current.injectJavaScript(script);
    }
  };

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

  const startTracking = async () => {
    // Don't start tracking if collector data is not loaded yet
    if (!collector) {
      // addLog("⚠️ Cannot start GPS tracking: Driver data not loaded yet.");
      return;
    }

    try {
      // addLog("🔄 Starting GPS tracking...");
      await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 0 }, // every 2 sec
        async (loc) => {
          const coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          
          // Update location state
          setLocation(coords);
          setIsLoadingLocation(false);

          // Update marker position smoothly
          updateMarkerPosition(coords.latitude, coords.longitude);

          // Geofence check against destination using fixed radius
          const destInfo = routeDestRef.current;
          if (destInfo && destInfo.lat != null && destInfo.lng != null) {
            try {
              const dist = distanceMeters(coords.latitude, coords.longitude, destInfo.lat, destInfo.lng);
              const wasInside = insideGeofenceRef.current;
              const isInside = dist <= GEOFENCE_RADIUS_METERS;
              if (!wasInside && isInside) {
                insideGeofenceRef.current = true;
                // TODO: Notify residents within this area (commented until phone numbers are implemented)
                // await supabase.functions.invoke('notify-residents', { body: { area: destInfo.name } });
                // Set Current Area based on actual location (geofence entry)
                const entry = findScheduleEntryByLocation(destInfo.name);
                if (entry) {
                  setCurrentArea(entry);
                  // Keep Next Area as is until collection completes
                } else {
                  // Fallback: minimal current area when no schedule match
                  setCurrentArea({ location: destInfo.name, time: null, endTime: null });
                }
              } else if (wasInside && !isInside) {
                insideGeofenceRef.current = false;
                try {
                  // Notify admin that the area's garbage is collected
                  await supabase.from('notifications').insert({
                    title: 'Collection Completed',
                    message: `${destInfo.name} garbage has been collected`,
                    type: 'collection_completed',
                    area: destInfo.name,
                  });
                } catch (_e) {}
                setCollectedAreas((prev) => {
                  const next = new Set(prev);
                  if (destInfo.name) next.add(destInfo.name);
                  return next;
                });
                // Clear Current Area on exit (collection finished)
                setCurrentArea(null);
                addCollectedMarker(destInfo.lat, destInfo.lng, destInfo.name);
                try {
                  const nextCandidate = computeNextUncollected(todaysSchedule, new Set([...collectedAreas, destInfo.name]));
                  if (nextCandidate) {
                    setNextArea(nextCandidate);
                    await planRouteToArea(nextCandidate.location);
                  }
                } catch (_e) {}
              }
            } catch (_e) {}
          }

          if (!collector) {
            // addLog("⚠️ Driver data not loaded yet, skipping GPS update.");
            console.warn('Collector not loaded yet; skipping trucklocation upsert.');
            return;
          }
          const collectorIdValue = collector?.collector_id || (collector?.id ? String(collector.id) : null);
          if (!collectorIdValue) {
            console.warn('Collector is missing collector_id/id; cannot upsert trucklocation. Collector:', collector);
            return;
          }

          try {
            // We intentionally omit location_id so the DB default can generate it only on first insert.
            // With a UNIQUE index on collector_id, this upsert will update the single existing row.
            const basePayload = {
              collector_id: collectorIdValue, // must exist in collectors table
              latitude: coords.latitude,
              longitude: coords.longitude,
              updated_at: new Date().toISOString(),
            };
            let payload = { ...basePayload, route_type: routeType || null };
            let { error: upsertError } = await supabase
              .from('trucklocation')
              .upsert(payload, { onConflict: 'collector_id' });
            // If schema doesn't have route_type yet, retry without it
            if (upsertError && String(upsertError.message || '').toLowerCase().includes('column') && String(upsertError.message || '').toLowerCase().includes('route_type')) {
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
        }
      );
    } catch (error) {
      // addLog(`⚠️ Error starting tracking: ${error.message}`);
    }
  };

  const showLocationPermissionAlert = () => {
    Alert.alert('Location Permission Required', 'Enable location services to track your position.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Enable Location', onPress: requestLocationPermission },
    ]);
  };

  // Render map (Leaflet in WebView) - stable map that doesn't re-render
  const getMapHtml = () => {
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
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <script>
            // Initialize map with default location
            window.map = L.map('map', { zoomControl: false, attributionControl: false }).setView([11.033333, 124.0], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: ''
            }).addTo(window.map);

            // Create marker with smooth animation
            window.marker = L.marker([11.033333, 124.0], {
              icon: L.divIcon({
                className: 'custom-icon',
                html: "🚛",
                iconSize: [32, 32],
                iconAnchor: [16, 16],
              })
            }).addTo(window.map).bindPopup("You (${driverLabel.replace(/"/g, '\\"')})");

            // Initialize empty path polyline
            window.__pathPoints = [];
            window.pathLine = L.polyline(window.__pathPoints, { color: '#1e88e5', weight: 4, opacity: 0.9 }).addTo(window.map);

            // Reserved holder for planned route polyline
            window.routeLine = null;

            // Signal that map is ready
            window.ReactNativeWebView.postMessage(JSON.stringify({type: 'mapReady'}));
          </script>
        </body>
      </html>`;
  };

  const userLocation = location || defaultLocation;

  // Show loading state while authentication is being checked
  if (authLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading driver data...</Text>
        </View>
      </View>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!collector) {
    return null;
  }

  return (
    <View style={styles.container}>
      {hasLocationPermission && !isLoadingLocation ? (
        <View style={[styles.mapContainer, { height: MAP_HEIGHT }]}>
          <WebView
            ref={webviewRef}
            originWhitelist={['*']}
            source={{ html: getMapHtml() }}
            style={styles.webview}
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.type === 'mapReady') {
                  setMapInitialized(true);
                  // addLog("🗺️ Map initialized and ready for tracking");
                }
              } catch (e) {
                // Ignore parsing errors
              }
            }}
            onLoadEnd={() => {
              // Set initial marker position when map loads
              if (location) {
                setInitialMarkerPosition(location.latitude, location.longitude);
              }
            }}
          />
        </View>
      ) : (
        <View style={[styles.placeholder, styles.mapContainer, { height: MAP_HEIGHT }]} />
      )}

      <View style={styles.floatingCard}>
        <View style={styles.areaContainer}>
          <View style={styles.currentAreaCard}>
            <Text style={styles.areaTitle}>Current Area</Text>
            {currentArea ? (
              <View>
                <Text style={styles.areaName}>{currentArea.location}</Text>
                <Text style={styles.areaTime}>
                  {formatTime(currentArea.time)} - {formatTime(currentArea.endTime)}
                </Text>
                <Text style={styles.areaRoute}>Route {currentArea.routeNumber}</Text>
              </View>
            ) : (
              <Text style={styles.noAreaText}>No current area</Text>
            )}
          </View>
          
          <View style={styles.nextAreaCard}>
            <Text style={styles.areaTitle}>Next Area</Text>
            {nextArea ? (
              <View>
                <Text style={styles.areaName}>{nextArea.location}</Text>
                <Text style={styles.areaTime}>
                  {formatTime(nextArea.time)} - {formatTime(nextArea.endTime)}
                </Text>
                <Text style={styles.areaRoute}>Route {nextArea.routeNumber}</Text>
              </View>
            ) : (
              <Text style={styles.noAreaText}>No next area</Text>
            )}
          </View>
        </View>
      </View>

      {/* Logs - Commented out since GPS is working */}
      {/* <View style={styles.logContainer}>
        <Text style={styles.logTitle}>GPS Logs:</Text>
        <ScrollView style={styles.logScroll}>
          {logs.map((log, index) => (
            <Text key={index} style={styles.logText}>{log}</Text>
          ))}
        </ScrollView>
      </View> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  mapContainer: {
    marginHorizontal: 0,
    marginTop: 0,
    borderRadius: 0,
    overflow: 'hidden',
    elevation: 5,
    backgroundColor: '#ffffff',
  },
  webview: { ...StyleSheet.absoluteFillObject },
  placeholder: { flex: 1, backgroundColor: '#f2f2f2' },
  floatingCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'white',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  areaContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  currentAreaCard: {
    flex: 1,
    padding: 12,
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  nextAreaCard: {
    flex: 1,
    padding: 12,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  areaTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  areaName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  areaTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  areaRoute: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
  },
  noAreaText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  logContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#111',
    maxHeight: 140,
  },
  logTitle: { fontSize: 14, fontWeight: 'bold', color: '#4CAF50', marginBottom: 6 },
  logScroll: { maxHeight: 110 },
  logText: { fontSize: 12, color: '#eee', marginBottom: 2 },
});
