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
  const [expandedIds, setExpandedIds] = useState(new Set([1])); // Default expand Route 1

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
        setExpandedIds(new Set([filtered[0].id]));
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

  const toggle = (id) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedIds(next);
  };

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
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {routes.length === 0 ? (
          <View style={styles.noRoutesContainer}>
            <Text style={styles.noRoutesText}>No routes available</Text>
          </View>
        ) : (
          routes.map((route) => (
            <View key={route.id} style={styles.card}> 
              <TouchableOpacity style={styles.cardHeader} onPress={() => toggle(route.id)}>
                <Text style={[styles.cardTitle, { color: colors.primary }]}>
                  {route.route ? `Route ${route.route}` : `Route ${route.id}`}
                </Text>
                <Feather 
                  name={expandedIds.has(route.id) ? "chevron-up" : "chevron-right"} 
                  size={20} 
                  color={colors.primary} 
                />
              </TouchableOpacity>

              {expandedIds.has(route.id) && (
                <View style={styles.cardBody}>
                  {route.time && route.endTime ? (
                    <>
                      <View style={styles.infoRow}>
                        <Feather name="clock" size={16} color={colors.primary} />
                        <Text style={styles.infoText}>
                          Start: {formatSingleTime(route.time)}
                        </Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Feather name="clock" size={16} color={colors.primary} />
                        <Text style={styles.infoText}>
                          End: {formatSingleTime(route.endTime)}
                        </Text>
                      </View>
                    </>
                  ) : route.time ? (
                    <View style={styles.infoRow}>
                      <Feather name="clock" size={16} color={colors.primary} />
                      <Text style={styles.infoText}>
                        Time: {formatSingleTime(route.time)}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.infoRow}>
                      <Feather name="clock" size={16} color={colors.primary} />
                      <Text style={styles.infoText}>Time not specified</Text>
                    </View>
                  )}

                  <View style={styles.infoRow}>
                    <Feather name="refresh-ccw" size={16} color={colors.primary} />
                    <Text style={styles.infoText}>Type: {route.type || 'Waste Collection'}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Feather name="calendar" size={16} color={colors.primary} />
                    <Text style={styles.infoText}>Frequency: {route.frequency || 'Not specified'}</Text>
                  </View>

                  {route.crew && route.crew.length > 0 && (
                    <View style={styles.infoRow}>
                      <Feather name="users" size={16} color={colors.primary} />
                      <Text style={styles.infoText}>Crew: {route.crew.join(', ')}</Text>
                    </View>
                  )}

                  {route.areas && route.areas.length > 0 && (
                    <>
                      <Text style={styles.sectionLabel}>Areas:</Text>
                      <View style={styles.barangayRow}>
                        <View style={styles.barangayList}>
                          {route.areas.map((area) => (
                            <Text key={area} style={styles.barangayText}>{area}</Text>
                          ))}
                        </View>
                        <TouchableOpacity 
                          style={[styles.fullBtn, { backgroundColor: colors.primary }]}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.fullBtnText}>View Full Schedule</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              )}
            </View>
          ))
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
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroSubtitle: {
    color: '#7E8A7E',
    fontSize: 12,
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  cardHeader: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: '#EDEDED',
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1F2937',
  },
  sectionLabel: {
    color: '#3F8B3C',
    fontWeight: '700',
    marginTop: 0,
    marginBottom: 2,
  },
  barangayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  barangayList: {
    flex: 1,
  },
  barangayText: {
    fontSize: 14,
    marginBottom: 0,
    color: '#4B5563',
  },
  fullBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  fullBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
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
    fontSize: 16,
  },
});
