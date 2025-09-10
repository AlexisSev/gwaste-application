import { Feather, FontAwesome5 } from '@expo/vector-icons';

import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { router } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { Colors } from '../../constants/Colors';
import { auth, db } from '../../firebase';
import { useColorScheme } from '../../hooks/useColorScheme';


export default function ScheduleScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const routes = [
    {
      id: 1,
      title: 'Route 1',
      time: '7:00AM - 3:00PM',
      kind: 'Biodegradable (MALATA)',
      frequency: 'DAILY',
      barangays: ['Cantecson', 'Gairan', 'Nailon', 'Siocon'],
    },
    {
      id: 2,
      title: 'Route 2',
      time: '8:00AM - 4:00PM',
      kind: 'Non-Biodegradable',
      frequency: 'WEEKLY',
      barangays: ['Sambag', 'Tubod', 'Looc'],
    },
    {
      id: 3,
      title: 'Route 3',
      time: '6:00AM - 2:00PM',
      kind: 'Recyclable',
      frequency: 'WEEKLY',
      barangays: ['Poblacion', 'San Jose', 'Santo Niño'],
    },
    {
      id: 4,
      title: 'Route 4',
      time: '9:00AM - 5:00PM',
      kind: 'Mixed Waste',
      frequency: 'WEEKLY',
      barangays: ['San Vicente', 'San Roque', 'San Miguel'],
    },
  ];

  const [expandedIds, setExpandedIds] = useState(new Set([1])); // Default expand Route 1

  const toggle = (id) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedIds(next);
  };

  const handleHomePress = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.push('/login');
        return;
      }

      const residentRef = doc(db, 'residents', user.uid);
      const residentSnap = await getDoc(residentRef);
      
      if (residentSnap.exists()) {
        const data = residentSnap.data();
        router.push({
          pathname: '/resident',
          params: data
        });
      }
    } catch (error) {
      console.error('Error:', error);
      router.push('/resident');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.hero}>
        <Text style={[styles.heroTitle, { color: colors.primary }]}>Collection Schedule</Text>
        <Text style={styles.heroSubtitle}>Your Location: Purok Rosal, Barangay Gairan</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {routes.map((route) => (
          <View key={route.id} style={styles.card}> 
            <TouchableOpacity style={styles.cardHeader} onPress={() => toggle(route.id)}>
              <Text style={[styles.cardTitle, { color: colors.primary }]}>{route.title}</Text>
              <Feather 
                name={expandedIds.has(route.id) ? "chevron-up" : "chevron-right"} 
                size={20} 
                color={colors.primary} 
              />
            </TouchableOpacity>

            {expandedIds.has(route.id) && (
              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Feather name="clock" size={16} color={colors.primary} />
                  <Text style={styles.infoText}>{route.time}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Feather name="refresh-ccw" size={16} color={colors.primary} />
                  <Text style={styles.infoText}>Kind: {route.kind}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Feather name="calendar" size={16} color={colors.primary} />
                  <Text style={styles.infoText}>Frequency: {route.frequency}</Text>
                </View>

                <Text style={styles.sectionLabel}>Barangays:</Text>
                <View style={styles.barangayRow}>
                  <View style={styles.barangayList}>
                    {route.barangays?.map((b) => (
                      <Text key={b} style={styles.barangayText}>{b}</Text>
                    ))}
                  </View>
                  <TouchableOpacity 
                    style={[styles.fullBtn, { backgroundColor: colors.primary }]}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.fullBtnText}>View Full Schedule</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottomNav}>
       <TouchableOpacity 
  style={styles.navItem}
  onPress={handleHomePress}
>
  <FontAwesome5 name="home" size={24} color="#666" />
  <Text style={styles.navText}>Home</Text>
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
          <FontAwesome5 name="calendar-alt" size={24} color="#4CAF50" />
          <Text style={[styles.navText, styles.activeNav]}>Schedule</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/resident/categorize')}
        >
          <FontAwesome5 name="list" size={24} color="#666" />
          <Text style={styles.navText}>Sorting Guide</Text>
        </TouchableOpacity>
      </View>
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
    marginTop: 6,
    marginBottom: 8,
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
    marginBottom: 4,
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
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5ECD9',
    backgroundColor: '#fff',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navText: {
    fontSize: 12,
    color: '#666',
  },
  activeNav: {
    color: '#4CAF50',
    fontWeight: '700',
  },
});
