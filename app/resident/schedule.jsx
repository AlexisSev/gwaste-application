/* eslint-disable no-unused-vars */
import { Feather } from '@expo/vector-icons';

import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { router } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { supabase } from '../../services/supabaseClient';


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
      const { data, error } = await supabase
        .from('routes')
        .select('*');
      if (error) throw error;

      const routesData = (data || []).map(r => ({ id: r.id, ...r }));
      routesData.sort((a, b) => {
        const routeA = parseInt(a.route) || 0;
        const routeB = parseInt(b.route) || 0;
        return routeA - routeB;
      });

      setRoutes(routesData);
      if (routesData.length > 0) {
        setSelectedRouteId(routesData[0].id);
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

  // Generate time intervals for areas based on fixed schedule (7:00 AM - 3:00 PM)
  const generateTimeIntervals = (areas) => {
    if (!areas || areas.length === 0) return [];
    
    try {
      const startTime = '7:00';
      const endTime = '15:00';
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
        startTime: '7:00',
        endTime: '15:00',
        index: index + 1
      }));
    }
  };

  const selectedRoute = routes.find(r => r.id === selectedRouteId) || null;
  const timeIntervals = selectedRoute ? generateTimeIntervals(selectedRoute.areas || []) : [];

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
            </View>

            {/* Driver and Crew */}
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.driverLabel}>Driver: <Text style={styles.driverValue}>{selectedRoute.driver || '—'}</Text></Text>
              {Array.isArray(selectedRoute.crew) && selectedRoute.crew.length > 0 && (
                <View style={styles.crewContainer}>
                  <Text style={styles.driverLabel}>Crew: </Text>
                  <View style={styles.crewRow}>
                    {selectedRoute.crew.map((member, idx) => (
                      <View key={idx} style={styles.crewChip}>
                        <Text style={styles.crewChipText}>
                          {typeof member === 'string' ? member : `${member?.firstName || ''} ${member?.lastName || ''}`.trim() || 'Crew'}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {Array.isArray(selectedRoute.areas) && selectedRoute.areas.length > 0 ? (
              <View style={styles.areaList}>
                {timeIntervals.map((interval, idx) => (
                  <View key={`${interval.area}-${idx}`} style={styles.areaItem}>
                    <View style={styles.areaBadge}><Text style={styles.areaBadgeText}>{interval.index}</Text></View>
                    <View style={styles.areaContent}>
                      <Text style={styles.areaName}>{interval.area}</Text>
                      <Text style={styles.areaTime}>
                        Estimated: {formatSingleTime(interval.startTime)} - {formatSingleTime(interval.endTime)}
                      </Text>
                    </View>
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
  crewContainer: { flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap' },
  crewRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 },
  crewChip: { backgroundColor: '#E8F5E9', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  crewChipText: { fontSize: 12, color: '#2E7D32', fontWeight: '600' },
  areaList: { gap: 8 },
  areaItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F6F7E8', borderRadius: 10, padding: 12 },
  areaBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E3F2E8', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  areaBadgeText: { color: '#2E7D32', fontWeight: '700', fontSize: 14 },
  areaContent: { flex: 1 },
  areaName: { fontSize: 16, color: '#1F2937', fontWeight: '600', marginBottom: 2 },
  areaTime: { fontSize: 12, color: '#4CAF50', fontWeight: '600' },
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
