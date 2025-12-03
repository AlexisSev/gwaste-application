/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */

import { Feather, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableFloatingButton from '../../components/DraggableFloatingButton';
import { useResidentAuth } from '../../hooks/useResidentAuth';
import { supabase } from '../../services/supabaseClient';
import { responsiveFontSize } from '../../utils/responsive';

export default function ResidentIndex() {
  const { resident, loading: authLoading } = useResidentAuth();
  const [residentData, setResidentData] = useState(null);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [todaysSchedule, setTodaysSchedule] = useState([]);
  const [collectedAreas, setCollectedAreas] = useState(new Set());
  const [notifications, setNotifications] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [nearestDistanceKm, setNearestDistanceKm] = useState(null);
  const [distanceLoading, setDistanceLoading] = useState(true);

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

  // Calculate estimated time for resident's area
  const getEstimatedTimeForArea = (scheduleData, residentPurok) => {
    if (!scheduleData || !residentPurok) return null;
    
    try {
      // Find today's schedule for the resident's area
      const todayEntry = todaysSchedule.find(entry => 
        entry.location && entry.location.toLowerCase().includes(residentPurok.toLowerCase())
      );
      
      if (todayEntry) {
        return {
          startTime: formatTime(todayEntry.time),
          endTime: formatTime(todayEntry.endTime),
          timeRange: `${formatTime(todayEntry.time)} - ${formatTime(todayEntry.endTime)}`
        };
      }
      
      // If no specific time found, use the fixed schedule start time
      return {
        startTime: formatTime('07:00'),
        endTime: formatTime('15:00'),
        timeRange: `${formatTime('07:00')} - ${formatTime('15:00')}`
      };
    } catch (error) {
      console.error('Error calculating estimated time:', error);
      return null;
    }
  };

  // Load collection status for today
  const loadCollectionStatus = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: collections, error } = await supabase
        .from('collections')
        .select('areas_collected, collected_at')
        .eq('collected_date', today);
      if (error) throw error;
      const collectedSet = new Set();
      const collectedAtByArea = new Map();
      (collections || []).forEach(row => {
        const arr = Array.isArray(row.areas_collected) ? row.areas_collected : [];
        const ts = row.collected_at || (row.timestamp ? new Date(Number(row.timestamp)).toISOString() : null);
        arr.forEach(area => {
          if (area) {
            collectedSet.add(area);
            if (ts && !collectedAtByArea.has(area)) collectedAtByArea.set(area, ts);
          }
        });
      });
      
      setCollectedAreas(collectedSet);
      
      // Update schedule items with collection status
      setTodaysSchedule(prevSchedule => 
        prevSchedule.map(item => {
          const isCollected = collectedSet.has(item.location);
          if (!isCollected) {
            return { ...item, collected: false, collectedAt: null };
          }
          // Preserve existing collectedAt if already set; otherwise use value from DB map
          const existing = item.collectedAt || null;
          const fromDb = collectedAtByArea.get(item.location) || null;
          return { ...item, collected: true, collectedAt: existing || fromDb };
        })
      );
      
    } catch (error) {
      const rawMessage = typeof error?.message === 'string' ? error.message : String(error);
      const looksLikeHtml = rawMessage.trim().startsWith('<!');
      const friendlyMessage = looksLikeHtml
        ? 'Unexpected response from server while loading collection status.'
        : rawMessage;
      console.warn('Error loading collection status:', friendlyMessage);
    }
  };

  // Load notifications for the resident by user_id using RPC function to bypass RLS
  const loadNotifications = async () => {
    try {
      const residentId = resident?.id;
      if (!residentId) {
        console.log('⚠️ No resident ID available for loading notifications');
        return;
      }
      
      console.log('📬 Loading notifications for resident:', residentId);
      
      // Try RPC function first (bypasses RLS)
      let data = null;
      let error = null;
      
      try {
        const result = await supabase.rpc('get_resident_notifications', {
          p_user_id: residentId,
          p_limit: 50
        });
        data = result.data;
        error = result.error;
      } catch (rpcError) {
        console.warn('⚠️ RPC function not available, trying direct query:', rpcError);
        // Fallback to direct query (may be blocked by RLS)
        const result = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', residentId)
          .order('created_at', { ascending: false })
          .limit(50);
        data = result.data;
        error = result.error;
      }
      
      if (error) {
        console.error('❌ Error loading notifications:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        // If RLS error, suggest running the migration
        if (error.code === 'PGRST202' || error.message?.includes('schema cache')) {
          console.error('💡 Tip: Make sure to run the migration: 20250130_create_get_notifications_function.sql');
        }
        throw error;
      }
      
      const list = (data || []).map(n => ({ ...n }));
      console.log(`✅ Loaded ${list.length} notifications for resident`);
      if (list.length > 0) {
        console.log('📋 Sample notification:', list[0]);
      }
      setNotifications(list);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
    }
  };

  // Calculate distance in kilometers between two coordinates
  const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Get active collectors (updated within last 2 minutes)
  const getActiveCollectors = (collectors) => {
    const now = Date.now();
    return (collectors || []).filter(c => {
      if (!c?.updated_at) return false;
      const diff = now - new Date(c.updated_at).getTime();
      return diff < 2 * 60 * 1000;
    });
  };

  // Fetch collectors and compute nearest distance to user
  const updateNearestTruckDistance = async (currentLoc) => {
    try {
      const { data, error } = await supabase.from('trucklocation').select('*');
      if (error) throw error;
      const active = getActiveCollectors(data);
      if (!currentLoc || active.length === 0) {
        setNearestDistanceKm(null);
        setDistanceLoading(false);
        return;
      }
      let minKm = Infinity;
      active.forEach(c => {
        if (c.latitude && c.longitude) {
          const km = calculateDistanceKm(currentLoc.latitude, currentLoc.longitude, c.latitude, c.longitude);
          if (km < minKm) minKm = km;
        }
      });
      setNearestDistanceKm(Number.isFinite(minKm) ? minKm : null);
    } catch (_e) {
      setNearestDistanceKm(null);
    } finally {
      setDistanceLoading(false);
    }
  };

  // Request location permission and get current location
  useEffect(() => {
    const initLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setHasLocationPermission(false);
          setDistanceLoading(false);
          return;
        }
        setHasLocationPermission(true);
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { latitude: current.coords.latitude, longitude: current.coords.longitude };
        setUserLocation(coords);
        updateNearestTruckDistance(coords);
      } catch (_e) {
        setDistanceLoading(false);
      }
    };
    initLocation();
  }, []);

  // Periodically refresh nearest distance (every 20s)
  useEffect(() => {
    if (!hasLocationPermission || !userLocation) return;
    const id = setInterval(() => {
      updateNearestTruckDistance(userLocation);
    }, 20000);
    return () => clearInterval(id);
  }, [hasLocationPermission, userLocation]);

  const handleEnableLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setHasLocationPermission(false);
        return;
      }
      setHasLocationPermission(true);
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      setUserLocation(coords);
      setDistanceLoading(true);
      updateNearestTruckDistance(coords);
    } catch (_e) {
      // ignore
    }
  };

  // Generate time intervals for schedule (fixed 7:00 AM - 3:00 PM)
  const generateTimeIntervals = (areas) => {
    if (!areas || areas.length === 0) return [];
    
    try {
      // Fixed schedule: 7:00 AM - 3:00 PM (8 hours = 480 minutes)
      const start = new Date(`2000-01-01 07:00`);
      const end = new Date(`2000-01-01 15:00`);
      const totalMinutes = 480; // 8 hours
      
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
        startTime: '07:00',
        endTime: '15:00',
        index: index + 1
      }));
    }
  };

  useEffect(() => {
    const fetchCollectionSchedule = async () => {
      try {
        setScheduleLoading(true);
        const { data: routes, error } = await supabase.from('routes').select('*');
        if (error) throw error;
        
        const allPickups = [];
        const todaySchedule = [];
        const today = new Date();
        const residentPurok = resident?.purok || residentData?.purok || '';
        const residentAddress = resident?.resident_address || resident?.address || residentData?.address || '';
        
        (routes || []).forEach(data => {
          // console.log('Route data:', data);
          // console.log('Route areas:', data.areas);
          // console.log('Resident purok:', residentPurok);
          // console.log('Resident address:', residentAddress);
          
          // Check if this route includes the resident's area based on purok or address
          const matchesArea = data.areas && data.areas.some(area => {
            if (!area) return false;
            const areaLower = area.toLowerCase();
            const purokLower = residentPurok.toLowerCase();
            const addressLower = residentAddress.toLowerCase();
            
            // Match by purok
            if (purokLower && areaLower.includes(purokLower)) return true;
            // Match by address (check if any part of address matches area)
            if (addressLower && areaLower.includes(addressLower)) return true;
            // Match by address (check if address contains area name)
            if (addressLower && addressLower.includes(areaLower)) return true;
            // Match by malata keyword
            if (areaLower.includes('malata') || data.type?.toLowerCase().includes('malata')) return true;
            
            return false;
          });
          
          if (matchesArea) {
            // console.log('Found matching route:', data);
            const frequency = data.frequency?.toLowerCase() || '';
            
            // Check if today is scheduled
            const todayDayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
            const isTodayScheduled = frequency.includes(todayDayName) || 
                                   frequency.includes('daily') || 
                                   frequency.includes('every day') ||
                                   frequency.includes('every ' + todayDayName) ||
                                   (frequency.includes('weekday') && today.getDay() >= 1 && today.getDay() <= 5);
            
            // Generate today's schedule with time intervals
            if (isTodayScheduled && data.areas) {
              const timeIntervals = generateTimeIntervals(data.areas);
              
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
                  collectedAt: null,
                  driver: data.driver || null
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
              
              if (isScheduled) {
                allPickups.push({
                  time: formatTime('07:00'),
                  rawTime: '07:00',
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
        
        // Find the best matching route based on resident address
        let bestMatchingRoute = null;
        if (residentAddress || residentPurok) {
          // Find route that best matches the resident's address or purok
          const addressLower = (residentAddress || '').toLowerCase().trim();
          const purokLower = (residentPurok || '').toLowerCase().trim();
          
          const matchingRoutes = (routes || []).filter(route => {
            if (!route.areas || !Array.isArray(route.areas)) return false;
            return route.areas.some(area => {
              if (!area) return false;
              const areaLower = String(area).toLowerCase().trim();
              
              // Exact match (highest priority)
              if (addressLower && (areaLower === addressLower || areaLower === purokLower)) return true;
              if (purokLower && areaLower === purokLower) return true;
              
              // Contains match (medium priority)
              if (addressLower && (areaLower.includes(addressLower) || addressLower.includes(areaLower))) return true;
              if (purokLower && (areaLower.includes(purokLower) || purokLower.includes(areaLower))) return true;
              
              return false;
            });
          });
          
          // If we found matching routes, prioritize by exact match, then by route number
          if (matchingRoutes.length > 0) {
            // Sort: exact matches first, then by route number
            bestMatchingRoute = matchingRoutes.sort((a, b) => {
              const aHasExactMatch = a.areas.some(area => {
                const areaLower = String(area).toLowerCase().trim();
                return areaLower === addressLower || areaLower === purokLower;
              });
              const bHasExactMatch = b.areas.some(area => {
                const areaLower = String(area).toLowerCase().trim();
                return areaLower === addressLower || areaLower === purokLower;
              });
              
              if (aHasExactMatch && !bHasExactMatch) return -1;
              if (!aHasExactMatch && bHasExactMatch) return 1;
              
              const routeA = parseInt(a.route) || 0;
              const routeB = parseInt(b.route) || 0;
              return routeA - routeB;
            })[0];
          }
        }
        
        const nextPickup = allPickups.length > 0 ? allPickups[0] : null;
        
        // If we found a better matching route based on address, update the route number
        if (nextPickup && bestMatchingRoute) {
          nextPickup.routeNumber = bestMatchingRoute.route;
        } else if (nextPickup && !nextPickup.routeNumber) {
          // Fallback: try to find route from allPickups that matches the address
          const addressBasedRoute = allPickups.find(pickup => {
            // Check if this pickup's location matches the resident's address
            const pickupLocation = (pickup.location || '').toLowerCase();
            const addressLower = (residentAddress || '').toLowerCase();
            const purokLower = (residentPurok || '').toLowerCase();
            return pickupLocation.includes(addressLower) || 
                   pickupLocation.includes(purokLower) ||
                   addressLower.includes(pickupLocation) ||
                   purokLower.includes(pickupLocation);
          });
          
          if (addressBasedRoute && addressBasedRoute.routeNumber) {
            nextPickup.routeNumber = addressBasedRoute.routeNumber;
          }
        }
        
        // console.log('All pickups found:', allPickups);
        // console.log('Next pickup selected:', nextPickup);
        // console.log('Today schedule:', todaySchedule);
        // console.log('Best matching route:', bestMatchingRoute);
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

        // Load resident data from auth context
        if (resident) {
          const data = {
            firstName: resident.first_name || '',
            purok: resident.purok || '',
            address: resident.resident_address || resident.address || ''
          };
          setResidentData(data);
        
          // Fetch collection schedule data after setting resident data
        await fetchCollectionSchedule();
        } else {
          console.log('No resident data available');
        }
      } catch (error) {
        console.error('Error loading resident data:', error);
        Alert.alert('Error', 'Could not load resident data');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && resident) {
    loadResidentData();
    } else if (!authLoading && !resident) {
      setLoading(false);
      console.log('Auth completed but no resident found');
    }
  }, [resident, authLoading]);

  // Update residentData when resident changes (for profile updates)
  useEffect(() => {
    if (resident && !loading) {
      const data = {
        firstName: resident.first_name || '',
        purok: resident.purok || '',
        address: resident.resident_address || resident.address || ''
      };
      setResidentData(data);
    }
  }, [resident?.first_name, resident?.purok, resident?.resident_address, resident?.address]);

  // Load collection status when schedule is available
  useEffect(() => {
    if (todaysSchedule.length > 0) {
      loadCollectionStatus();
    }
  }, [todaysSchedule]);

  // Load notifications when resident is available
  useEffect(() => {
    if (resident?.id) {
      loadNotifications();
      
      // Set up real-time subscription for new notifications
      const channel = supabase
        .channel('notifications_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${resident.id}`
          },
          (payload) => {
            console.log('🔔 New notification received:', payload.new);
            // Reload notifications when a new one is inserted
            loadNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [resident?.id]);

  // Handle loading state
  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Handle no resident data
  if (!resident && !authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>No resident data found</Text>
          <TouchableOpacity 
            style={styles.viewDetailsButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.viewDetailsText}>Go to Login</Text>
          </TouchableOpacity>
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

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const nextPickupDateString = scheduleData?.fullDate
    ? new Date(scheduleData.fullDate).toDateString()
    : null;

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + index);
    const dateString = date.toDateString();
    return {
      key: date.toISOString(),
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dateNumber: date.getDate(),
      isToday: dateString === today.toDateString(),
      isPickup: nextPickupDateString ? dateString === nextPickupDateString : false,
    };
  });

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
          onPress: () => router.push('/login')
        }
      ]
    );
  };

  const handleNotificationPress = () => {
    const unreadCount = notifications?.filter(n => !n.is_read)?.length || 0;
    
    if (!notifications?.length) {
      Alert.alert('Notifications', 'You are all caught up!');
      return;
    }
    
    // Show notifications list
    const unreadNotifications = notifications.filter(n => !n.is_read);
    const readNotifications = notifications.filter(n => n.is_read);
    
    if (unreadNotifications.length === 0) {
      Alert.alert('Notifications', 'You have no new notifications.');
      return;
    }
    
    // Create a formatted list of notifications
    const notificationList = unreadNotifications
      .slice(0, 5)
      .map((notif, idx) => {
        const date = notif.created_at ? new Date(notif.created_at).toLocaleString() : 'Just now';
        return `${idx + 1}. ${notif.title}\n   ${notif.message}\n   ${date}`;
      })
      .join('\n\n');
    
    const moreText = unreadNotifications.length > 5 
      ? `\n\n...and ${unreadNotifications.length - 5} more notification${unreadNotifications.length - 5 > 1 ? 's' : ''}`
      : '';
    
    Alert.alert(
      `Notifications (${unreadCount} new)`,
      notificationList + moreText,
      [
        {
          text: 'Mark All as Read',
          onPress: async () => {
            // Mark all unread notifications as read
            const unreadIds = unreadNotifications.map(n => n.notification_id);
            if (unreadIds.length > 0) {
              const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .in('notification_id', unreadIds);
              
              if (!error) {
                loadNotifications(); // Reload to update the badge
              }
            }
          }
        },
        { text: 'OK' }
      ]
    );
  };
  
  // Calculate unread notification count
  const unreadNotificationCount = notifications?.filter(n => !n.is_read)?.length || 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/images/logo.png')} 
            style={styles.logo}
          />
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={handleNotificationPress}
            activeOpacity={0.85}
          >
            <Ionicons name="notifications-outline" size={22} color="#8BC500" />
            {unreadNotificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.profileContainer}
            onPress={() => setIsDropdownVisible(!isDropdownVisible)}
          >
            <Image 
              source={resident?.profile_image_base64 ? { uri: resident.profile_image_base64 } : require('../../assets/images/icon.png')}
              style={styles.profilePic}
            />
          </TouchableOpacity>
        </View>
      </View>

      {isDropdownVisible && (
        <View style={styles.dropdownMenu}>
          <TouchableOpacity 
            style={styles.dropdownItem}
            onPress={() => {
              setIsDropdownVisible(false);
              router.push('/resident/profile');
            }}
          >
            <Text style={styles.dropdownText}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.dropdownItem}
            onPress={() => {
              setIsDropdownVisible(false);
              router.push('/resident/settings');
            }}
          >
            <Text style={styles.dropdownText}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dropdownItem} onPress={handleLogout}>
            <Text style={styles.dropdownText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <Text style={styles.greeting}>
              {getGreeting()}, {residentData?.firstName || 'Resident'}!
            </Text>
            <View style={styles.locationContainer}>
              <Feather name="map-pin" size={16} color="#8BC500" />
              <Text style={styles.address}>
                {residentData?.address || 'Loading...'}
              </Text>
            </View>
          </View>

          {/* Next Collection Card */}
          <View style={styles.nextCollectionCard}>
            <View style={styles.nextCollectionContent}>
              <View style={styles.nextCollectionInfo}>
                <Text style={styles.nextCollectionTitle}>Next Collection</Text>
                <Text style={styles.nextCollectionDetails}>
                  {(() => {
                    if (!scheduleData?.time) return 'No collection scheduled';
                    
                    const now = new Date();
                    const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes
                    
                    const estimatedTime = getEstimatedTimeForArea(scheduleData, resident?.purok || residentData?.purok);
                    
                    // If it's today's collection
                    if (scheduleData?.daysDiff === 0) {
                      if (estimatedTime) {
                        // Parse estimated end time to check if collection has passed
                        const endTimeStr = estimatedTime.endTime || estimatedTime.startTime;
                        const [endHour, endMinute] = endTimeStr.split(':').map(Number);
                        const endTimeMinutes = endHour * 60 + endMinute;
                        
                        // If current time is past the estimated collection end time, show next scheduled day
                        if (currentTime > endTimeMinutes) {
                          // Find next collection day
                          const nextDay = new Date(now);
                          nextDay.setDate(nextDay.getDate() + 1);
                          const dayName = nextDay.toLocaleDateString('en-US', { weekday: 'long' });
                          return `Tomorrow (${dayName}), ${estimatedTime.timeRange}`;
                        }
                        
                        return `Today, ${estimatedTime.timeRange}`;
                      } else {
                        // Parse regular schedule time
                        const [scheduleHour, scheduleMinute] = scheduleData.time.split(':').map(Number);
                        const scheduleTimeMinutes = scheduleHour * 60 + scheduleMinute;
                        
                        if (currentTime > scheduleTimeMinutes + 480) { // 8 hours collection window
                          const nextDay = new Date(now);
                          nextDay.setDate(nextDay.getDate() + 1);
                          const dayName = nextDay.toLocaleDateString('en-US', { weekday: 'long' });
                          return `Tomorrow (${dayName}), ${formatTime(scheduleData.time)}`;
                        }
                        
                        return `Today, ${formatTime(scheduleData.time)}`;
                      }
                    }
                    
                    // If it's a future day
                    if (scheduleData?.daysDiff === 1) {
                      return estimatedTime ? 
                        `Tomorrow, ${estimatedTime.timeRange}` : 
                        `Tomorrow, ${formatTime(scheduleData.time)}`;
                    }
                    
                    // For days beyond tomorrow
                    const futureDate = new Date(now);
                    futureDate.setDate(futureDate.getDate() + scheduleData.daysDiff);
                    const dayName = futureDate.toLocaleDateString('en-US', { weekday: 'long' });
                    
                    return estimatedTime ? 
                      `${dayName}, ${estimatedTime.timeRange}` : 
                      `${dayName}, ${formatTime(scheduleData.time)}`;
                  })()}
                </Text>
                <TouchableOpacity 
                  style={styles.viewDetailsButton}
                  onPress={() => router.push('/resident/schedule')}
                >
                  <Text style={styles.viewDetailsText}>View Details</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.nextCollectionIcon}>
                <Feather name="calendar" size={24} color="#8BC500" />
              </View>
            </View>
          </View>

        {/* Weekly Calendar */}
        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <View>
              <Text style={styles.calendarMonth}>
                {today.toLocaleDateString('en-US', { month: 'long' })}
              </Text>
              <Text style={styles.calendarYear}>{today.getFullYear()}</Text>
            </View>
          </View>
          <View style={styles.calendarWeekRow}>
            {weekDays.map((day) => (
              <View key={day.key} style={styles.calendarDay}>
                <Text
                  style={[
                    styles.calendarDayLabel,
                    day.isToday && styles.calendarDayLabelToday,
                  ]}
                >
                  {day.label}
                </Text>
                <View
                  style={[
                    styles.calendarDateBubble,
                    day.isPickup && !day.isToday && styles.calendarDateBubblePickup,
                    day.isToday && styles.calendarDateBubbleToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.calendarDateText,
                      day.isToday && styles.calendarDateTextToday,
                    ]}
                  >
                    {day.dateNumber}
                  </Text>
                  {day.isPickup && day.isToday && (
                    <View style={styles.calendarPickupDot} />
                  )}
                </View>
              </View>
            ))}
          </View>
          {scheduleData && (
            <Text style={styles.calendarFooter}>
              Next pickup on {scheduleData.date} • Route {scheduleData.routeNumber || '—'}
            </Text>
          )}
        </View>

          {/* Feature Cards Grid */}
          <View style={styles.featureCardsGrid}>
            {/* Truck Location Card */}
            <TouchableOpacity 
              style={styles.featureCard}
              onPress={() => router.push('/resident/map')}
            >
              <View style={styles.featureIconContainer}>
                <Feather name="map-pin" size={20} color="#8BC500" />
              </View>
              <Text style={styles.featureTitle}>Truck Location</Text>
              <Text style={styles.featureDescription}>Live tracking</Text>
            </TouchableOpacity>

            {/* Announcements Card */}
            

            {/* Eco Tip Card */}
            <TouchableOpacity 
              style={styles.featureCard}
              onPress={() => router.push('/resident/categorize')}
            >
              <View style={styles.featureIconContainer}>
                <Feather name="globe" size={20} color="#8BC500" />
              </View>
              <Text style={styles.featureTitle}>Eco Tip</Text>
              <Text style={styles.featureDescription}>Recycle plastic bottles</Text>
            </TouchableOpacity>
          </View>

          {/* Report Concern Button */}
          {/* <TouchableOpacity style={styles.reportConcernButton}>
            <Text style={styles.reportConcernText}>Report a Concern</Text>
          </TouchableOpacity> */}
        </View>
      </ScrollView>
      
      {/* Draggable Floating Chatbot Button */}
      <DraggableFloatingButton
        onPress={() => router.push('/resident/GwasteChatbot')}
        icon="robot"
        iconSize={24}
        iconColor="#ffffff"
        backgroundColor="#8BC500"
      />
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F6EF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  profileContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
  },
  profilePic: {
    width: '100%',
    height: '100%',
    borderRadius: 17,
  },
  scrollView: {
    flex: 1,
    marginTop: 4,
    backgroundColor: '#f8f9fa'
  },
  scrollContent: {
    paddingBottom: 100,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  greeting: {
    fontSize: responsiveFontSize(24),
    fontWeight: 'bold',
    color: '#0f0f0f',
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
    fontSize: responsiveFontSize(18),
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
    marginRight: 12,
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
    lineHeight: 22,
    marginBottom: 2,
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
    marginBottom: 16,
  },
  // New Homepage Styles
  headerSection: {
    marginBottom: 24,
  },
  nextCollectionCard: {
    backgroundColor: '#E8F5E8',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nextCollectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nextCollectionInfo: {
    flex: 1,
  },
  nextCollectionTitle: {
    fontSize: responsiveFontSize(24),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  nextCollectionDetails: {
    fontSize: 16,
    color: '#8BC500',
    marginBottom: 8,
    fontWeight: '500',
  },
  estimatedTimeText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  viewDetailsButton: {
    backgroundColor: '#8BC500',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  viewDetailsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  nextCollectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarMonth: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  calendarYear: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  calendarLink: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#E8F5E8',
  },
  calendarLinkText: {
    color: '#2F855A',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calendarDay: {
    flex: 1,
    alignItems: 'center',
  },
  calendarDayLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  calendarDayLabelToday: {
    color: '#2F855A',
    fontWeight: '600',
  },
  calendarDateBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  calendarDateBubbleToday: {
    backgroundColor: '#2F855A',
  },
  calendarDateBubblePickup: {
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#F6AD55',
  },
  calendarDateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  calendarDateTextToday: {
    color: '#fff',
  },
  calendarFooter: {
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 8,
  },
  calendarPickupDot: {
    position: 'absolute',
    bottom: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FBBF24',
  },
  featureCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  featureCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  announcementIcon: {
    backgroundColor: '#FFF3E0',
  },
  featureTitle: {
    fontSize: responsiveFontSize(16),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  // reportConcernButton: {
  //   backgroundColor: '#FF4444',
  //   paddingVertical: 16,
  //   borderRadius: 12,
  //   alignItems: 'center',
  //   shadowColor: '#000',
  //   shadowOffset: {
  //     width: 0,
  //     height: 2,
  //   },
  //   shadowOpacity: 0.1,
  //   shadowRadius: 4,
  //   elevation: 3,
  // },
  reportConcernText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  address: {
    fontSize: 14,
    color: '#8BC500',
    marginLeft: 6,
    fontWeight: '500',
  },
});