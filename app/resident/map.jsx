/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import * as Location from 'expo-location';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { auth, db } from '../../firebase';
import { supabase } from '../../services/supabaseClient';

export default function MapScreen() {
  const [location, setLocation] = useState(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [collectors, setCollectors] = useState([]);
  const [mapInitialized, setMapInitialized] = useState(false);
  const webviewRef = useRef(null);
  const MAP_HEIGHT = Math.round(Dimensions.get('window').height * 0.77);
  const [destination, setDestination] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [pickupInfo, setPickupInfo] = useState({
    type: 'Loading...',
    estimatedArrival: 'Calculating...',
    status: 'Loading...',
    nextCollector: null
  });
  const [truckSchedule, setTruckSchedule] = useState(null);
  const [selectedTruckId, setSelectedTruckId] = useState(null);

  const defaultLocation = {
    latitude: 8.4542,
    longitude: 124.6319,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  // Function to update user location marker smoothly
  const updateUserLocation = (newLat, newLng) => {
    if (webviewRef.current && mapInitialized) {
      const script = `
        if (window.userMarker && window.map) {
          // Smooth animation to new position
          window.userMarker.setLatLng([${newLat}, ${newLng}]);
          // Smooth pan to follow the user
          window.map.panTo([${newLat}, ${newLng}], {
            animate: true,
            duration: 1.0
          });
        }
      `;
      webviewRef.current.injectJavaScript(script);
    }
  };

  // Function to update collector markers smoothly
  const updateCollectorMarkers = (activeCollectors) => {
    if (webviewRef.current && mapInitialized) {
      const collectorsJson = JSON.stringify(activeCollectors || []);
      const script = `
        // Clear existing collector markers
        if (window.collectorMarkers) {
          window.collectorMarkers.forEach(marker => marker.remove());
        }
        window.collectorMarkers = [];

        // Add new collector markers
        const collectors = ${collectorsJson};
        collectors.forEach(c => {
          if (c.latitude && c.longitude) {
            const marker = L.marker([c.latitude, c.longitude], {
              icon: L.divIcon({
                className: 'custom-icon',
                html: "🚛",
                iconSize: [24, 24],
                iconAnchor: [12, 12],
              })
            }).addTo(window.map);
            
            // Create detailed popup
            const popupContent = \`
              <div style="text-align: center; min-width: 150px;">
                <h4 style="margin: 0 0 8px 0; color: #4CAF50;">🚛 Driver \${c.collector_id}</h4>
                <p style="margin: 4px 0; font-size: 12px; color: #666;">
                  Last seen: \${new Date(c.updated_at).toLocaleTimeString()}
                </p>
                <button onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type: 'truckClicked', collectorId: '\${c.collector_id}'}))" 
                        style="background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-top: 8px;">
                  View Schedule
                </button>
              </div>
            \`;
            
            marker.bindPopup(popupContent);
            window.collectorMarkers.push(marker);
          }
        });
      `;
      webviewRef.current.injectJavaScript(script);
    }
  };

  // Function to update route smoothly
  const updateRoute = (route) => {
    if (webviewRef.current && mapInitialized) {
      const routeJson = JSON.stringify(route || []);
      const script = `
        // Clear existing route
        if (window.routePolyline) {
          window.routePolyline.remove();
        }

        // Draw new route
        const routeCoords = ${routeJson};
        if (routeCoords && routeCoords.length) {
          const latlngs = routeCoords.map(p => [p.latitude, p.longitude]);
          window.routePolyline = L.polyline(latlngs, { color: '#EC6135', weight: 5 }).addTo(window.map);
          window.map.fitBounds(window.routePolyline.getBounds(), { padding: [24, 24] });
        }
      `;
      webviewRef.current.injectJavaScript(script);
    }
  };

  // Function to calculate distance between two points
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  };

  // Function to calculate estimated arrival time
  const calculateEstimatedArrival = (collector, userLocation) => {
    if (!collector || !userLocation) return 'Calculating...';
    
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      collector.latitude,
      collector.longitude
    );
    
    // Assume average speed of 30 km/h in city traffic
    const averageSpeed = 30; // km/h
    const timeInHours = distance / averageSpeed;
    const timeInMinutes = Math.round(timeInHours * 60);
    
    if (timeInMinutes < 1) return 'Less than 1 min';
    if (timeInMinutes < 60) return `${timeInMinutes} mins`;
    
    const hours = Math.floor(timeInMinutes / 60);
    const minutes = timeInMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  // Function to determine pickup status
  const getPickupStatus = (collector, userLocation) => {
    if (!collector || !userLocation) return 'Loading...';
    
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      collector.latitude,
      collector.longitude
    );
    
    if (distance < 0.1) return 'Arrived'; // Less than 100m
    if (distance < 0.5) return 'Nearby'; // Less than 500m
    if (distance < 2) return 'On the way'; // Less than 2km
    return 'Scheduled';
  };

  // Function to fetch truck schedule for a specific collector
  const fetchTruckSchedule = async (collectorId) => {
    try {
      setSelectedTruckId(collectorId);
      
      // Fetch routes for this collector
      const routesRef = collection(db, 'routes');
      const routesSnapshot = await getDocs(routesRef);
      
      const collectorRoutes = [];
      routesSnapshot.forEach(doc => {
        const routeData = doc.data();
        if (routeData.driver === collectorId) {
          collectorRoutes.push({
            id: doc.id,
            ...routeData
          });
        }
      });

      // Sort routes by time
      collectorRoutes.sort((a, b) => {
        const timeA = a.time ? a.time.split(':').map(Number) : [0, 0];
        const timeB = b.time ? b.time.split(':').map(Number) : [0, 0];
        return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
      });

      setTruckSchedule(collectorRoutes);
    } catch (error) {
      console.error('Error fetching truck schedule:', error);
      setTruckSchedule([]);
    }
  };

  // Function to fetch pickup information from routes
  const fetchPickupInfo = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Get resident data to find their area/purok
      const residentRef = doc(db, 'residents', user.uid);
      const residentSnap = await getDoc(residentRef);
      
      if (!residentSnap.exists()) {
        setPickupInfo({
          type: 'No pickup scheduled',
          estimatedArrival: 'N/A',
          status: 'No data',
          nextCollector: null
        });
        return;
      }

      const residentData = residentSnap.data();
      const userPurok = residentData.purok || residentData.address || '';

      // Fetch routes collection to find pickup type for this area
      const routesRef = collection(db, 'routes');
      const routesSnapshot = await getDocs(routesRef);
      
      let pickupType = 'General Waste';
      let nextCollector = null;
      
      // Find route that matches user's area
      routesSnapshot.forEach(doc => {
        const routeData = doc.data();
        if (routeData.areas && routeData.areas.some(area => 
          area.toLowerCase().includes(userPurok.toLowerCase()) ||
          userPurok.toLowerCase().includes(area.toLowerCase())
        )) {
          pickupType = routeData.type || 'General Waste';
        }
      });

      // Find the nearest active collector
      const activeCollectors = getActiveCollectors();
      if (activeCollectors.length > 0) {
        // Find closest collector
        let closestCollector = activeCollectors[0];
        let minDistance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          activeCollectors[0].latitude,
          activeCollectors[0].longitude
        );

        activeCollectors.forEach(collector => {
          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            collector.latitude,
            collector.longitude
          );
          if (distance < minDistance) {
            minDistance = distance;
            closestCollector = collector;
          }
        });

        nextCollector = closestCollector;
      }

      // Calculate estimated arrival and status
      const estimatedArrival = calculateEstimatedArrival(nextCollector, userLocation);
      const status = getPickupStatus(nextCollector, userLocation);

      setPickupInfo({
        type: pickupType,
        estimatedArrival,
        status,
        nextCollector
      });

    } catch (error) {
      console.error('Error fetching pickup info:', error);
      setPickupInfo({
        type: 'Error loading data',
        estimatedArrival: 'N/A',
        status: 'Error',
        nextCollector: null
      });
    }
  };

  // 🔹 Fetch collectors initially
  useEffect(() => {
    const fetchCollectors = async () => {
      try {
        const { data, error } = await supabase.from('locations').select('*');
        if (error) throw error;

        // ✅ Keep only active drivers (last 30s)
        const activeDrivers = data.filter((d) => {
          const updatedAt = new Date(d.updated_at).getTime();
          return Date.now() - updatedAt < 30000;
        });

        setCollectors(activeDrivers);
      } catch (err) {
        console.error("Error fetching collectors:", err.message);
      }
    };

    fetchCollectors();
  }, []);

  // 🔹 Subscribe to collector location updates in realtime
  useEffect(() => {
    const channel = supabase
      .channel('realtime:locations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'locations' },
        (payload) => {
          const newDriver = payload.new;
          setCollectors((prev) => {
            const others = prev.filter((c) => c.collector_id !== newDriver.collector_id);

            // ✅ Check if still "active" before adding
            const updatedAt = new Date(newDriver.updated_at).getTime();
            if (Date.now() - updatedAt < 30000) {
              return [...others, newDriver];
            } else {
              return others;
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 🔹 Update collector markers when collectors data changes
  useEffect(() => {
    if (mapInitialized) {
      updateCollectorMarkers(getActiveCollectors());
    }
  }, [collectors, mapInitialized]);

  // 🔹 After location is resolved, fetch resident address + build route
  useEffect(() => {
    const fetchAndRoute = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const residentRef = doc(db, 'residents', user.uid);
        const residentSnap = await getDoc(residentRef);
        const address = residentSnap.exists() ? residentSnap.data()?.address || '' : '';
        if (!address) return;

        const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          address
        )}&limit=1`;
        const geocodeRes = await fetch(geocodeUrl, { headers: { Accept: 'application/json' } });
        const geocodeJson = await geocodeRes.json();
        if (!Array.isArray(geocodeJson) || geocodeJson.length === 0) return;

        const destLat = parseFloat(geocodeJson[0].lat);
        const destLng = parseFloat(geocodeJson[0].lon);
        const dest = { latitude: destLat, longitude: destLng };
        setDestination(dest);

        const from = location || defaultLocation;
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${from.longitude},${from.latitude};${destLng},${destLat}?overview=full&geometries=geojson`;
        const osrmRes = await fetch(osrmUrl);
        const osrmJson = await osrmRes.json();
        const coords = osrmJson?.routes?.[0]?.geometry?.coordinates || [];
        const mapped = coords.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
        setRouteCoords(mapped);
      } catch (e) {
        // fail silently
      }
    };

    if (hasLocationPermission && !isLoadingLocation && (location || defaultLocation)) {
      fetchAndRoute();
    }
  }, [hasLocationPermission, isLoadingLocation, location]);

  // 🔹 Update route when routeCoords changes
  useEffect(() => {
    if (mapInitialized && routeCoords.length > 0) {
      updateRoute(routeCoords);
    }
  }, [routeCoords, mapInitialized]);

  // 🔹 Update user location when location changes
  useEffect(() => {
    if (mapInitialized && location) {
      updateUserLocation(location.latitude, location.longitude);
    }
  }, [location, mapInitialized]);

  // 🔹 Fetch pickup info when component loads
  useEffect(() => {
    fetchPickupInfo();
  }, []);

  // 🔹 Update pickup info when collectors or location changes
  useEffect(() => {
    if (location) {
      fetchPickupInfo();
    }
  }, [collectors, location]);

  const userLocation = location || defaultLocation;

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setHasLocationPermission(true);
        getCurrentLocation();
        startLocationTracking(); // Start continuous tracking for smooth updates
      } else {
        setHasLocationPermission(false);
        setIsLoadingLocation(false);
        showLocationPermissionAlert();
      }
    } catch (error) {
      setIsLoadingLocation(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const newLocation = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setLocation(newLocation);
      setIsLoadingLocation(false);
    } catch (error) {
      setIsLoadingLocation(false);
    }
  };

  // Start continuous location tracking for smooth updates
  const startLocationTracking = async () => {
    try {
      await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 10 }, // every 3 sec or 10m
        (loc) => {
          const coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };
          setLocation(coords);
          setIsLoadingLocation(false);
        }
      );
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  };

  const showLocationPermissionAlert = () => {
    Alert.alert(
      'Location Permission Required',
      'Enable location services to view your position on the map.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Enable Location', onPress: requestLocationPermission },
      ]
    );
  };

  // 🔹 Only show collectors updated in last 2 minutes
  const getActiveCollectors = () => {
    const now = Date.now();
    return collectors.filter((c) => {
      if (!c.updated_at) return false;
      const diff = now - new Date(c.updated_at).getTime();
      return diff < 2 * 60 * 1000; // 2 minutes
    });
  };

  // Function to get status text style based on status
  const getStatusStyle = (status) => {
    switch (status) {
      case 'Arrived':
        return styles.arrived;
      case 'Nearby':
        return styles.nearby;
      case 'On the way':
        return styles.onTheWay;
      case 'Scheduled':
        return styles.scheduled;
      case 'Error':
        return styles.error;
      default:
        return styles.onTheWay;
    }
  };

  // Function to format time
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

  // 🔹 Stable map HTML that initializes once
  const getMapHtml = () => {
    return `<!doctype html>
      <html>
        <head>
          <meta name="viewport" content="initial-scale=1.0, width=device-width" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
          <style>
            html,body,#map{height:100%;margin:0;padding:0;}
            .leaflet-control-zoom { display: none !important; }
            .leaflet-control-attribution { font-size: 11px !important; opacity: 0.8; }
            .custom-icon {
              background: transparent;
              border: none;
            }
          </style>
        </head>
        <body>
          <div id="map" style="touch-action: none;"></div>
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <script>
            // Initialize map with default location
            window.map = L.map('map', { attributionControl: false, zoomControl: false }).setView([8.4542, 124.6319], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ attribution: '&copy; OpenStreetMap contributors' }).addTo(window.map);

            // Create user location marker
            window.userMarker = L.circleMarker([8.4542, 124.6319], { 
              radius: 8, 
              color: '#2E7D32', 
              fillColor: '#4CAF50', 
              fillOpacity: 0.8 
            }).addTo(window.map);

            // Initialize empty arrays for dynamic content
            window.collectorMarkers = [];
            window.routePolyline = null;

            // Signal that map is ready
            window.ReactNativeWebView.postMessage(JSON.stringify({type: 'mapReady'}));
          </script>
        </body>
      </html>`;
  };

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
                  // Set initial data when map is ready
                  if (location) {
                    updateUserLocation(location.latitude, location.longitude);
                  }
                  if (routeCoords.length > 0) {
                    updateRoute(routeCoords);
                  }
                  updateCollectorMarkers(getActiveCollectors());
                } else if (data.type === 'truckClicked') {
                  fetchTruckSchedule(data.collectorId);
                }
              } catch (e) {
                // Ignore parsing errors
              }
            }}
          />
        </View>
      ) : (
        <View style={[styles.placeholder, styles.mapContainer, { height: MAP_HEIGHT }]} />
      )}

      <TouchableOpacity 
        activeOpacity={0.9} 
        style={styles.floatingCard}
        onPress={fetchPickupInfo}
      >
        <Text style={styles.scheduleTitle}>
          Today&apos;s Pickup: <Text style={styles.locationText}>{pickupInfo.type}</Text>
        </Text>
        <Text style={styles.estimatedArrival}>
          Estimated Arrival: <Text style={styles.timeText}>{pickupInfo.estimatedArrival}</Text>
        </Text>
        <Text style={styles.statusText}>
          Status: <Text style={getStatusStyle(pickupInfo.status)}>{pickupInfo.status}</Text>
        </Text>
        {pickupInfo.nextCollector && (
          <Text style={styles.collectorInfo}>
            Driver ID: {pickupInfo.nextCollector.collector_id}
          </Text>
        )}
      </TouchableOpacity>

      {/* Truck Schedule Modal */}
      <Modal
        visible={truckSchedule !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTruckSchedule(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                🚛 Driver {selectedTruckId} Schedule
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setTruckSchedule(null)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.scheduleList}>
              {truckSchedule && truckSchedule.length > 0 ? (
                truckSchedule.map((route, index) => (
                  <View key={route.id || index} style={styles.scheduleItem}>
                    <View style={styles.scheduleTimeContainer}>
                      <Text style={styles.scheduleTime}>
                        {route.time ? formatTime(route.time) : 'TBD'}
                      </Text>
                      {route.endTime && (
                        <Text style={styles.scheduleEndTime}>
                          - {formatTime(route.endTime)}
                        </Text>
                      )}
                    </View>
                    <View style={styles.scheduleDetails}>
                      <Text style={styles.scheduleRoute}>
                        Route {route.route || 'N/A'}
                      </Text>
                      <Text style={styles.scheduleType}>
                        {route.type || 'General Waste'}
                      </Text>
                      {route.areas && route.areas.length > 0 && (
                        <Text style={styles.scheduleAreas}>
                          Areas: {route.areas.join(', ')}
                        </Text>
                      )}
                      {route.frequency && (
                        <Text style={styles.scheduleFrequency}>
                          {route.frequency}
                        </Text>
                      )}
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.noScheduleText}>
                  No schedule found for this driver
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapContainer: {
    marginHorizontal: 16,
    marginTop: 32,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  webview: { ...StyleSheet.absoluteFillObject },
  placeholder: { flex: 1, backgroundColor: '#f2f2f2' },
  floatingCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  scheduleTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4, color: '#000' },
  locationText: { fontWeight: '800', color: '#4CAF50' },
  estimatedArrival: { fontSize: 14, marginBottom: 4, color: '#000' },
  timeText: { fontWeight: '600', color: '#4CAF50' },
  statusText: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#000' },
  onTheWay: { color: '#4CAF50' },
  arrived: { color: '#FF6B35', fontWeight: 'bold' },
  nearby: { color: '#FFA726', fontWeight: 'bold' },
  scheduled: { color: '#9E9E9E' },
  error: { color: '#F44336' },
  collectorInfo: { fontSize: 12, color: '#666', marginBottom: 12, fontStyle: 'italic' },
  tapToRefresh: { fontSize: 10, color: '#999', textAlign: 'center', marginTop: 4 },
  ctaButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
  },
  ctaText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  scheduleList: {
    maxHeight: 400,
  },
  scheduleItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  scheduleTimeContainer: {
    width: 80,
    marginRight: 16,
  },
  scheduleTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  scheduleEndTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  scheduleDetails: {
    flex: 1,
  },
  scheduleRoute: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  scheduleType: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 4,
  },
  scheduleAreas: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  scheduleFrequency: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  noScheduleText: {
    textAlign: 'center',
    color: '#666',
    padding: 20,
    fontSize: 16,
  },
});
