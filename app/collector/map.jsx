/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { db } from '../../firebase';
import { useCollectorAuth } from '../../hooks/useCollectorAuth';
import { supabase } from '../../services/supabaseClient';

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
  const webviewRef = useRef(null);
  const MAP_HEIGHT = Math.round(Dimensions.get('window').height * 0.78);
  const { collector, loading: authLoading } = useCollectorAuth();
  const router = useRouter();

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

  const generateTimeIntervals = (startTime, endTime, areas) => {
    if (!startTime || !endTime || !areas || areas.length === 0) return [];
    
    try {
      const start = new Date(`2000-01-01 ${startTime}`);
      const end = new Date(`2000-01-01 ${endTime}`);
      const totalMinutes = (end - start) / (1000 * 60);
      
      // Calculate interval based on number of areas (1-1.5 hours per area)
      const intervalMinutes = Math.max(60, Math.min(90, Math.floor(totalMinutes / areas.length)));
      
      const intervals = [];
      let currentTime = new Date(start);
      
      areas.forEach((area, index) => {
        const intervalEnd = new Date(currentTime.getTime() + intervalMinutes * 60000);
        
        // Don't exceed the end time
        if (intervalEnd > end) {
          intervalEnd.setTime(end.getTime());
        }
        
        intervals.push({
          area: area,
          startTime: currentTime.toTimeString().slice(0, 5),
          endTime: intervalEnd.toTimeString().slice(0, 5),
          index: index + 1
        });
        
        currentTime = new Date(intervalEnd);
        
        // Stop if we've reached the end time
        if (currentTime >= end) return;
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
    if (!collector?.driver) return;

    try {
      const routesQuery = query(collection(db, 'routes'), where('driver', '==', collector.driver));
      const routesSnapshot = await getDocs(routesQuery);
      
      let scheduleList = [];
      routesSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.time && data.areas && data.areas.length > 0) {
          // Generate time intervals for each area
          const timeIntervals = generateTimeIntervals(data.time, data.endTime, data.areas);
          
          // Create schedule entries for each time interval
          timeIntervals.forEach(interval => {
            const scheduleEntry = {
              time: interval.startTime,
              endTime: interval.endTime,
              location: interval.area,
              routeNumber: data.route,
              type: data.type || 'Waste Collection',
              frequency: data.frequency,
              dayOff: data.dayOff,
              areaIndex: interval.index
            };
            scheduleList.push(scheduleEntry);
          });
        }
      });
      
      scheduleList.sort((a, b) => new Date(`2000-01-01 ${a.time}`) - new Date(`2000-01-01 ${b.time}`));
      setTodaysSchedule(scheduleList);
      
      // Determine current and next areas based on current time
      updateCurrentAndNextAreas(scheduleList);
      
    } catch (error) {
      console.error('Error loading schedule data:', error);
    }
  };

  const updateCurrentAndNextAreas = (schedule) => {
    if (!schedule || schedule.length === 0) {
      setCurrentArea(null);
      setNextArea(null);
      return;
    }

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    
    // Find current area (if we're within its time range)
    let current = null;
    let next = null;
    
    for (let i = 0; i < schedule.length; i++) {
      const item = schedule[i];
      const isCollected = collectedAreas.has(item.location);
      
      if (!isCollected) {
        if (!current && currentTime >= item.time && currentTime <= item.endTime) {
          current = item;
        } else if (!next && currentTime < item.time) {
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
      const script = `
        if (window.marker && window.map) {
          // Smooth animation to new position
          window.marker.setLatLng([${newLat}, ${newLng}]);
          
          // Smooth pan to follow the marker (optional - you can remove this if you don't want auto-pan)
          window.map.panTo([${newLat}, ${newLng}], {
            animate: true,
            duration: 1.0
          });
          
          // Update popup content with current coordinates
          window.marker.getPopup().setContent(
            "You (Collector)<br>Lat: ${newLat.toFixed(5)}<br>Lng: ${newLng.toFixed(5)}"
          );
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
          // Set initial position without animation
          window.marker.setLatLng([${lat}, ${lng}]);
          window.map.setView([${lat}, ${lng}], 15);
          window.marker.getPopup().setContent(
            "You (Collector)<br>Lat: ${lat.toFixed(5)}<br>Lng: ${lng.toFixed(5)}"
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
        showLocationPermissionAlert();
      }
    } catch (error) {
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

          if (!collector) {
            // addLog("⚠️ Driver data not loaded yet, skipping GPS update.");
            return;
          }

          try {
            await supabase.from('locations').upsert({
              collector_id: collector.id,
              latitude: coords.latitude,
              longitude: coords.longitude,
              updated_at: new Date().toISOString(),
            });
            // addLog(`📡 Sent GPS for ${collector.driver || collector.firstName || "Driver"}: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`);
          } catch (err) {
            // addLog(`❌ Error sending GPS: ${err.message}`);
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
            }).addTo(window.map).bindPopup("You (Collector)");

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
  container: { flex: 1 },
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
