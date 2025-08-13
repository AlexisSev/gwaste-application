import { useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { AlertCircle, Home, MapPin } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../../firebase';
import { useCollectorAuth } from '../../hooks/useCollectorAuth';

export default function LandingScreen() {
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [assignedRoutes, setAssignedRoutes] = useState(0);
  const [areasCollected, setAreasCollected] = useState(0);
  const [todaysSchedule, setTodaysSchedule] = useState([]);
  const [routeNames, setRouteNames] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();
  const { collector, logout } = useCollectorAuth();

  // Helper function to convert 24-hour format to 12-hour format with AM/PM
  const formatTime = (timeString) => {
    if (!timeString) return '';
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (error) {
      return timeString; // Return original if parsing fails
    }
  };

  useEffect(() => {
    const fetchCollectorAndRoutes = async () => {
      if (collector) {
        try {
          setDisplayName(collector.driver || collector.firstName || '');
          
          // Fetch assigned routes for this collector using driver field
          const routesQuery = query(collection(db, 'routes'), where('driver', '==', collector.driver));
          const routesSnapshot = await getDocs(routesQuery);
          setAssignedRoutes(routesSnapshot.size);
          
          // Process route data for schedule and areas
          let collectedCount = 0;
          let scheduleList = [];
          let routeNameList = [];
          
          routesSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            
            // Add route to route names
            if (data.route) {
              routeNameList.push(`Route ${data.route}`);
            }
            
            // Create schedule entry from route data
            if (data.time && data.areas && data.areas.length > 0) {
              const scheduleEntry = {
                time: data.time,
                endTime: data.endTime,
                location: data.areas.join(', '),
                routeNumber: data.route,
                type: data.type || 'Waste Collection',
                frequency: data.frequency,
                dayOff: data.dayOff
              };
              scheduleList.push(scheduleEntry);
            }
            
            // Count collected areas if available
            if (data.collectedAreas) {
              collectedCount += data.collectedAreas.filter(a => a.driver === collector.driver).length;
            }
          });
          
          // Sort schedule by time
          scheduleList.sort((a, b) => {
            const timeA = new Date(`2000-01-01 ${a.time}`);
            const timeB = new Date(`2000-01-01 ${b.time}`);
            return timeA - timeB;
          });
          
          setAreasCollected(collectedCount);
          setTodaysSchedule(scheduleList);
          setRouteNames(routeNameList);
        } catch (e) {
          console.error('Error fetching collector data:', e);
          setDisplayName(collector.driver || collector.firstName || '');
          setAssignedRoutes(0);
          setAreasCollected(0);
          setTodaysSchedule([]);
          setRouteNames([]);
        }
      } else {
        setDisplayName('');
        setAssignedRoutes(0);
        setAreasCollected(0);
        setTodaysSchedule([]);
        setRouteNames([]);
      }
      setLoading(false);
    };
    fetchCollectorAndRoutes();
  }, [collector]);

  const handleLogout = async () => {
    setShowDropdown(false);
    await logout();
    router.replace('/login');
  };

  // If no collector is authenticated, redirect to login
  if (!collector) {
    router.replace('/login');
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
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
            <TouchableOpacity style={styles.dropdownItem} onPress={() => { setShowDropdown(false); router.push('/profile'); }}>
              <Text style={styles.dropdownText}>My Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => { setShowDropdown(false); router.push('/settings'); }}>
              <Text style={styles.dropdownText}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem} onPress={handleLogout}>
              <Text style={styles.dropdownText}>Logout</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Scrollable Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Greeting and Route Info */}
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

        {/* Quick Actions */}
        <View style={styles.section}>
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
        </View>

        {/* Next Scheduled Stop */}
        <View style={styles.section}>
          <View style={styles.nextStopCard}>
            <View style={styles.nextStopInfo}>
              <Text style={styles.nextStopLabel}>Next Scheduled Stop:</Text>
              <Text style={styles.nextStopLocation}>
                {todaysSchedule.length > 0 ? todaysSchedule[0].location : 'No more stops'}
              </Text>
              <Text style={styles.nextStopTime}>
                {todaysSchedule.length > 0 ? `${formatTime(todaysSchedule[0].time)} - ${formatTime(todaysSchedule[0].endTime) || 'End Time'} • Route ${todaysSchedule[0].routeNumber}` : ''}
              </Text>
            </View>
            <View style={styles.timeCircle}>
              <Text style={styles.timeText}>
                {todaysSchedule.length > 0 ? 'UP NEXT' : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Today's Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Schedule:</Text>
          <View style={styles.scheduleList}>
            {todaysSchedule.length === 0 ? (
              <Text style={{ color: '#888', padding: 8 }}>No schedule for today.</Text>
            ) : (
              todaysSchedule.map((item, idx) => (
                <View style={styles.scheduleItem} key={idx}>
                  <View style={styles.scheduleTimeContainer}>
                    <Text style={styles.scheduleRoute}>Route {item.routeNumber}</Text>
                  </View>
                  <View style={styles.scheduleLocationContainer}>
                    <Text style={styles.scheduleLocation}>{item.location}</Text>
                    <Text style={styles.scheduleType}>{item.type}</Text>
                    {item.frequency && (
                      <Text style={styles.scheduleFrequency}>{item.frequency}</Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 5,
  },
  scrollView: {
    flex: 1,
    marginTop: 81, // Height of header (20 + 16 + 45)
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#458A3D',
  },
  truckIcon: {
    marginLeft: 8,
  },
  truckEmoji: {
    fontSize: 20,
  },
  profileContainer: {
    position: 'relative',
  },
  profileCircle: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    borderWidth: 2,
    borderColor: '#8BC500',
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  greetingSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#458A3D',
    marginBottom: 12,
  },
  quickActionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: '#E3F2E8',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  quickActionNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#458A3D',
    marginTop: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  nextStopCard: {
    backgroundColor: '#458A3D',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextStopInfo: {
    flex: 1,
  },
  nextStopLabel: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
  },
  nextStopLocation: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  nextStopTime: {
    fontSize: 16,
    color: '#fff',
  },
  timeCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#8BC500',
    textAlign: 'center',
  },
  scheduleList: {
    gap: 8,
  },
  scheduleItem: {
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    minHeight: 80,
  },
  scheduleTimeContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginRight: 16,
    minWidth: 80,
  },
  scheduleTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  scheduleEndTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  scheduleRoute: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  scheduleLocationContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  scheduleLocation: {
    fontSize: 16,
    color: '#333',
    textAlign: 'left',
    marginBottom: 4,
    fontWeight: '500',
  },
  scheduleType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  scheduleFrequency: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 60,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 2000,
    minWidth: 150,
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
}); 