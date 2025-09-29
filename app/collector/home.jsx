/* eslint-disable react-hooks/exhaustive-deps */
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { AlertCircle, CheckCircle, MapPin } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useCollectorAuth } from '../../hooks/useCollectorAuthSupabase';
import { supabase } from '../../services/supabaseClient';

export default function LandingScreen() {
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  // Removed unused states: assignedRoutes, areasCollected (not displayed)
  const [todaysSchedule, setTodaysSchedule] = useState([]);
  const [routeNames, setRouteNames] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [collectedAreas, setCollectedAreas] = useState(new Set());
  const [locationPermission, setLocationPermission] = useState(false);
  const [collectedAreasLoaded, setCollectedAreasLoaded] = useState(false);
  const router = useRouter();
  const { collector, logout } = useCollectorAuth();

  const formatTime = (timeString) => {
    if (!timeString) return '';
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    // eslint-disable-next-line no-unused-vars
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

  // Request location permission
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermission(true);
        return true;
      } else {
        Alert.alert('Permission denied', 'Location permission is required for geofencing.');
        return false;
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  };

  // Get current location
  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCurrentLocation(location.coords);
      return location.coords;
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  };

  // Calculate distance between two coordinates (in meters)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  // Check if collector is within geofence of an area
  const checkGeofence = async (area, areaCoordinates) => {
    if (!currentLocation || !areaCoordinates) return false;
    
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      areaCoordinates.latitude,
      areaCoordinates.longitude
    );
    
    // Geofence radius of 100 meters
    return distance <= 100;
  };

  // Mark area as collected (append to areas_collected text[] for today's record)
  const markAreaAsCollected = async (area, routeNumber) => {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

      // 1) Fetch existing row for this collector and date
      const { data: existing, error: fetchErr } = await supabase
        .from('collections')
        .select('id, areas_collected')
        .eq('collector_id', collector?.id)
        .eq('collected_date', today)
        .maybeSingle();
      if (fetchErr && fetchErr.code !== 'PGRST116') throw fetchErr;

      if (!existing) {
        // 2) Insert a new row with this area
        const { error: insertErr } = await supabase
          .from('collections')
          .insert({
            collector_id: collector?.id,
            collector_name: collector?.firstName || collector?.driver,
            collected_date: today,
            areas_collected: [area],
            route_number: routeNumber,
            collected_at: new Date().toISOString(),
            location: currentLocation,
            status: 'completed',
            collectionType: 'manual',
            timestamp: Date.now()
          });
        if (insertErr) throw insertErr;
      } else {
        // 3) Update existing row, append if not present
        const current = Array.isArray(existing.areas_collected) ? existing.areas_collected : [];
        if (!current.includes(area)) {
          const updated = [...current, area];
          const { error: updateErr } = await supabase
            .from('collections')
            .update({ areas_collected: updated })
            .eq('id', existing.id);
          if (updateErr) throw updateErr;
        }
      }

      // Local UI updates
      setCollectedAreas(prev => new Set([...prev, area]));
      setTodaysSchedule(prev => 
        prev.map(item => 
          item.location === area 
            ? { ...item, collected: true, collectedAt: new Date().toISOString() }
            : item
        )
      );

      await notifyResidents(area, 'collected');

    } catch (error) {
      console.error('Error marking area as collected:', error);
    }
  };

  // Notify residents when truck enters/leaves geofence
  const notifyResidents = async (area, status) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          area: area,
          status: status,
          collector_id: collector?.id,
          timestamp: new Date().toISOString(),
          message: status === 'approaching' 
            ? `Waste collection truck is approaching ${area}` 
            : `Waste collection completed in ${area}`
        });
      if (error) throw error;
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  // Start location tracking
  const startLocationTracking = async () => {
    if (!locationPermission) {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) return;
    }

    // Get initial location
    await getCurrentLocation();

    // Start watching position
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000, // Check every 10 seconds
        distanceInterval: 10, // Check every 10 meters
      },
      async (location) => {
        setCurrentLocation(location.coords);
        
        // Check geofence for each area in today's schedule
        for (const scheduleItem of todaysSchedule) {
          if (!collectedAreas.has(scheduleItem.location)) {
            // For demo purposes, we'll use a mock coordinate
            // In real implementation, you'd get actual coordinates from your database
            const mockCoordinates = {
              latitude: 14.5995 + (Math.random() - 0.5) * 0.01,
              longitude: 120.9842 + (Math.random() - 0.5) * 0.01
            };
            
            const isInGeofence = await checkGeofence(scheduleItem.location, mockCoordinates);
            
            if (isInGeofence) {
              // Notify residents that truck is approaching
              await notifyResidents(scheduleItem.location, 'approaching');
              
              // Mark as collected after a short delay (simulating collection time)
              setTimeout(async () => {
                await markAreaAsCollected(scheduleItem.location, scheduleItem.routeNumber);
              }, 30000); // 30 seconds delay
            }
          }
        }
      }
    );

    return subscription;
  };

  // Load previously collected areas for today
  const loadCollectedAreas = async () => {
    try {
      if (!collector?.id) {
        setCollectedAreasLoaded(true);
        return;
      }
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('collections')
        .select('areas_collected')
        .eq('collector_id', collector.id)
        .eq('collected_date', today);
      if (error) throw error;

      if (!data || data.length === 0) {
        setCollectedAreas(new Set());
        setCollectedAreasLoaded(true);
        return;
      }
      
      // Aggregate all areas_collected arrays across rows (if multiple)
      const collectedSet = new Set();
      data.forEach(row => {
        const arr = Array.isArray(row.areas_collected) ? row.areas_collected : [];
        arr.forEach(a => { if (a) collectedSet.add(a); });
      });
      
      // Set the collected areas state
      setCollectedAreas(collectedSet);
      
      // Update the schedule items to show collected status
      setTodaysSchedule(prevSchedule => {
        return prevSchedule.map(item => {
          const isCollected = collectedSet.has(item.location);
          
          if (isCollected) {
            return {
              ...item,
              collected: true,
              collectedAt: new Date().toISOString()
            };
          }
          return item;
        });
      });
      
      setCollectedAreasLoaded(true);
      
    } catch (error) {
      console.error('Error loading collected areas:', error);
      setCollectedAreasLoaded(true);
    }
  };

  useEffect(() => {
    const fetchCollectorAndRoutes = async () => {
      if (collector) {
        try {
          setDisplayName(collector.driver || collector.firstName || '');
          const { data: routesData, error } = await supabase
            .from('routes')
            .select('*')
            .eq('driver', collector.driver);
          if (error) throw error;
          // assignedRoutes and areasCollected removed as they were unused in UI
          let scheduleList = [];
          let routeNameList = [];
          (routesData || []).forEach(data => {
            if (data.route) {
              routeNameList.push(`Route ${data.route}`);
            }
            if (data.time && data.areas && data.areas.length > 0) {
              // Generate time intervals for each area
              const timeIntervals = generateTimeIntervals(data.time, data.end_time, data.areas);
              
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
            // collected count omitted without a direct mapping table
          });
          scheduleList.sort((a, b) => new Date(`2000-01-01 ${a.time}`) - new Date(`2000-01-01 ${b.time}`));
          setTodaysSchedule(scheduleList);
          setRouteNames(routeNameList);
        } catch (e) {
          console.error('Error fetching collector data:', e);
          setDisplayName(collector.driver || collector.firstName || '');
          setTodaysSchedule([]);
          setRouteNames([]);
        }
      } else {
        setDisplayName('');
        setTodaysSchedule([]);
        setRouteNames([]);
      }
      setLoading(false);
    };
    fetchCollectorAndRoutes();
  }, [collector]);

  useEffect(() => {
    if (!collector) {
      router.replace('/login');
    } else {
      // Reset collected areas loaded state when collector changes
      setCollectedAreasLoaded(false);
      setCollectedAreas(new Set());
    }
  }, [collector, router]);

  // Load collected areas when schedule is loaded
  useEffect(() => {
    if (collector && todaysSchedule.length > 0 && !collectedAreasLoaded) {
      loadCollectedAreas();
    }
  }, [collector, todaysSchedule, collectedAreasLoaded]);

  // Start location tracking when component mounts
  useEffect(() => {
    if (collector && todaysSchedule.length > 0) {
      startLocationTracking();
    }
  }, [collector, todaysSchedule]);

  // Manual collection button handler
  const handleManualCollection = async (area, routeNumber) => {
    Alert.alert(
      'Mark as Collected',
      `Are you sure you want to mark ${area} as collected?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Collected',
          onPress: async () => {
            await markAreaAsCollected(area, routeNumber);
            Alert.alert('Success', `${area} has been marked as collected and saved to database!`);
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    setShowDropdown(false);
    Alert.alert(
      "Logout Confirmation",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace('/login');
          }
        }
      ]
    );
  };

  if (!collector) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Gwaste</Text>
          <View style={styles.truckIcon}>
            <Text style={styles.truckEmoji}>🚛</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.profileContainer} onPress={() => setShowDropdown(v => !v)}>
          <View style={styles.profileCircle}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face' }}
              style={styles.profileImage}
            />
            <View style={styles.onlineIndicator} />
          </View>
        </TouchableOpacity>
        {showDropdown && (
          <View style={styles.dropdownMenu}>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => { setShowDropdown(false); router.push('/collector/profile'); }}>
              <Text style={styles.dropdownText}>My Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => { setShowDropdown(false); router.push('/collector/settings'); }}>
              <Text style={styles.dropdownText}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem} onPress={handleLogout}>
              <Text style={styles.dropdownText}>Logout</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.greetingSection}>
          {loading ? (
            <ActivityIndicator size="small" color="#8BC500" />
          ) : (
            <Text style={styles.greeting}>
              Good Morning{displayName ? `, ${displayName}` : ''}! Ready to collect?
            </Text>
          )}
          <View style={styles.routeInfo}>
            <AlertCircle size={16} color="#FF4444" />
            <Text style={styles.routeText}>
              {loading
                ? '...'
                : routeNames.length > 0
                  ? routeNames.join(', ')
                  : 'No Route Assigned'}
            </Text>
          </View>
        </View>

        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Action</Text>
          <View style={styles.quickActionGrid}>
            <View style={styles.quickActionCard}>
              <Home size={24} color="#458A3D" />
              <Text style={styles.quickActionNumber}>{loading ? '-' : assignedRoutes}</Text>
              <Text style={styles.quickActionLabel}>Assigned Routes</Text>
            </View>
            <View style={styles.quickActionCard}>
              <MapPin size={24} color="#458A3D" />
              <Text style={styles.quickActionNumber}>{loading ? '-' : areasCollected}</Text>
              <Text style={styles.quickActionLabel}>Areas Collected</Text>
            </View>
          </View>
        </View> */}


        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today`s Schedule:</Text>
          <View style={styles.scheduleList}>
            {todaysSchedule.length === 0 ? (
              <Text style={{ color: '#888', padding: 8 }}>No schedule for today.</Text>
            ) : !collectedAreasLoaded ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#458A3D" />
                <Text style={styles.loadingText}>Loading collection status...</Text>
              </View>
            ) : (
              todaysSchedule.map((item, idx) => {
                const isCollected = item.collected || collectedAreas.has(item.location);
                return (
                  <TouchableOpacity 
                    style={[
                      styles.scheduleItem, 
                      isCollected && styles.scheduleItemCollected
                    ]} 
                    key={idx}
                    onPress={() => !isCollected && handleManualCollection(item.location, item.routeNumber)}
                    disabled={isCollected}
                  >
                    <View style={styles.scheduleTimeContainer}>
                      <Text style={[
                        styles.scheduleTime,
                        isCollected && styles.scheduleTimeCollected
                      ]}>
                        {formatTime(item.time)} - {formatTime(item.endTime)}
                      </Text>
                      <Text style={[
                        styles.scheduleRoute,
                        isCollected && styles.scheduleRouteCollected
                      ]}>
                        Route {item.routeNumber}
                      </Text>
                      {item.areaIndex && (
                        <Text style={[
                          styles.areaIndex,
                          isCollected && styles.areaIndexCollected
                        ]}>
                          Area {item.areaIndex}
                        </Text>
                      )}
                    </View>
                    <View style={styles.scheduleLocationContainer}>
                      <View style={styles.locationHeader}>
                        <Text style={[
                          styles.scheduleLocation,
                          isCollected && styles.scheduleLocationCollected
                        ]}>
                          {item.location}
                        </Text>
                        {isCollected && (
                          <View style={styles.collectedIndicator}>
                            <CheckCircle size={20} color="#2E7D32" />
                            <Text style={styles.collectedText}>Collected</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[
                        styles.scheduleType,
                        isCollected && styles.scheduleTypeCollected
                      ]}>
                        {item.type}
                      </Text>
                      {item.frequency && (
                        <Text style={[
                          styles.scheduleFrequency,
                          isCollected && styles.scheduleFrequencyCollected
                        ]}>
                          {item.frequency}
                        </Text>
                      )}
                      {isCollected && item.collectedAt && (
                        <Text style={styles.collectedTime}>
                          Collected at: {new Date(item.collectedAt).toLocaleTimeString()}
                        </Text>
                      )}
                    </View>
                    {!isCollected && (
                      <View style={styles.collectionButton}>
                        <MapPin size={16} color="#458A3D" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e0e0e0', position: 'absolute', top: 0, left: 0, right: 0,
    zIndex: 1000, elevation: 5,
  },
  scrollView: { flex: 1, marginTop: 81 },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoText: { fontSize: 24, fontWeight: 'bold', color: '#458A3D' },
  truckIcon: { marginLeft: 8 },
  truckEmoji: { fontSize: 20 },
  profileContainer: { position: 'relative' },
  profileCircle: {
    width: 45, height: 45, borderRadius: 22.5, borderWidth: 2, borderColor: '#8BC500', overflow: 'hidden', backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center',
  },
  profileImage: { width: '100%', height: '100%', borderRadius: 20 },
  onlineIndicator: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#4CAF50', borderWidth: 2, borderColor: '#fff' },
  greetingSection: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff' },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  routeInfo: { flexDirection: 'row', alignItems: 'center' },
  routeText: { fontSize: 14, color: '#666', marginLeft: 4 },
  section: { paddingHorizontal: 20, paddingVertical: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#458A3D', marginBottom: 12 },
  quickActionGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  quickActionCard: { width: '48%', backgroundColor: '#E3F2E8', padding: 16, borderRadius: 12, alignItems: 'center' },
  quickActionNumber: { fontSize: 32, fontWeight: 'bold', color: '#458A3D', marginTop: 8 },
  quickActionLabel: { fontSize: 12, color: '#666', marginTop: 4, textAlign: 'center' },
  scheduleList: { gap: 8 },
  scheduleItem: { 
    backgroundColor: '#E8F5E8', 
    borderRadius: 12, 
    padding: 16, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  scheduleItemCollected: {
    backgroundColor: '#2E7D32',
    borderColor: '#1B5E20'
  },
  scheduleTimeContainer: { flexDirection: 'column', alignItems: 'flex-start', marginRight: 16, minWidth: 110 },
  scheduleTime: { fontSize: 14, color: '#458A3D', fontWeight: 'bold', marginBottom: 2 },
  scheduleTimeCollected: { color: '#E8F5E8' },
  scheduleRoute: { fontSize: 12, color: '#666', marginTop: 2, fontWeight: '500' },
  scheduleRouteCollected: { color: '#C8E6C9' },
  areaIndex: { fontSize: 10, color: '#888', marginTop: 1, fontStyle: 'italic' },
  areaIndexCollected: { color: '#A5D6A7' },
  scheduleLocationContainer: { flex: 1, alignItems: 'flex-start' },
  locationHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    width: '100%',
    marginBottom: 4
  },
  scheduleLocation: { fontSize: 16, color: '#333', textAlign: 'left', fontWeight: '500', flex: 1 },
  scheduleLocationCollected: { color: '#E8F5E8' },
  collectedIndicator: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#E8F5E8', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 12,
    marginLeft: 8
  },
  collectedText: { 
    fontSize: 12, 
    color: '#2E7D32', 
    fontWeight: 'bold', 
    marginLeft: 4 
  },
  scheduleType: { fontSize: 14, color: '#666', marginBottom: 2 },
  scheduleTypeCollected: { color: '#C8E6C9' },
  scheduleFrequency: { fontSize: 12, color: '#666', fontStyle: 'italic' },
  scheduleFrequencyCollected: { color: '#A5D6A7' },
  collectedTime: { 
    fontSize: 11, 
    color: '#E8F5E8', 
    fontStyle: 'italic', 
    marginTop: 4 
  },
  collectionButton: { 
    justifyContent: 'center', 
    alignItems: 'center', 
    width: 40, 
    height: 40, 
    backgroundColor: '#E8F5E8', 
    borderRadius: 20,
    marginLeft: 8
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginVertical: 8
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14
  },
  dropdownMenu: { position: 'absolute', top: 60, right: 0, backgroundColor: '#fff', borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5, zIndex: 2000, minWidth: 150 },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#eee' },
  dropdownText: { fontSize: 16, color: '#333' },
});


