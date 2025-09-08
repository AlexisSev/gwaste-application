
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../firebase';

export default function ResidentIndex() {
  const params = useLocalSearchParams();
  const [residentData, setResidentData] = useState(null);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const fetchCollectionSchedule = async () => {
      try {
        // Get routes that include the resident's area
        const routesQuery = query(collection(db, 'routes'));
        const routesSnapshot = await getDocs(routesQuery);
        
        const allPickups = [];
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
            
            // Check next 7 days for pickup schedule
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
        setScheduleData(nextPickup);
      } catch (error) {
        console.error('Error fetching collection schedule:', error);
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

          <View style={styles.scheduleCard}>
            <Text style={styles.scheduleTitle}>Collection Schedule:</Text>
                         <View style={styles.nextPickup}>
               <View style={styles.wasteTypeIcon}>
                 <Feather name="refresh-cw" size={24} color="#4CAF50" />
               </View>
               <View>
                <Text style={styles.pickupLabel}>Next Pickup</Text>
                <Text style={styles.pickupDate}>
                  {scheduleData ? `${scheduleData.date}, ${scheduleData.time}` : 'No pickup scheduled'}
                </Text>
                <Text style={styles.wasteType}>
                  {scheduleData ? scheduleData.type : 'N/A'}
                </Text>
              </View>
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
            <Text style={styles.mainScheduleTitle}>Collection Schedule:</Text>
            
            {/* Schedule Items */}
            <View style={styles.scheduleList}>
              <View style={styles.scheduleItem}>
                <Text style={styles.scheduleTime}>10:30 AM</Text>
                <Text style={styles.scheduleLocation}>Barangay Sambag</Text>
              </View>
              
              <View style={styles.scheduleItem}>
                <Text style={styles.scheduleTime}>11:30 AM</Text>
                <Text style={styles.scheduleLocation}>Barangay Gairan</Text>
              </View>
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
  scheduleTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    width: 90,
  },
  scheduleLocation: {
    fontSize: 16,
    color: '#1B5E20',
    flex: 1,
  }
});
