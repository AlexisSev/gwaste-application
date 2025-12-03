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
  updateCurrentAndNextAreas
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
  const planRouteToArea = async (areaName, routeNumber = null) => {
    if (!areaName || !location) return;
    const dest = await geocodeArea(areaName);
    if (!dest) return;
    routeDestRef.current = { name: areaName, lat: dest.lat, lng: dest.lng };
    insideGeofenceRef.current = false;
    await drawPlannedRoute(location.latitude, location.longitude, dest.lat, dest.lng, areaName, routeNumber);
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
   * Load previously collected areas from database
   */
  const loadCollectedAreas = async () => {
    try {
      if (!collector?.id) return;
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('collections')
        .select('areas_collected')
        .eq('collector_id', collector.id)
        .eq('collected_date', today);
      
      if (error) {
        console.error('Error loading collected areas:', error);
        return;
      }

      if (!data || data.length === 0) {
        return;
      }
      
      // Aggregate all areas_collected arrays across rows (if multiple)
      // Store normalized names (lowercase, trimmed) for consistent comparison
      const collectedSet = new Set();
      data.forEach(row => {
        const arr = Array.isArray(row.areas_collected) ? row.areas_collected : [];
        arr.forEach(a => { 
          if (a) {
            // Normalize area name (trim and lowercase) for consistent comparison
            const normalized = String(a).trim().toLowerCase();
            collectedSet.add(normalized);
          }
        });
      });
      
      // Update collected areas state
      setCollectedAreas(collectedSet);
      console.log('✅ Loaded collected areas from database:', Array.from(collectedSet));
      console.log('📊 Total collected areas:', collectedSet.size);
      
      // Note: updateAreas() will be called automatically when collectedAreas state changes
      // via the useEffect hook, so we don't need to manually update here
    } catch (error) {
      console.error('Error loading collected areas:', error);
    }
  };

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
      
      // Load collected areas after schedule is loaded
      await loadCollectedAreas();
      
      // Note: updateAreas() will be called automatically when collectedAreas changes
      // via the useEffect hook, so we don't need to call it here
    } catch (error) {
      console.error('Error loading schedule data:', error);
      setTodaysSchedule([]);
      setCurrentArea(null);
      setNextArea(null);
    }
  };

  /**
   * Check if all areas are collected
   */
  const areAllAreasCollected = () => {
    if (todaysSchedule.length === 0) return false;
    
    // Helper function to normalize area names
    const normalizeAreaName = (name) => String(name || '').trim().toLowerCase();
    
    // Check if all schedule areas are in collectedAreas
    const allCollected = todaysSchedule.every(item => {
      const normalizedLocation = normalizeAreaName(item.location);
      let isCollected = false;
      if (collectedAreas && collectedAreas.size > 0) {
        collectedAreas.forEach(area => {
          if (normalizeAreaName(area) === normalizedLocation) {
            isCollected = true;
          }
        });
      }
      return isCollected;
    });
    
    return allCollected;
  };

  /**
   * Update current and next areas based on schedule
   */
  const updateAreas = () => {
    if (todaysSchedule.length > 0) {
      const { current, next } = updateCurrentAndNextAreas(todaysSchedule, collectedAreas);
      setCurrentArea(current);
      setNextArea(next);
      console.log('🔄 Updated areas:', { 
        current: current?.location || 'None', 
        next: next?.location || 'None',
        collectedCount: collectedAreas.size,
        totalAreas: todaysSchedule.length,
        allCollected: areAllAreasCollected()
      });
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

  // Also reload collected areas when collector changes
  useEffect(() => {
    if (collector && !authLoading) {
      loadCollectedAreas();
    }
  }, [collector?.id]);

  // Subscribe to real-time updates from collections table
  // This ensures the map screen updates immediately when areas are marked as collected
  useEffect(() => {
    if (!collector?.id) return;

    console.log('🔔 Setting up real-time subscription for collector:', collector.id);

    const channel = supabase
      .channel(`collections-updates-${collector.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'collections',
          filter: `collector_id=eq.${collector.id}`,
        },
        (payload) => {
          console.log('📦 Collection updated in real-time:', payload);
          console.log('🔄 Reloading collected areas...');
          // Reload collected areas when collections table changes
          // Add a small delay to ensure database is fully updated
          setTimeout(() => {
            loadCollectedAreas();
          }, 500);
        }
      )
      .subscribe((status) => {
        console.log('📡 Real-time subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to collections updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to collections updates');
        }
      });

    return () => {
      console.log('🔕 Unsubscribing from collections updates');
      supabase.removeChannel(channel);
    };
  }, [collector?.id]);

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

  // When current area changes, compute a planned route to it (for initial display)
  useEffect(() => {
    const run = async () => {
      if (!currentArea || !currentArea.location) return;
      if (!location) return;
      if (!mapInitialized) return;
      const dest = await geocodeArea(currentArea.location);
      if (!dest) return;
      routeDestRef.current = { name: currentArea.location, lat: dest.lat, lng: dest.lng };
      insideGeofenceRef.current = false;
      await drawPlannedRoute(location.latitude, location.longitude, dest.lat, dest.lng, currentArea.location, currentArea.routeNumber);
    };
    run();
  }, [currentArea, mapInitialized, location]);

  // When next area changes, compute a planned route
  useEffect(() => {
    const run = async () => {
      if (!nextArea || !nextArea.location) return;
      if (!location) return;
      if (!mapInitialized) return;
      // Only plan route to next area if we don't have a current area
      // (to avoid showing route to next when we should show route to current)
      if (currentArea && currentArea.location) return;
      const dest = await geocodeArea(nextArea.location);
      if (!dest) return;
      routeDestRef.current = { name: nextArea.location, lat: dest.lat, lng: dest.lng };
      insideGeofenceRef.current = false;
      await drawPlannedRoute(location.latitude, location.longitude, dest.lat, dest.lng, nextArea.location, nextArea.routeNumber);
    };
    run();
  }, [nextArea, mapInitialized, location, currentArea]);

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
        {areAllAreasCollected() ? (
          <View style={styles.completedContainer}>
            <Text style={styles.completedIcon}>✅</Text>
            <Text style={styles.completedTitle}>Completed Collections for Today</Text>
            <Text style={styles.completedSubtitle}>
              All {todaysSchedule.length} area{todaysSchedule.length !== 1 ? 's' : ''} have been collected
            </Text>
            <Text style={styles.completedMessage}>
              Great job! You&apos;ve finished all scheduled collections for today.
            </Text>
          </View>
        ) : (
          <View style={styles.areaContainer}>
            <View style={styles.areaColumn}>
              <Text style={styles.areaTitle}>Current Area</Text>
              {currentArea ? (
                <View>
                  <Text style={styles.areaName}>{currentArea.location}</Text>
                  <Text style={styles.areaRoute}>Route {currentArea.routeNumber}</Text>
                </View>
              ) : (
                <Text style={styles.noAreaText}>No current area</Text>
              )}
            </View>

            <View style={styles.areaColumn}>
              <Text style={styles.areaTitle}>Next Area</Text>
              {nextArea ? (
                <View>
                  <Text style={styles.areaName}>{nextArea.location}</Text>
                  <Text style={styles.areaRoute}>Route {nextArea.routeNumber}</Text>
                </View>
              ) : (
                <Text style={styles.noAreaText}>No next area</Text>
              )}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
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
    flex: 1,
    marginHorizontal: 0,
    marginTop: 0,
    borderRadius: 0,
    overflow: 'hidden',
  },
  webview: { ...StyleSheet.absoluteFillObject },
  placeholder: { flex: 1, backgroundColor: '#f2f2f2' },
  floatingCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 110,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(255,255,255,0.92)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 20,
  },
  areaContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  areaColumn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
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
    color: '#000000',
    marginBottom: 8,
  },
  areaName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  areaTime: {
    fontSize: 12,
    color: '#000000',
    marginBottom: 2,
  },
  areaRoute: {
    fontSize: 11,
    color: '#000000',
    fontStyle: 'italic',
  },
  noAreaText: {
    fontSize: 14,
    color: '#000000',
    fontStyle: 'italic',
  },
  completedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  completedIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  completedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
    textAlign: 'center',
  },
  completedSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    textAlign: 'center',
  },
  completedMessage: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});