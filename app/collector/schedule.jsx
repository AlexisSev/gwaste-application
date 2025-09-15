import { Feather } from '@expo/vector-icons';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// eslint-disable-next-line import/namespace
import { ThemedView } from '../../components/ThemedView';
import { db } from '../../firebase';
import { useCollectorAuth } from '../../hooks/useCollectorAuth';

export default function ScheduleScreen() {
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [weekStart, setWeekStart] = useState(0);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { collector } = useCollectorAuth();

  const getCurrentDate = () => {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const dayOptions = { weekday: 'long' };
    return { fullDate: now.toLocaleDateString('en-US', options), dayName: now.toLocaleDateString('en-US', dayOptions) };
  };

  const getWeekDates = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + weekStart * 7);
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDays.push({
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: date.getDate(),
        fullDate: date,
        dayOfWeek: date.getDay()
      });
    }
    return weekDays;
  };

  const getSelectedDateInfo = () => {
    const weekDates = getWeekDates();
    const selectedDateInfo = weekDates.find(day => day.date === selectedDay);
    if (selectedDateInfo) {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      const dayOptions = { weekday: 'long' };
      return {
        fullDate: selectedDateInfo.fullDate.toLocaleDateString('en-US', options),
        dayName: selectedDateInfo.fullDate.toLocaleDateString('en-US', dayOptions)
      };
    }
    return getCurrentDate();
  };

  const currentDate = getSelectedDateInfo();
  const weekDays = getWeekDates();

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchDriverRoutes(); }, [collector]);

  const fetchDriverRoutes = async () => {
    if (!collector) return;
    try {
      setLoading(true);
      const routesRef = collection(db, 'routes');
      const q = query(routesRef, where('driver', '==', collector.driver));
      const querySnapshot = await getDocs(q);
      const routesData = [];
      querySnapshot.forEach((doc) => { routesData.push({ id: doc.id, ...doc.data() }); });
      setRoutes(routesData);
    } catch (error) {
      console.error('Error fetching routes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrev = () => {
    const newWeekStart = weekStart - 1;
    setWeekStart(newWeekStart);
    // Reset to first day of new week to maintain consistent layout
    const today = new Date();
    const firstDayOfNewWeek = new Date(today);
    firstDayOfNewWeek.setDate(today.getDate() - today.getDay() + newWeekStart * 7);
    setSelectedDay(firstDayOfNewWeek.getDate());
  };
  const handleNext = () => {
    const newWeekStart = weekStart + 1;
    setWeekStart(newWeekStart);
    // Reset to first day of new week to maintain consistent layout
    const today = new Date();
    const firstDayOfNewWeek = new Date(today);
    firstDayOfNewWeek.setDate(today.getDate() - today.getDay() + newWeekStart * 7);
    setSelectedDay(firstDayOfNewWeek.getDate());
  };

  const getTodaySchedule = () => {
    if (!routes || routes.length === 0) return [{}, {}, {}, {}];
    const weekDates = getWeekDates();
    let selectedDateInfo = weekDates.find(day => day.date === selectedDay);
    
    // If selected day doesn't exist in current week, default to first day of week
    if (!selectedDateInfo && weekDates.length > 0) {
      selectedDateInfo = weekDates[0];
      setSelectedDay(selectedDateInfo.date);
    }
    
    if (!selectedDateInfo) return [{}, {}, {}, {}];

    const filteredRoutes = routes.filter(route => {
      if (!route.frequency) return true;
      const dayOfWeek = selectedDateInfo.dayOfWeek;
      const f = String(route.frequency).toLowerCase();
      if (f.includes('monday') && dayOfWeek === 1) return true;
      if (f.includes('tuesday') && dayOfWeek === 2) return true;
      if (f.includes('wednesday') && dayOfWeek === 3) return true;
      if (f.includes('thursday') && dayOfWeek === 4) return true;
      if (f.includes('friday') && dayOfWeek === 5) return true;
      if (f.includes('saturday') && dayOfWeek === 6) return true;
      if (f.includes('sunday') && dayOfWeek === 0) return true;
      if (f.includes('every day') || f.includes('daily')) return true;
      if (f.includes('weekday') && dayOfWeek >= 1 && dayOfWeek <= 5) return true;
      if (f.includes('weekend') && (dayOfWeek === 0 || dayOfWeek === 6)) return true;
      return false;
    });

    const scheduleItems = filteredRoutes.map(route => ({
      time: formatTime(route.time),
      location: route.areas ? route.areas.join(', ') : 'Areas to collect',
      trashType: route.type || 'Waste Collection',
      routeNumber: route.route,
      frequency: route.frequency,
      dayOff: route.dayOff,
      icon: '🟢',
    }));

    while (scheduleItems.length < 4) scheduleItems.push({});
    return scheduleItems;
  };

  const todaySchedule = getTodaySchedule();

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}><Text style={styles.date}>Loading...</Text><Text style={styles.day}>Please wait</Text></View>
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#458A3D" /><Text style={styles.loadingText}>Fetching your schedule...</Text></View>
      </View>
    );
  }

  if (!collector) {
    return (
      <View style={styles.container}>
        <View style={styles.header}><Text style={styles.date}>Not Logged In</Text><Text style={styles.day}>Please log in</Text></View>
        <View style={styles.loadingContainer}><Text style={styles.loadingText}>Please log in to view your schedule</Text></View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.date}>{currentDate.fullDate}</Text>
        <Text style={styles.day}>{currentDate.dayName}</Text>
      </View>
      <View style={styles.monthDisplay}><Text style={styles.monthText}>{getWeekDates()[0].fullDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text></View>
      <View style={styles.weekSelector}>
        <TouchableOpacity onPress={handlePrev} style={styles.arrowBtn}>
          <Feather name="chevron-left" size={20} color="#fff" />
        </TouchableOpacity>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysContainer}>
          {weekDays.map((d) => (
            <TouchableOpacity key={d.date} style={[styles.dayBtn, selectedDay === d.date && styles.selectedDayBtn]} onPress={() => setSelectedDay(d.date)} activeOpacity={0.7}>
              <Text style={[styles.dayLabel, selectedDay === d.date && styles.selectedDayLabel]}>{d.label}</Text>
              <Text style={[styles.dayDate, selectedDay === d.date && styles.selectedDayDate]}>{d.date}</Text>
              {selectedDay === d.date && <View style={styles.selectedDot} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity onPress={handleNext} style={styles.arrowBtn}>
          <Feather name="chevron-right" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.timeline} contentContainerStyle={{ paddingBottom: 32 }}>
        {todaySchedule.map((item, idx) => (
          <View key={idx} style={styles.timelineRow}>
            <View style={styles.timelineCol}>
              <View style={styles.timelineDot} />
              <Text style={styles.timelineTime}>{item.time || '--:--'}</Text>
            </View>
            <View style={styles.timelineCardCol}>
              {item.location ? (
                <ThemedView style={styles.card}>
                  <View style={styles.cardContent}>
                    <View style={styles.cardInfo}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardLocation}>{item.location}</Text>
                      </View>
                      <View style={styles.cardDetails}>
                        <View style={styles.detailRow}>
                          <Feather name="trash-2" size={16} color="#8BC500" />
                          <Text style={styles.cardTrashType}>{item.trashType}</Text>
                        </View>
                        {item.routeNumber && (
                          <View style={styles.detailRow}>
                            <Feather name="map" size={16} color="#8BC500" />
                            <Text style={styles.cardRoute}>Route {item.routeNumber}</Text>
                          </View>
                        )}
                        {item.frequency && (
                          <View style={styles.detailRow}>
                            <Feather name="repeat" size={16} color="#8BC500" />
                            <Text style={styles.cardFrequency}>{item.frequency}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.statusBadge}>
                      <View style={styles.statusDot} />
                      <Text style={styles.statusText}>Scheduled</Text>
                    </View>
                  </View>
                </ThemedView>
              ) : (
                <ThemedView style={styles.cardEmpty}>
                  <View style={styles.emptyCardContent}>
                    <Feather name="calendar" size={24} color="#ccc" />
                    <Text style={styles.emptyCardText}>No collection scheduled</Text>
                  </View>
                </ThemedView>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA', 
    paddingTop: 40 
  },
  header: { 
    paddingHorizontal: 24, 
    paddingBottom: 8 
  },
  date: { 
    color: '#888', 
    fontSize: 15, 
    marginBottom: 2 
  },
  day: { 
    color: '#8BC500', 
    fontSize: 32, 
    fontWeight: 'bold' 
  },
  monthDisplay: { 
    paddingHorizontal: 24, 
    paddingBottom: 8, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#e0e0e0', 
    alignItems: 'center' 
  },
  monthText: { 
    color: '#8BC500', 
    fontSize: 18, 
    fontWeight: 'bold', 
    textAlign: 'center' 
  },
  weekSelector: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 16, 
    backgroundColor: '#fff', 
    marginVertical: 8, 
    borderBottomWidth: 1, 
    borderBottomColor: '#e0e0e0', 
    minHeight: 70 
  },
  arrowBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: '#8BC500', 
    alignItems: 'center', 
    justifyContent: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 3 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 6, 
    elevation: 4 
  },
  daysContainer: {
    flex: 1,
    marginHorizontal: 12
  },
  dayBtn: { 
    alignItems: 'center', 
    marginHorizontal: 4, 
    minWidth: 48, 
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'transparent'
  },
  selectedDayBtn: {
    backgroundColor: '#8BC500',
    shadowColor: '#8BC500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  dayLabel: { 
    color: '#888', 
    fontSize: 12, 
    fontWeight: '500',
    marginBottom: 2
  },
  dayDate: { 
    color: '#333', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  selectedDayLabel: { 
    color: '#fff', 
    fontWeight: 'bold' 
  },
  selectedDayDate: { 
    color: '#fff', 
    fontWeight: 'bold' 
  },
  selectedDot: { 
    width: 6, 
    height: 6, 
    borderRadius: 3, 
    backgroundColor: '#fff', 
    marginTop: 4 
  },
  timeline: { 
    flex: 1, 
    backgroundColor: '#F4F8EC', 
    paddingHorizontal: 0 
  },
  timelineRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    marginVertical: 12, 
    marginLeft: 24 
  },
  timelineCol: { 
    alignItems: 'center', 
    width: 60 
  },
  timelineDot: { 
    width: 18, 
    height: 18, 
    borderRadius: 9, 
    backgroundColor: '#8BC500', 
    marginBottom: 6, 
    borderWidth: 3, 
    borderColor: '#fff', 
    zIndex: 2,
    shadowColor: '#8BC500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  timelineTime: { 
    fontSize: 13, 
    color: '#666', 
    fontWeight: '600',
    marginTop: 2 
  },
  timelineCardCol: { 
    flex: 1, 
    paddingRight: 24 
  },
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 8, 
    shadowColor: '#000', 
    shadowOpacity: 0.08, 
    shadowRadius: 8, 
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#8BC500'
  },
  cardContent: {
    position: 'relative'
  },
  cardInfo: {
    flex: 1
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    position: 'relative'
  },
  cardLocation: { 
    color: '#333', 
    fontSize: 18, 
    fontWeight: 'bold',
    flex: 1,
    marginRight: 12
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: -10,
    paddingVertical: 3,
    borderRadius: 16,
    minWidth: 80,
    justifyContent: 'center',
    position: 'absolute',
    top: -15,
    right: -15
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8BC500',
    marginRight: 6
  },
  statusText: {
    color: '#8BC500',
    fontSize: 12,
    fontWeight: '600'
  },
  cardDetails: {
    gap: 8
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  cardTrashType: { 
    color: '#666', 
    fontSize: 14,
    fontWeight: '500'
  },
  cardRoute: { 
    color: '#666', 
    fontSize: 14,
    fontWeight: '500'
  },
  cardFrequency: { 
    color: '#666', 
    fontSize: 14,
    fontWeight: '500'
  },
  cardAction: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F0F8F0'
  },
  cardEmpty: { 
    backgroundColor: '#f8f9fa', 
    borderRadius: 16, 
    height: 80, 
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed'
  },
  emptyCardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyCardText: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500'
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingVertical: 20 
  },
  loadingText: { 
    color: '#888', 
    fontSize: 16, 
    marginTop: 10 
  }
});