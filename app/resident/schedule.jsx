import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '../../constants/Colors';
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
      expanded: true,
    },
    { id: 2, title: 'Route 2' },
    { id: 3, title: 'Route 3' },
    { id: 4, title: 'Route 4' },
  ];

  const [expandedIds, setExpandedIds] = useState(new Set(routes.filter(r => r.expanded).map(r => r.id)));

  const toggle = (id) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedIds(next);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="auto" />

      {/* Hero Header */}
      <View style={styles.hero}>
        <Text style={[styles.heroTitle, { color: colors.primary }]}>Collection Schedule</Text>
        <Text style={styles.heroSubtitle}>Your Location: Purok Rosal, Barangay Gairan</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {routes.map((route) => {
          const isOpen = expandedIds.has(route.id);
          return (
            <View key={route.id} style={[styles.card, { backgroundColor: colors.cardBackground }]}> 
              <TouchableOpacity style={styles.cardHeader} onPress={() => toggle(route.id)}>
                <Text style={[styles.cardTitle, { color: colors.primary }]}>{route.title}</Text>
                {isOpen ? (
                  <Feather name="chevron-up" size={20} color={colors.primary} />
                ) : (
                  <Feather name="chevron-right" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>

              {isOpen && (
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
                    <View style={{ flex: 1 }}>
                      {route.barangays?.map((b) => (
                        <Text key={b} style={styles.barangayText}>{b}</Text>
                      ))}
                    </View>
                    <TouchableOpacity activeOpacity={0.8} style={[styles.fullBtn, { backgroundColor: colors.primary }]}>
                      <Text style={styles.fullBtnText}>View Full Schedule</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const HERO_BG = '#EEF6E8';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hero: {
    backgroundColor: HERO_BG,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5ECD9',
    height: 110,
    justifyContent: 'center',
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
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  card: {
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
    paddingHorizontal: 12,
    paddingVertical: 14,
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
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
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
    alignItems: 'flex-start',
    gap: 10,
  },
  barangayText: {
    fontSize: 14,
    marginBottom: 4,
  },
  fullBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    alignSelf: 'flex-start',
  },
  fullBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});


