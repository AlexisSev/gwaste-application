import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';

export default function MapScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
      <StatusBar style="auto" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Banner Header */}
        <View style={[styles.banner, { backgroundColor: colors.lightGreen, borderColor: colors.lightGreen, height: 110 }]}> 
          <Text style={[styles.bannerTitle, { color: colors.primary }]}>Today`s Pickup:</Text>
          <Text style={[styles.bannerLocation, { color: colors.primary }]}>MALATA</Text>
          <Text style={[styles.bannerSubtext, { color: colors.icon }]}>Your Location: Purok Rosal, Barangay Gairan</Text>
          <TouchableOpacity style={styles.profileButton} activeOpacity={0.8} onPress={() => router.push('/profile')}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face' }}
              style={styles.profileImageSmall}
            />
          </TouchableOpacity>
        </View>

        {/* Stylized Map Preview */}
        <View style={[styles.mapContainer, { backgroundColor: colors.cardBackground }]}> 
          {/* Fake map background */}
          <View style={styles.fakeMapBg} />
          <View style={styles.riverBand} />
          {/* Roads */}
          <View style={[styles.roadLine, { top: 40, left: -20, width: 260, transform: [{ rotate: '25deg' }] }]} />
          <View style={[styles.roadLine, { top: 90, left: -10, width: 280, transform: [{ rotate: '18deg' }] }]} />
          <View style={[styles.roadLine, { top: 160, left: 10, width: 290, transform: [{ rotate: '12deg' }] }]} />
          <View style={[styles.roadLine, { top: 220, left: -30, width: 320, transform: [{ rotate: '30deg' }] }]} />
          <View style={[styles.roadLine, { top: 270, left: 0, width: 240, transform: [{ rotate: '-12deg' }] }]} />
          <View style={[styles.roadLine, { top: 320, left: -10, width: 280, transform: [{ rotate: '-5deg' }] }]} />

          {/* Bubble label */}
          <View style={[styles.bubble, { backgroundColor: colors.cardBackground }]}> 
            <Text style={[styles.bubbleText, { color: colors.text }]}>Truck – 2 stops away</Text>
            <View style={[styles.bubblePointer, { borderTopColor: colors.cardBackground }]} />
          </View>

          {/* Zones */}
          <View style={[styles.zone, styles.zoneLeft, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}>
            <Text style={[styles.zoneText, { color: colors.icon }]}>Zone 3</Text>
          </View>
          <View style={[styles.zone, styles.zoneRight, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}>
            <Text style={[styles.zoneText, { color: colors.icon }]}>Zone 3</Text>
          </View>

          {/* Route segments to mimic a zig-zag path */}
          <View style={[styles.routeSegment, { left: 40, top: 240, width: 80, transform: [{ rotate: '-20deg' }], borderColor: colors.primary }]} />
          <View style={[styles.routeSegment, { left: 100, top: 210, width: 70, transform: [{ rotate: '10deg' }], borderColor: colors.primary }]} />
          <View style={[styles.routeSegment, { left: 155, top: 200, width: 60, transform: [{ rotate: '35deg' }], borderColor: colors.primary }]} />
          <View style={[styles.routeSegment, { left: 200, top: 175, width: 80, transform: [{ rotate: '-10deg' }], borderColor: colors.primary }]} />

          {/* Truck icon and user pin */}
          <Feather name="truck" size={28} color={colors.primary} style={styles.truckIcon} />
          <Feather name="map-pin" size={30} color="#2D9CDB" style={styles.pinIcon} />

          {/* Floating info card over the map bottom */}
          <View style={[styles.overlayCard, { backgroundColor: colors.cardBackground }]}> 
            <Text style={[styles.infoTitle, { color: colors.text }]}>Today`s Pickup: <Text style={{ color: colors.primary }}>MALATA</Text></Text>
            <Text style={[styles.infoRow, { color: colors.icon }]}>Estimated Arrival: <Text style={{ color: '#2D9CDB', fontWeight: '600' }}>10mins</Text></Text>
            <Text style={[styles.infoRow, { color: colors.icon }]}>Status: <Text style={{ color: colors.primary, fontWeight: '600' }}>On the way</Text></Text>
            <TouchableOpacity activeOpacity={0.8} style={[styles.ctaButton, { backgroundColor: colors.primary }]}> 
              <Text style={styles.ctaText}>View Full Schedule</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  banner: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    borderBottomWidth: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  bannerLocation: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  bannerSubtext: {
    marginTop: 6,
    fontSize: 13,
  },
  profileButton: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  profileImageSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  mapContainer: {
    height: 480,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  fakeMapBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F3F5F7',
  },
  riverBand: {
    position: 'absolute',
    left: -40,
    top: 260,
    width: 500,
    height: 80,
    backgroundColor: '#CDE9FF',
    transform: [{ rotate: '-12deg' }],
  },
  roadLine: {
    position: 'absolute',
    height: 0,
    borderTopWidth: 2,
    borderColor: '#E2E6EA',
  },
  bubble: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bubbleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  bubblePointer: {
    position: 'absolute',
    left: '50%',
    marginLeft: -6,
    bottom: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  zone: {
    position: 'absolute',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  zoneLeft: {
    left: 14,
    top: 110,
  },
  zoneRight: {
    right: 18,
    top: 140,
  },
  zoneText: {
    fontSize: 12,
    fontWeight: '600',
  },
  routeSegment: {
    position: 'absolute',
    height: 0,
    borderTopWidth: 4,
    borderRadius: 4,
  },
  truckIcon: {
    position: 'absolute',
    left: 205,
    top: 160,
  },
  pinIcon: {
    position: 'absolute',
    left: 60,
    bottom: 180,
  },
  overlayCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 8,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  infoRow: {
    fontSize: 14,
    marginBottom: 6,
  },
  ctaButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    marginTop: 10,
  },
  ctaText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  bottomSpacing: {
    height: 8,
  },
});



