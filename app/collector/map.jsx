/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { DEFAULT_LOCATION } from '../../constants/MapConfig';
import { useCollectorAuth } from '../../hooks/useCollectorAuthSupabase';
import { useCollectorTracking } from '../../hooks/useCollectorTracking';
import { useLeafletMap } from '../../hooks/useLeafletMap';
import { supabase } from '../../services/supabaseClient';
import {
  buildSchedule,
  computeNextUncollected,
  findScheduleEntryByLocation,
  formatTime,
  updateCurrentAndNextAreas,
} from '../../utils/scheduleHelpers';

export default function CollectorMapScreen() {
  const [todaysSchedule, setTodaysSchedule] = useState([]);
  const [currentArea, setCurrentArea] = useState(null);
  const [nextArea, setNextArea] = useState(null);
  const [collectedAreas, setCollectedAreas] = useState(new Set());
  const [routeType, setRouteType] = useState(null);
  const routeDestRef = useRef({ name: null, lat: null, lng: null });
  const insideGeofenceRef = useRef(false);

  const MAP_HEIGHT = Math.round(Dimensions.get('window').height * 0.78);
  const { collector, loading: authLoading } = useCollectorAuth();
  const router = useRouter();
  const driverLabel = ((collector?.driver) || (collector?.collector_name) || (collector?.first_name) || 'Collector');

  // Initialize map hook
  const {
    webviewRef,
    mapInitialized,
    setMapInitialized,
    getMapHtml,
    updateMarkerPosition,
    setInitialMarkerPosition,
    addCollectedMarker,
    geocodeArea,
    drawPlannedRoute,
  } = useLeafletMap(driverLabel);

  /**
   * Plan route to a specific area
   */
  const planRouteToArea = async (areaName) => {
    if (!areaName || !location) return;
    const dest = await geocodeArea(areaName);
    if (!dest) return;
    routeDestRef.current = { name: areaName, lat: dest.lat, lng: dest.lng };
    insideGeofenceRef.current = false;
    await drawPlannedRoute(location.latitude, location.longitude, dest.lat, dest.lng, areaName);
  };

  /**
   * Helper to find schedule entry by location
   */
  const findScheduleEntry = (locationName) => {
    return findScheduleEntryByLocation(locationName, todaysSchedule);
  };

  // Initialize GPS tracking hook
  const {
    location,
    hasLocationPermission,
    isLoadingLocation,
    requestLocationPermission,
  } = useCollectorTracking({
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
    findScheduleEntryByLocation: findScheduleEntry,
    todaysSchedule,
    collectedAreas,
    routeType,
  });

  /**
   * Load schedule data from Supabase
   */
  const loadScheduleData = async () => {
    try {
      let queryValue = collector?.driver || collector?.collector_name || collector?.first_name || null;
      if (!queryValue) return;

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
      const { current, next } = updateCurrentAndNextAreas(scheduleList, collectedAreas);
      setCurrentArea(current);
      setNextArea(next);
    } catch (error) {
      console.error('Error loading schedule data:', error);
      setTodaysSchedule([]);
      setCurrentArea(null);
      setNextArea(null);
    }
  };

  /**
   * Update current and next areas based on schedule
   */
  const updateAreas = () => {
    if (todaysSchedule.length > 0) {
      const { current, next } = updateCurrentAndNextAreas(todaysSchedule, collectedAreas);
      setCurrentArea(current);
      setNextArea(next);
    }
  };

  // Fetch route type once
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

  // Load schedule data when collector is available
  useEffect(() => {
    if (collector && !authLoading) {
      loadScheduleData();
    }
  }, [collector, authLoading]);

  // Update current and next areas every minute and when collected areas change
  useEffect(() => {
    updateAreas();
    const interval = setInterval(updateAreas, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [todaysSchedule, collectedAreas]);

  // Set initial marker position when map is ready and we have location
  useEffect(() => {
    if (mapInitialized && location) {
      setInitialMarkerPosition(location.latitude, location.longitude);
    }
  }, [mapInitialized, location]);

  // When next area changes, compute a planned route
  useEffect(() => {
    const run = async () => {
      if (!nextArea || !nextArea.location) return;
      if (!location) return;
      const dest = await geocodeArea(nextArea.location);
      if (!dest) return;
      routeDestRef.current = { name: nextArea.location, lat: dest.lat, lng: dest.lng };
      insideGeofenceRef.current = false;
      await drawPlannedRoute(location.latitude, location.longitude, dest.lat, dest.lng, nextArea.location);
    };
    run();
  }, [nextArea, mapInitialized]);

  const userLocation = location || DEFAULT_LOCATION;

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
});
