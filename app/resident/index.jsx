
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../firebase';

export default function ResidentIndex() {
  const params = useLocalSearchParams();
  const [residentData, setResidentData] = useState(null);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [todaysSchedule, setTodaysSchedule] = useState([]);
  const [collectedAreas, setCollectedAreas] = useState(new Set());
  const [notifications, setNotifications] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);

  const formatTime = (timeString) => {
    if (!timeString) return '';
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (_error) {
      return timeString;
    }
  };

  // Load collection status for today
  const loadCollectionStatus = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get collections for today
      const collectionsQuery = query(
        collection(db, 'collections'),
        where('collectedDate', '==', today)
      );
      
      const collectionsSnapshot = await getDocs(collectionsQuery);
      const collectedSet = new Set();
      
      collectionsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.area) {
          collectedSet.add(data.area);
        }
      });
      
      setCollectedAreas(collectedSet);
      
      // Update schedule items with collection status
      setTodaysSchedule(prevSchedule => 
        prevSchedule.map(item => ({
          ...item,
          collected: collectedSet.has(item.location),
          collectedAt: collectedSet.has(item.location) ? new Date().toISOString() : null
        }))
      );
      
    } catch (error) {
      console.error('Error loading collection status:', error);
    }
  };

  // Load notifications for the resident's area
  const loadNotifications = async () => {
    try {
      if (!residentData?.purok) return;
      
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('area', '==', residentData.purok),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      
      const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
        const notificationList = [];
        snapshot.forEach(doc => {
          notificationList.push({
            id: doc.id,
            ...doc.data()
          });
        });
        setNotifications(notificationList);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  // Generate time intervals for schedule (similar to collector)
  const generateTimeIntervals = (startTime, endTime, areas) => {
    if (!startTime || !endTime || !areas || areas.length === 0) return [];
    
    try {
      const start = new Date(`2000-01-01 ${startTime}`);
      const end = new Date(`2000-01-01 ${endTime}`);
      const totalMinutes = (end - start) / (1000 * 60);
      
      const intervalMinutes = Math.max(60, Math.min(90, Math.floor(totalMinutes / areas.length)));
      
      const intervals = [];
      let currentTime = new Date(start);
      
      areas.forEach((area, index) => {
        const intervalEnd = new Date(currentTime.getTime() + intervalMinutes * 60000);
        
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

  useEffect(() => {
    const fetchCollectionSchedule = async () => {
      try {
        setScheduleLoading(true);
        // Get routes that include the resident's area
        const routesQuery = query(collection(db, 'routes'));
        const routesSnapshot = await getDocs(routesQuery);
        
        const allPickups = [];
        const todaySchedule = [];
        const today = new Date();
        
        routesSnapshot.forEach(docSnap => {
          const data = docSnap.data();
          console.log('Route data:', data);
          console.log('Route areas:', data.areas);
          console.log('Resident purok:', residentData?.purok);
          
          // Check if this route includes the resident's area
          if (data.areas && data.areas.some(area => 
            area && (
              area.toLowerCase().includes('malata') || 
              area.toLowerCase().includes(residentData?.purok?.toLowerCase() || '') ||
              data.type?.toLowerCase().includes('malata')
            )
          )) {
            console.log('Found matching route:', data);
            const frequency = data.frequency?.toLowerCase() || '';
            
            // Check if today is scheduled
            const todayDayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
            const isTodayScheduled = frequency.includes(todayDayName) || 
                                   frequency.includes('daily') || 
                                   frequency.includes('every day') ||
                                   frequency.includes('every ' + todayDayName) ||
                                   (frequency.includes('weekday') && today.getDay() >= 1 && today.getDay() <= 5);
            
            // Generate today's schedule with time intervals
            if (isTodayScheduled && data.time && data.areas) {
              const timeIntervals = generateTimeIntervals(data.time, data.endTime, data.areas);
              
              timeIntervals.forEach(interval => {
                const scheduleEntry = {
                  time: interval.startTime,
                  endTime: interval.endTime,
                  location: interval.area,
                  routeNumber: data.route,
                  type: data.type || 'Waste Collection',
                  frequency: data.frequency,
                  dayOff: data.dayOff,
                  areaIndex: interval.index,
                  collected: false,
                  collectedAt: null
                };
                todaySchedule.push(scheduleEntry);
              });
            }
            
            // Check next 7 days for pickup schedule (for next pickup display)
            for (let i = 0; i < 7; i++) {
              const checkDate = new Date(today);
              checkDate.setDate(today.getDate() + i);
              const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
              
              const isScheduled = frequency.includes(dayName) || 
                                frequency.includes('daily') || 
                                frequency.includes('every day') ||
                                frequency.includes('every ' + dayName) ||
                                (frequency.includes('weekday') && checkDate.getDay() >= 1 && checkDate.getDay() <= 5);
              
              if (isScheduled && data.time) {
                allPickups.push({
                  time: formatTime(data.time),
                  rawTime: data.time,
                  date: checkDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
                  fullDate: checkDate,
                  location: data.areas.join(', '),
                  type: data.type || 'Biodegradable',
                  routeNumber: data.route,
                  daysDiff: i
                });
              }
            }
          }
        });
        
        // Sort today's schedule by time
        todaySchedule.sort((a, b) => new Date(`2000-01-01 ${a.time}`) - new Date(`2000-01-01 ${b.time}`));
        setTodaysSchedule(todaySchedule);
        
        // Sort by date and time, get the earliest upcoming pickup
        allPickups.sort((a, b) => {
          if (a.daysDiff !== b.daysDiff) return a.daysDiff - b.daysDiff;
          const timeA = new Date(`2000-01-01 ${a.rawTime}`);
          const timeB = new Date(`2000-01-01 ${b.rawTime}`);
          return timeA - timeB;
        });
        
        const nextPickup = allPickups.length > 0 ? allPickups[0] : null;
        console.log('All pickups found:', allPickups);
        console.log('Next pickup selected:', nextPickup);
        console.log('Today schedule:', todaySchedule);
        setScheduleData(nextPickup);
        setScheduleLoading(false);
      } catch (error) {
        console.error('Error fetching collection schedule:', error);
        setScheduleLoading(false);
      }
    };

    const loadResidentData = async () => {
      try {
        setLoading(true);
        // First check if we have data from params
        if (params.firstName && params.purok && params.address) {
          setResidentData({
            firstName: params.firstName,
            purok: params.purok,
            address: params.address
          });
        } else {
          // If no params, try to get data from Firebase
          const user = auth.currentUser;
          if (user) {
            const residentRef = doc(db, 'residents', user.uid);
            const residentSnap = await getDoc(residentRef);
            
            if (residentSnap.exists()) {
              setResidentData(residentSnap.data());
            }
          }
        }
        
        // Fetch collection schedule data
        await fetchCollectionSchedule();
      } catch (error) {
        console.error('Error loading resident data:', error);
        Alert.alert('Error', 'Could not load resident data');
      } finally {
        setLoading(false);
      }
    };

    loadResidentData();
  }, [params.firstName, params.purok, params.address, residentData?.purok]);

  // Load collection status when schedule is available
  useEffect(() => {
    if (todaysSchedule.length > 0) {
      loadCollectionStatus();
    }
  }, [todaysSchedule]);

  // Load notifications when resident data is available
  useEffect(() => {
    let unsubscribe;
    if (residentData?.purok) {
      loadNotifications().then(unsub => {
        unsubscribe = unsub;
      });
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [residentData?.purok]);

  // Handle loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handleLogout = () => {
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
            try {
              await signOut(auth);
              router.push('/login');
            } catch (error) {
              console.error('Error signing out:', error);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/images/logo.png')} 
            style={styles.logo}
          />
        </View>
        <TouchableOpacity 
          style={styles.profileContainer}
          onPress={() => setIsDropdownVisible(!isDropdownVisible)}
        >
          <Image 
            source={require('../../assets/images/icon.png')} 
            style={styles.profilePic}
          />
        </TouchableOpacity>
      </View>

      {isDropdownVisible && (
        <View style={styles.dropdownMenu}>
          <TouchableOpacity style={styles.dropdownItem}>
            <Text style={styles.dropdownText}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dropdownItem}>
            <Text style={styles.dropdownText}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dropdownItem} onPress={handleLogout}>
            <Text style={styles.dropdownText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.greeting}>
            {getGreeting()} {residentData?.firstName || 'Resident'}!
          </Text>
                     <View style={styles.locationContainer}>
             <Feather name="map-pin" size={20} color="#666" />
             <View style={styles.addressContainer}>
              <Text style={styles.purok}>
                {residentData?.purok || 'Loading...'}
              </Text>
              <Text style={styles.location}>
                {residentData?.address || 'Loading...'}
              </Text>
            </View>
          </View>


          <View style={styles.mapPreview}>
            {/* Map preview component would go here */}
            <View style={styles.truckInfo}>
              <Text style={styles.truckText}>Truck is</Text>
              <Text style={styles.truckDistance}>1km away</Text>
            </View>
            <TouchableOpacity style={styles.viewMapButton} onPress={() => router.push('/resident/map')}>
              <Text style={styles.viewMapText}>View on Map</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.scheduleContainer}>
            <Text style={styles.mainScheduleTitle}>Today's Schedule:</Text>
            
            {/* Schedule Items */}
            <View style={styles.scheduleList}>
              {scheduleLoading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading today's schedule...</Text>
                </View>
              ) : todaysSchedule.length === 0 ? (
                <Text style={styles.noScheduleText}>No collection scheduled for today.</Text>
              ) : (
                todaysSchedule.map((item, idx) => {
                  const isCollected = item.collected || collectedAreas.has(item.location);
                  return (
                    <View 
                      style={[
                        styles.scheduleItem, 
                        isCollected && styles.scheduleItemCollected
                      ]} 
                      key={idx}
                    >
                      <View style={styles.scheduleTimeContainer}>
                        <Text style={[
                          styles.scheduleTime,
                          isCollected && styles.scheduleTimeCollected
                        ]}>
                          {formatTime(item.time)} - {formatTime(item.endTime)}
                        </Text>
                        <Text style={[
                          styles.estimatedTime,
                          isCollected && styles.estimatedTimeCollected
                        ]}>
                          Est. {Math.round((new Date(`2000-01-01 ${item.endTime}`) - new Date(`2000-01-01 ${item.time}`)) / (1000 * 60))} mins
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
                              <Text style={styles.collectedText}>✓ Collected</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[
                          styles.scheduleType,
                          isCollected && styles.scheduleTypeCollected
                        ]}>
                          {item.type}
                        </Text>
                        {isCollected && item.collectedAt && (
                          <Text style={styles.collectedTime}>
                            Collected at: {new Date(item.collectedAt).toLocaleTimeString()}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    padding: 17,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  logoContainer: {
    height: 40,
  },
  logo: {
    height: 40,
    width: 80,
    resizeMode: 'contain',
  },
  profileContainer: {
    position: 'relative'
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  scrollView: {
    flex: 1,
    marginTop: 4,
    backgroundColor: '#f8f9fa'
  },
  content: {
    flex: 1,
    padding: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  addressContainer: {
    marginLeft: 8,
  },
  purok: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  location: {
    fontSize: 16,
    color: '#666',
  },
  scheduleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  scheduleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 16,
  },
  nextPickup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wasteTypeIcon: {
    marginRight: 16,
  },
  pickupLabel: {
    fontSize: 14,
    color: '#666',
  },
  pickupDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  wasteType: {
    fontSize: 14,
    color: '#4CAF50',
  },
  mapPreview: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  truckInfo: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  truckText: {
    fontSize: 16,
    color: '#666',
  },
  truckDistance: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 4,
  },
  viewMapButton: {
    backgroundColor: '#4CAF50',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewMapText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  dropdownMenu: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 2000,
    minWidth: 150
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  dropdownText: {
    fontSize: 16,
    color: '#333'
  },
  scheduleContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mainScheduleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 16,
  },
  scheduleList: {
    gap: 12,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 8,
  },
  scheduleTimeContainer: {
    width: 90,
    flexDirection: 'column',
  },
  scheduleTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  estimatedTime: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  scheduleLocation: {
    fontSize: 16,
    color: '#1B5E20',
    flex: 1,
  },
  // New styles for Today's Schedule functionality
  scheduleItemCollected: {
    backgroundColor: '#2E7D32',
    borderColor: '#1B5E20'
  },
  scheduleTimeCollected: { 
    color: '#E8F5E8' 
  },
  estimatedTimeCollected: { 
    color: '#C8E6C9' 
  },
  areaIndex: { 
    fontSize: 10, 
    color: '#888', 
    marginTop: 1, 
    fontStyle: 'italic' 
  },
  areaIndexCollected: { 
    color: '#A5D6A7' 
  },
  scheduleLocationContainer: { 
    flex: 1, 
    alignItems: 'flex-start' 
  },
  locationHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    width: '100%',
    marginBottom: 4
  },
  scheduleLocationCollected: { 
    color: '#E8F5E8' 
  },
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
    fontWeight: 'bold' 
  },
  scheduleType: { 
    fontSize: 14, 
    color: '#666', 
    marginBottom: 2 
  },
  scheduleTypeCollected: { 
    color: '#C8E6C9' 
  },
  collectedTime: { 
    fontSize: 11, 
    color: '#E8F5E8', 
    fontStyle: 'italic', 
    marginTop: 4 
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
  noScheduleText: {
    color: '#888',
    padding: 20,
    textAlign: 'center',
    fontStyle: 'italic'
  }
});
