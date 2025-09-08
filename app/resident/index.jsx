import { FontAwesome5 } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../firebase';
//commenttttt
export default function ResidentIndex() {
  const params = useLocalSearchParams();
  const [residentData, setResidentData] = useState(null);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);

  useEffect(() => {
    const loadResidentData = async () => {
      try {
        // First check if we have data from params
        if (params.firstName && params.purok && params.address) {
          setResidentData({
            firstName: params.firstName,
            purok: params.purok,
            address: params.address
          });
          return;
        }

        // If no params, try to get data from Firebase
        const user = auth.currentUser;
        if (user) {
          const residentRef = doc(db, 'residents', user.uid);
          const residentSnap = await getDoc(residentRef);
          
          if (residentSnap.exists()) {
            setResidentData(residentSnap.data());
          }
        }
      } catch (error) {
        console.error('Error loading resident data:', error);
        Alert.alert('Error', 'Could not load resident data');
      }
    };

    if (!residentData) {
      loadResidentData();
    }
  }, [params.firstName, params.purok, params.address, residentData]);

  // Handle missing data case
  if (!residentData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text>Loading resident data...</Text>
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
            <FontAwesome5 name="map-marker-alt" size={20} color="#666" />
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
                <FontAwesome5 name="recycle" size={24} color="#4CAF50" />
              </View>
              <View>
                <Text style={styles.pickupLabel}>Next Pickup</Text>
                <Text style={styles.pickupDate}>July 10, 7:00 AM</Text>
                <Text style={styles.wasteType}>Biodegradable</Text>
              </View>
            </View>
          </View>

          <View style={styles.mapPreview}>
            {/* Map preview component would go here */}
            <View style={styles.truckInfo}>
              <Text style={styles.truckText}>Truck is</Text>
              <Text style={styles.truckDistance}>1km away</Text>
            </View>
            <TouchableOpacity style={styles.viewMapButton}>
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

      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/resident')}
        >
          <FontAwesome5 name="home" size={24} color="#4CAF50" />
          <Text style={[styles.navText, styles.activeNav]}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/resident/map')}
        >
          <FontAwesome5 name="map-marked-alt" size={24} color="#666" />
          <Text style={styles.navText}>Map</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/resident/schedule')}
        >
          <FontAwesome5 name="calendar-alt" size={24} color="#666" />
          <Text style={styles.navText}>Schedule</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/resident/categorize')}
        >
          <FontAwesome5 name="list" size={24} color="#666" />
          <Text style={styles.navText}>Categorize</Text>
        </TouchableOpacity>
      </View>
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
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navItem: {
    alignItems: 'center',
  },
  navText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  activeNav: {
    color: '#4CAF50',
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
