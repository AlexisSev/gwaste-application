import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

const AREAS = [
  // { name: 'Gairan', coords: { latitude: 10.750, longitude: 123.850 } },
  // { name: 'Don Pedro', coords: { latitude: 10.755, longitude: 123.855 } },
  // { name: 'Polambato', coords: { latitude: 10.760, longitude: 123.860 } },
  // { name: 'Cayang', coords: { latitude: 10.765, longitude: 123.865 } },
  // { name: 'Taylayan', coords: { latitude: 10.770, longitude: 123.870 } },
  // ...add more areas as needed
];

const { width } = Dimensions.get('window');

export default function MapScreen() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.routeTitle}>Route 1 – Barangay San Isidro</Text>
        <TouchableOpacity>
          <Text style={styles.allRoutes}>All Routes</Text>
        </TouchableOpacity>
      </View>
      {/* Map Area */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 11.046419171933303,
          longitude: 123.97920466105226,
          latitudeDelta: 0.01, // Zoom in closer to city hall
          longitudeDelta: 0.01,
        }}
        showsUserLocation={false}
      >
        {/* Bogo City Hall Marker with Truck Emoji */}
        <Marker
          coordinate={{ latitude: 11.046419171933303, longitude: 123.97920466105226 }}
          title="Bogo City Hall"
        >
          <Text style={{ fontSize: 32 }}>🚛</Text>
        </Marker>
        {AREAS.map(area => (
          <Marker
            key={area.name}
            coordinate={area.coords}
            title={area.name}
          />
        ))}
      </MapView>
      {/* Bottom Card */}
      <View style={styles.bottomCard}>
        <Text style={styles.timeText}>7:00 AM — Public Market</Text>
        <Text style={styles.barangayText}>Barangay 3</Text>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Biodegradable</Text>
          </View>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.collectButton}>
            <Text style={styles.collectButtonText}>Mark as Collected</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.issueButton}>
            <Text style={styles.issueButtonText}>Report Issue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: '#fff',
    zIndex: 2,
  },
  routeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },
  allRoutes: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
  },
  map: {
    flex: 1,
    width: '100%',
    borderRadius: 18,
    // Remove marginTop: 10,
    marginBottom: 0,
    overflow: 'hidden',
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: width,
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  timeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    marginBottom: 2,
  },
  barangayText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  badge: {
    backgroundColor: '#e6f9e6',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
  },
  badgeText: {
    color: '#34C759',
    fontWeight: '500',
    fontSize: 13,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  collectButton: {
    backgroundColor: '#458A3D',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  collectButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  issueButton: {
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    flex: 1,
    alignItems: 'center',
  },
  issueButtonText: {
    color: '#222',
    fontWeight: '600',
    fontSize: 16,
  },
});
