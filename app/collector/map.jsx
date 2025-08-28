import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { db } from '../../firebase';
import { useCollectorAuth } from '../../hooks/useCollectorAuth';

const { width } = Dimensions.get('window');

export default function MapScreen() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const { collector } = useCollectorAuth();

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

  useEffect(() => { fetchDriverRoutes(); }, [collector]);

  const fetchDriverRoutes = async () => {
    if (!collector) return;
    try {
      setLoading(true);
      const routesRef = collection(db, 'routes');
      const q = query(routesRef, where('driver', '==', collector.driver));
      const querySnapshot = await getDocs(q);
      const routesData = [];
      querySnapshot.forEach((doc) => { routesData.push({ id: doc.id, ...doc.data() }); });
      setRoutes(routesData);
      if (routesData.length > 0) setSelectedRoute(routesData[0]);
    } catch (error) {
      console.error('Error fetching routes:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderMarkers = () => {
    if (!selectedRoute) return null;
    const markers = [];
    markers.push(
      <Marker key="city-hall" coordinate={{ latitude: 11.046419171933303, longitude: 123.97920466105226 }} title="Bogo City Hall">
        <Text style={{ fontSize: 32 }}>🚛</Text>
      </Marker>
    );
    if (selectedRoute.coordinates && Array.isArray(selectedRoute.coordinates)) {
      selectedRoute.coordinates.forEach((coord, index) => {
        if (coord && (coord.latitude || coord.lat) && (coord.longitude || coord.lng)) {
          markers.push(
            <Marker
              key={`area-${index}`}
              coordinate={{ latitude: coord.latitude || coord.lat, longitude: coord.longitude || coord.lng }}
              title={selectedRoute.areas && selectedRoute.areas[index] ? selectedRoute.areas[index] : `Area ${index + 1}`}
              pinColor="#458A3D"
            />
          );
        }
      });
    }
    return markers;
  };

  const renderRouteLine = () => {
    if (!selectedRoute || !selectedRoute.coordinates) return null;
    let coordinates = [];
    if (Array.isArray(selectedRoute.coordinates)) {
      coordinates = selectedRoute.coordinates
        .filter(coord => coord && (coord.latitude || coord.lat) && (coord.longitude || coord.lng))
        .map(coord => ({ latitude: coord.latitude || coord.lat, longitude: coord.longitude || coord.lng }));
    } else if (typeof selectedRoute.coordinates === 'object') {
      coordinates = Object.values(selectedRoute.coordinates)
        .filter(coord => coord && (coord.latitude || coord.lat) && (coord.longitude || coord.lng))
        .map(coord => ({ latitude: coord.latitude || coord.lat, longitude: coord.longitude || coord.lng }));
    }
    coordinates.unshift({ latitude: 11.046419171933303, longitude: 123.97920466105226 });
    if (coordinates.length < 2) return null;
    return <Polyline coordinates={coordinates} strokeColor="#458A3D" strokeWidth={4} lineDashPattern={[8, 4]} zIndex={1} />;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}><Text style={styles.routeTitle}>Loading Routes...</Text></View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#458A3D" />
          <Text style={styles.loadingText}>Fetching your assigned routes...</Text>
        </View>
      </View>
    );
  }

  if (!collector) {
    return (
      <View style={styles.container}>
        <View style={styles.header}><Text style={styles.routeTitle}>Not Logged In</Text></View>
        <View style={styles.loadingContainer}><Text style={styles.loadingText}>Please log in to view your routes</Text></View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.routeTitle}>
          {selectedRoute ? `Route ${selectedRoute.route} - ${selectedRoute.type || 'Waste Collection'}` : 'No Routes Assigned'}
        </Text>
        <TouchableOpacity><Text style={styles.allRoutes}>All Routes</Text></TouchableOpacity>
      </View>
      <MapView
        style={styles.map}
        initialRegion={{ latitude: 11.046419171933303, longitude: 123.97920466105226, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
        showsUserLocation={false}
      >
        {renderMarkers()}
        {renderRouteLine()}
      </MapView>
      {selectedRoute && (
        <View style={styles.bottomCard}>
          <Text style={styles.timeText}>{formatTime(selectedRoute.time)} — {formatTime(selectedRoute.endTime) || 'End Time'}</Text>
          <Text style={styles.barangayText}>{selectedRoute.areas && selectedRoute.areas.length > 0 ? selectedRoute.areas.join(' • ') : 'Areas to collect'}</Text>
          <Text style={styles.frequencyText}>{selectedRoute.frequency || 'Schedule'} • {selectedRoute.dayOff ? `Day off: ${selectedRoute.dayOff}` : ''}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badge}><Text style={styles.badgeText}>{selectedRoute.type || 'Waste Collection'}</Text></View>
            {selectedRoute.color && (<View style={[styles.colorBadge, { backgroundColor: selectedRoute.color }]}><Text style={styles.colorBadgeText}>Route {selectedRoute.route}</Text></View>)}
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.collectButton}><Text style={styles.collectButtonText}>Mark as Collected</Text></TouchableOpacity>
            <TouchableOpacity style={styles.issueButton}><Text style={styles.issueButtonText}>Report Issue</Text></TouchableOpacity>
          </View>
        </View>
      )}
      {routes.length > 1 && (
        <View style={styles.routeSelector}>
          <Text style={styles.selectorTitle}>Select Route:</Text>
          <View style={styles.routeButtons}>
            {routes.map((route) => (
              <TouchableOpacity key={route.id} style={[styles.routeButton, selectedRoute?.id === route.id && styles.routeButtonActive]} onPress={() => setSelectedRoute(route)}>
                <Text style={[styles.routeButtonText, selectedRoute?.id === route.id && styles.routeButtonTextActive]}>Route {route.route}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 10, backgroundColor: '#fff', zIndex: 2 },
  routeTitle: { fontSize: 18, fontWeight: '600', color: '#222', flex: 1 },
  allRoutes: { fontSize: 15, color: '#007AFF', fontWeight: '500' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666', textAlign: 'center' },
  map: { flex: 1, width: '100%', borderRadius: 18, marginBottom: 0, overflow: 'hidden' },
  bottomCard: { position: 'absolute', bottom: 0, left: 0, width: width, backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8 },
  timeText: { fontSize: 18, fontWeight: '600', color: '#222', marginBottom: 2 },
  barangayText: { fontSize: 16, color: '#222', marginBottom: 4, fontWeight: '600' },
  frequencyText: { fontSize: 13, color: '#888', marginBottom: 8 },
  badgeRow: { flexDirection: 'row', marginBottom: 16 },
  badge: { backgroundColor: '#e6f9e6', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginRight: 8 },
  badgeText: { color: '#34C759', fontWeight: '500', fontSize: 13 },
  colorBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  colorBadgeText: { color: '#fff', fontWeight: '500', fontSize: 13 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  collectButton: { backgroundColor: '#458A3D', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 18, flex: 1, marginRight: 10, alignItems: 'center' },
  collectButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  issueButton: { backgroundColor: '#f2f2f2', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 18, flex: 1, alignItems: 'center' },
  issueButtonText: { color: '#222', fontWeight: '600', fontSize: 16 },
  routeSelector: { position: 'absolute', top: 120, left: 20, right: 20, backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  selectorTitle: { fontSize: 16, fontWeight: '600', color: '#222', marginBottom: 12 },
  routeButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  routeButton: { backgroundColor: '#f2f2f2', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  routeButtonActive: { backgroundColor: '#458A3D' },
  routeButtonText: { fontSize: 14, fontWeight: '500', color: '#666' },
  routeButtonTextActive: { color: '#fff' },
});


