import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [hasProfileImage, setHasProfileImage] = React.useState(true);
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="auto" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              <Feather name="truck" size={24} color={colors.primary} />
              <Text style={[styles.appName, { color: colors.primary }]}>Gwaste</Text>
            </View>
            <Text style={[styles.greeting, { color: colors.primary }]}>Good Morning Ana!</Text>
            <View style={styles.locationContainer}>
              <Feather name="map-pin" size={16} color={colors.location} />
              <Text style={[styles.locationText, { color: colors.icon }]}> 
                Gairan, Bogo City, Purok Rosal
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.profileContainer} activeOpacity={0.8} onPress={() => router.push('/profile')}>
            {hasProfileImage ? (
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face' }}
                style={styles.profileImage}
                onError={() => setHasProfileImage(false)}
              />
            ) : (
              <View style={[styles.profilePlaceholder, { backgroundColor: colors.lightGreen }]}>
                <Feather name="user" size={22} color={colors.primary} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Collection Schedule Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Collection Schedule:</Text>
          
          {/* Next Pickup Card */}
          <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.cardLeft}>
              <View style={[styles.iconContainer, { backgroundColor: colors.lightGreen }]}>
                <Feather name="refresh-ccw" size={28} color={colors.primary} />
              </View>
            </View>
            <View style={styles.cardRight}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Next Pickup</Text>
              <Text style={[styles.cardTime, { color: colors.text }]}>July 10, 7:00 AM</Text>
              <Text style={[styles.cardType, { color: colors.primary }]}>Biodegradable</Text>
            </View>
          </View>

          {/* Truck Location Card */}
          <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.cardLeft}>
              <View style={styles.mapContainer}>
                <View style={styles.mapPlaceholder}>
                  <Feather name="map" size={20} color={colors.primary} />
                  <View style={styles.routeLine} />
                  <View style={[styles.locationPin, { backgroundColor: colors.primary }]} />
                </View>
              </View>
            </View>
            <View style={styles.cardRight}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Truck is</Text>
              <Text style={[styles.cardTime, { color: colors.text }]}>1 km away</Text>
              <TouchableOpacity style={styles.viewMapButton}>
                <Text style={[styles.viewMapText, { color: colors.primary }]}>View on Map</Text>
                <Feather name="chevron-right" size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Upcoming Pickups Section */}
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Collection Schedule:</Text>

    {/* Upcoming Pickup Items */}
    <View style={[styles.chip, { borderColor: colors.chipBorder, backgroundColor: colors.chipBg }]}>
      <View style={styles.chipTimeBox}>
        <Text style={[styles.upcomingTime, { color: colors.text }]}>10:30 AM</Text>
      </View>
      <Text style={[styles.upcomingLocation, { color: colors.text }]}>Barangay Sambag</Text>
    </View>

    <View style={[styles.chip, { borderColor: colors.chipBorder, backgroundColor: colors.chipBg }]}>
      <View style={styles.chipTimeBox}>
        <Text style={[styles.upcomingTime, { color: colors.text }]}>11:30 AM</Text>
      </View>
      <Text style={[styles.upcomingLocation, { color: colors.text }]}>Barangay Gairan</Text>
    </View>
  </View>


        {/* Bottom spacing for tab bar */}
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
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 20,
    paddingBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  appName: {
    fontSize: 26,
    fontWeight: '700',
    marginLeft: 8,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 13,
    marginLeft: 6,
  },
  profileContainer: {
    marginLeft: 16,
  },
  profileImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  profilePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 26,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  card: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardLeft: {
    marginRight: 16,
  },
  cardRight: {
    flex: 1,
    justifyContent: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    width: 80,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  routeLine: {
    position: 'absolute',
    width: 48,
    height: 2,
    backgroundColor: '#4CAF50',
    top: '50%',
    left: '8%',
  },
  locationPin: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    bottom: 8,
    right: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardTime: {
    fontSize: 14,
    marginBottom: 4,
  },
  cardType: {
    fontSize: 13,
    fontWeight: '600',
  },
  viewMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewMapText: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  chipTimeBox: {
    backgroundColor: '#F6EAA5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 12,
  },
  upcomingTime: {
    fontSize: 13,
    fontWeight: '700',
  },
  upcomingLocation: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginLeft: 2,
  },
  bottomSpacing: {
    height: 100,
  },
});


