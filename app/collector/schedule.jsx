import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// eslint-disable-next-line import/namespace
import { ThemedView } from '../../components/ThemedView';
import PrimaryButton from '../../components/ui/PrimaryButton';
import { Colors } from '../../constants/Colors';
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

  const handlePrev = () => setWeekStart(weekStart - 1);
  const handleNext = () => setWeekStart(weekStart + 1);

  const getTodaySchedule = () => {
    if (!routes || routes.length === 0) return [{}, {}, {}, {}];
    const weekDates = getWeekDates();
    const selectedDateInfo = weekDates.find(day => day.date === selectedDay);
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
      location: route.areas ? route.areas.join(' • ') : 'Areas to collect',
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
        <PrimaryButton onPress={handlePrev} style={styles.arrowBtn}><Text style={styles.arrow}>{'<'}</Text></PrimaryButton>
        {weekDays.map((d) => (
          <TouchableOpacity key={d.date} style={styles.dayBtn} onPress={() => setSelectedDay(d.date)} activeOpacity={0.7}>
            <Text style={[styles.dayLabel, selectedDay === d.date && styles.selectedDayLabel]}>{d.label}</Text>
            <Text style={[styles.dayDate, selectedDay === d.date && styles.selectedDayDate]}>{d.date}</Text>
            {selectedDay === d.date && <View style={styles.selectedDot} />}
          </TouchableOpacity>
        ))}
        <PrimaryButton onPress={handleNext} style={styles.arrowBtn}><Text style={styles.arrow}>{'>'}</Text></PrimaryButton>
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardLocation}>{item.location}</Text>
                      <Text style={styles.cardTrashType}>Type: <Text style={styles.trashType}>{item.icon} {item.trashType}</Text></Text>
                      {item.routeNumber && (<Text style={styles.cardRoute}>Route {item.routeNumber}</Text>)}
                      {item.frequency && (<Text style={styles.cardFrequency}>{item.frequency}</Text>)}
                    </View>
                    <Text style={styles.cardArrow}>{'>'}</Text>
                  </View>
                </ThemedView>
              ) : (
                <ThemedView style={styles.cardEmpty} />
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', paddingTop: 40 },
  header: { paddingHorizontal: 24, paddingBottom: 8 },
  date: { color: '#888', fontSize: 15, marginBottom: 2 },
  day: { color: '#458A3D', fontSize: 32, fontWeight: 'bold' },
  weekSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', marginVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', minHeight: 60 },
  arrowBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#458A3D', alignItems: 'center', justifyContent: 'center', marginHorizontal: -1, padding: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, zIndex: 1 },
  arrow: { fontSize: 20, marginTop: -7, color: '#fff', fontWeight: 'bold' },
  dayBtn: { alignItems: 'center', marginHorizontal: 2, minWidth: 32, paddingVertical: 4 },
  dayLabel: { color: '#888', fontSize: 13 },
  dayDate: { color: '#888', fontSize: 15, fontWeight: 'bold' },
  selectedDayLabel: { color: '#458A3D', fontWeight: 'bold' },
  selectedDayDate: { color: '#458A3D', fontWeight: 'bold' },
  selectedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#458A3D', marginTop: 2 },
  timeline: { flex: 1, backgroundColor: '#F4F8EC', paddingHorizontal: 0 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 10, marginLeft: 24 },
  timelineCol: { alignItems: 'center', width: 60 },
  timelineDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.light.tint, marginBottom: 4, borderWidth: 3, borderColor: '#fff', zIndex: 2 },
  timelineTime: { fontSize: 13, color: '#888', marginTop: 2 },
  timelineCardCol: { flex: 1, paddingRight: 24 },
  card: { backgroundColor: '#458A3D', borderRadius: 12, padding: 16, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  cardLocation: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  cardTrashType: { color: '#eaffc0', fontSize: 14 },
  trashType: { color: '#fff', fontWeight: 'bold' },
  cardRoute: { color: '#fff', fontSize: 14, marginTop: 4 },
  cardFrequency: { color: '#fff', fontSize: 14, marginTop: 4 },
  cardArrow: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  cardEmpty: { backgroundColor: '#f3f7e7', borderRadius: 12, height: 60, marginBottom: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
  loadingText: { color: '#888', fontSize: 16, marginTop: 10 },
  monthDisplay: { paddingHorizontal: 24, paddingBottom: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0', alignItems: 'center' },
  monthText: { color: '#458A3D', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
});


