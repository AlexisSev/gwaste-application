import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// eslint-disable-next-line import/namespace
import { ThemedView } from '../../components/ThemedView';
import PrimaryButton from '../../components/ui/PrimaryButton';
import { Colors } from '../../constants/Colors';

const weekDays = [
  { label: 'Mon', date: 10 },
  { label: 'Tue', date: 11 },
  { label: 'Wed', date: 12 },
  { label: 'Thu', date: 13 },
  { label: 'Fri', date: 14 },
  { label: 'Sat', date: 15 },
  { label: 'Sun', date: 16 },
];

const scheduleData = {
  12: [
    {
      time: '7:00 AM',
      location: 'Barangay Sambag',
      trashType: 'MALATA',
      icon: '🟢',
    },
    {}, {}, {}
  ],
  // Add more mock data for other days if needed
};

export default function ScheduleScreen() {
  const [selectedDay, setSelectedDay] = useState(12);
  const [weekStart, setWeekStart] = useState(0); // for arrow navigation

  const handlePrev = () => {
    if (weekStart > 0) setWeekStart(weekStart - 1);
  };
  const handleNext = () => {
    if (weekStart < weekDays.length - 7) setWeekStart(weekStart + 1);
  };

  const todaySchedule = scheduleData[selectedDay] || [{}, {}, {}, {}];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.date}>July 12, 2025</Text>
        <Text style={styles.day}>Tuesday</Text>
      </View>
      {/* Week Selector */}
      <View style={styles.weekSelector}>
        <PrimaryButton onPress={handlePrev} style={styles.arrowBtn}>
          <Text style={styles.arrow}>{'<'}</Text>
        </PrimaryButton>
        {weekDays.map((d) => (
          <TouchableOpacity
            key={d.date}
            style={styles.dayBtn}
            onPress={() => setSelectedDay(d.date)}
            activeOpacity={0.7}
          >
            <Text style={[styles.dayLabel, selectedDay === d.date && styles.selectedDayLabel]}>{d.label}</Text>
            <Text style={[styles.dayDate, selectedDay === d.date && styles.selectedDayDate]}>{d.date}</Text>
            {selectedDay === d.date && <View style={styles.selectedDot} />}
          </TouchableOpacity>
        ))}
        <PrimaryButton onPress={handleNext} style={styles.arrowBtn}>
          <Text style={styles.arrow}>{'>'}</Text>
        </PrimaryButton>
      </View>
      {/* Timeline */}
      <ScrollView style={styles.timeline} contentContainerStyle={{ paddingBottom: 32 }}>
        {todaySchedule.map((item, idx) => (
          <View key={idx} style={styles.timelineRow}>
            <View style={styles.timelineCol}>
              <View style={styles.timelineDot} />
              <Text style={styles.timelineTime}>7:00 AM</Text>
            </View>
            <View style={styles.timelineCardCol}>
              {item.location ? (
                <ThemedView style={styles.card}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={styles.cardLocation}>{item.location}</Text>
                      <Text style={styles.cardTrashType}>Type of Trash: <Text style={styles.trashType}>{item.icon} {item.trashType}</Text></Text>
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
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingTop: 40,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  date: {
    color: '#888',
    fontSize: 15,
    marginBottom: 2,
  },
  day: {
    color: '#458A3D',
    fontSize: 32,
    fontWeight: 'bold',
  },
  weekSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: '#fff',
    marginVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e9f7d0',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
    padding: 0,
  },
  arrow: {
    fontSize: 18,
    color: Colors.light.tint,
    fontWeight: 'bold',
  },
  dayBtn: {
    alignItems: 'center',
    marginHorizontal: 4,
    minWidth: 36,
  },
  dayLabel: {
    color: '#888',
    fontSize: 13,
  },
  dayDate: {
    color: '#888',
    fontSize: 15,
    fontWeight: 'bold',
  },
  selectedDayLabel: {
    color: '#458A3D',
    fontWeight: 'bold',
  },
  selectedDayDate: {
    color: '#458A3D',
    fontWeight: 'bold',
  },
  selectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#458A3D',
    marginTop: 2,
  },
  timeline: {
    flex: 1,
    backgroundColor: '#F4F8EC',
    paddingHorizontal: 0,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 10,
    marginLeft: 24,
  },
  timelineCol: {
    alignItems: 'center',
    width: 60,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.light.tint,
    marginBottom: 4,
    borderWidth: 3,
    borderColor: '#fff',
    zIndex: 2,
  },
  timelineTime: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  timelineCardCol: {
    flex: 1,
    paddingRight: 24,
  },
  card: {
    backgroundColor: '#458A3D',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLocation: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardTrashType: {
    color: '#eaffc0',
    fontSize: 14,
  },
  trashType: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cardArrow: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  cardEmpty: {
    backgroundColor: '#f3f7e7',
    borderRadius: 12,
    height: 60,
    marginBottom: 8,
  },
}); 