/* eslint-disable no-unused-vars */
import { Feather } from '@expo/vector-icons';

import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { router } from 'expo-router';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { Colors } from '../../constants/Colors';
import { auth, db } from '../../firebase';
import { useColorScheme } from '../../hooks/useColorScheme';


export default function ScheduleScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRouteId, setSelectedRouteId] = useState(null);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const routesRef = collection(db, 'routes');
      const querySnapshot = await getDocs(routesRef);
      const routesData = [];
      querySnapshot.forEach((doc) => { 
        routesData.push({ id: doc.id, ...doc.data() }); 
      });
      
      // Sort routes by route number in ascending order
      routesData.sort((a, b) => {
        const routeA = parseInt(a.route) || 0;
        const routeB = parseInt(b.route) || 0;
        return routeA - routeB;
      });

      // Fetch resident address and filter routes to only the matching one(s)
      const user = auth.currentUser;
      let filtered = routesData;
      if (user) {
        try {
          const residentRef = doc(db, 'residents', user.uid);
          const residentSnap = await getDoc(residentRef);
          const address = residentSnap.exists() ? (residentSnap.data()?.address || '') : '';
          const purok = residentSnap.exists() ? (residentSnap.data()?.purok || '') : '';
          const normalize = (s) => (s || '')
            .toString()
            .toLowerCase()
            .replace(/\b(address|barangay|purok|street|st\.?|road|rd\.?|avenue|ave\.?)\b/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          const addrNorm = normalize(address);
          const purokNorm = normalize(purok);
          const tokens = new Set([addrNorm, purokNorm].filter(Boolean));

          const areaMatchesResident = (area) => {
            const a = normalize(area);
            if (!a) return false;
            // exact or containment either way
            for (const t of tokens) {
              if (!t) continue;
              if (a === t) return true;
              if (t.length >= 3 && (t.includes(a) || a.includes(t))) return true;
            }
            return false;
          };

          if (tokens.size > 0) {
            filtered = routesData.filter(r => Array.isArray(r.areas) && r.areas.some(areaMatchesResident));
          }
        } catch (e) {
          // If anything fails, fall back to original list
        }
      }

      setRoutes(filtered);
      if (filtered.length > 0) {
        setSelectedRouteId(filtered[0].id);
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
    } finally {
      setLoading(false);
    }
  };


  const formatTime = (timeString) => {
    if (!timeString) return '';
    try {
      // Handle time range format (e.g., "7:00-15:00" or "7:00-3:00PM")
      if (timeString.includes('-')) {
        const [startTime, endTime] = timeString.split('-');
        const formattedStart = formatSingleTime(startTime.trim());
        const formattedEnd = formatSingleTime(endTime.trim());
        return `${formattedStart} - ${formattedEnd}`;
      }
      // Handle single time format
      return formatSingleTime(timeString);
    } catch (error) {
      return timeString;
    }
  };

  const formatSingleTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      // Remove any existing AM/PM
      const cleanTime = timeStr.replace(/[AP]M/i, '').trim();
      const [hours, minutes] = cleanTime.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes || '00'} ${ampm}`;
    } catch (error) {
      return timeStr;
    }
  };

  const selectedRoute = routes.find(r => r.id === selectedRouteId) || null;

  const handleHomePress = () => {
    router.push('/resident');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        <View style={styles.hero}>
          <Text style={[styles.heroTitle, { color: colors.primary }]}>Collection Schedule</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading routes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.hero}>
        <Text style={[styles.heroTitle, { color: colors.primary }]}>Collection Schedule</Text>
        {/* {selectedRoute && (
          <Text style={styles.heroSubtitle}>
            {selectedRoute.route ? `Route ${selectedRoute.route}` : 'Route'} • {selectedRoute.type || 'Waste Collection'}
          </Text>
        )} */}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {routes.length === 0 && (
          <View style={styles.noRoutesContainer}>
            <Text style={styles.noRoutesText}>No routes available</Text>
          </View>
        )}

        {routes.length > 1 && (
          <View style={styles.selectorRow}>
            {routes.map(r => (
              <TouchableOpacity
                key={r.id}
                style={[
                  styles.selectorChip,
                  r.id === selectedRouteId && { backgroundColor: colors.primary }
                ]}
                onPress={() => setSelectedRouteId(r.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.selectorText, r.id === selectedRouteId && { color: '#fff' }]}>
                  {r.route ? `Route ${r.route}` : 'Route'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {selectedRoute && (
          <View style={styles.detailCard}>
            <View style={styles.detailHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailTitle, { color: colors.primary }]}>
                  {selectedRoute.route ? `Route ${selectedRoute.route}` : 'Route'}
                </Text>
                <Text style={styles.detailSubtitle}>
                  {selectedRoute.type || 'Waste Collection'} • {selectedRoute.frequency || 'Schedule'}
                </Text>
              </View>
              <View style={styles.timePill}>
                <Feather name="clock" size={14} color="#fff" />
                <Text style={styles.timePillText}>
                  {formatSingleTime(selectedRoute.time)} - {formatSingleTime(selectedRoute.endTime)}
                </Text>
              </View>
            </View>

            {/* Driver and Crew */}
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.driverLabel}>Driver: <Text style={styles.driverValue}>{selectedRoute.driver || '—'}</Text></Text>
              {Array.isArray(selectedRoute.crew) && selectedRoute.crew.length > 0 && (
                <View style={styles.crewRow}>
                  {selectedRoute.crew.map((member, idx) => (
                    <View key={idx} style={styles.crewChip}>
                      <Text style={styles.crewChipText}>
                        {typeof member === 'string' ? member : `${member?.firstName || ''} ${member?.lastName || ''}`.trim() || 'Crew'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {Array.isArray(selectedRoute.areas) && selectedRoute.areas.length > 0 ? (
              <View style={styles.areaList}>
                {selectedRoute.areas.map((area, idx) => (
                  <View key={`${area}-${idx}`} style={styles.areaItem}>
                    <View style={styles.areaBadge}><Text style={styles.areaBadgeText}>{idx + 1}</Text></View>
                    <Text style={styles.areaName}>{area}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noRoutesText}>No areas listed for this route.</Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  hero: {
    backgroundColor: '#EEF6E8',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5ECD9',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroSubtitle: {
    color: '#7E8A7E',
    fontSize: 14,
  },
  content: {
    padding: 16,
  },
  selectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  selectorChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#E6F2E6',
  },
  selectorText: { color: '#2E7D32', fontWeight: '600', fontSize: 16 },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  detailHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  detailTitle: { fontSize: 22, fontWeight: '800' },
  detailSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  timePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4CAF50', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, gap: 6 },
  timePillText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  driverLabel: { fontSize: 14, color: '#374151', marginBottom: 6 },
  driverValue: { fontWeight: '700', color: '#1F2937' },
  crewRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  crewChip: { backgroundColor: '#E8F5E9', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  crewChipText: { fontSize: 12, color: '#2E7D32', fontWeight: '600' },
  areaList: { gap: 8 },
  areaItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F6F7E8', borderRadius: 10, padding: 12 },
  areaBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E3F2E8', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  areaBadgeText: { color: '#2E7D32', fontWeight: '700', fontSize: 14 },
  areaName: { fontSize: 16, color: '#1F2937', fontWeight: '600' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    color: '#7E8A7E',
    fontSize: 16,
    marginTop: 10,
  },
  noRoutesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  noRoutesText: {
    color: '#7E8A7E',
    fontSize: 18,
  },
});
