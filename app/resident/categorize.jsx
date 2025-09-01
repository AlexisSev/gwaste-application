import { Feather, FontAwesome5 } from '@expo/vector-icons';

import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';

export default function CategorizeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Static image map (place your files with these exact names under assets/images)
  const categoryImages = {
    recyclable: require('../../assets/images/icon.png'),
    biodegradable: require('../../assets/images/icon.png'),
    hazardous: require('../../assets/images/icon.png'),
    residual: require('../../assets/images/icon.png'),
    nonbio: require('../../assets/images/icon.png'),
    ewaste: require('../../assets/images/icon.png'),
  };

  const categories = [
    { id: 'recyclable', label: 'Recyclable  Waste' },
    { id: 'biodegradable', label: 'Biodegradable' },
    { id: 'hazardous', label: 'Hazardous Waste' },
    { id: 'residual', label: 'Residual Waste' },
    { id: 'nonbio', label: 'Non-Biodegradable' },
    { id: 'ewaste', label: 'E-Waste' },
  ];

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.gridItem}>
      <View style={styles.cardIconWrap}>
        <Image source={categoryImages[item.id]} style={styles.cardImage} resizeMode="contain" />
      </View>
      <Text numberOfLines={2} style={[styles.cardLabel, { color: colors.text }]}>{item.label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="auto" />

      {/* Hero Header */}
      <View style={styles.hero}>
        <Text style={[styles.heroTitle, { color: colors.primary }]}>Waste Sorting Guide</Text>
        <Text style={styles.heroSubtitle}>See which bin each item goes to based{"\n"}on its category.</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <Feather name="search" size={18} color={colors.primary} />
        <TextInput
          placeholder="What do you wanna sort?"
          placeholderTextColor="#7D8A7D"
          style={styles.searchInput}
        />
      </View>

      {/* Grid */}
      <FlatList
        contentContainerStyle={styles.gridContainer}
        data={categories}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        showsVerticalScrollIndicator={false}
      />

      {/* Bottom navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/resident')}
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
          <FontAwesome5 name="calendar-alt" size={24} color="#666" />
          <Text style={styles.navText}>Schedule</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/resident/categorize')}
        >
          <FontAwesome5 name="list" size={24} color="#4CAF50" />
          <Text style={[styles.navText, styles.activeNav]}>Categorize</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const PALE_YELLOW = '#F6F7E8';
const SEARCH_BG = '#FFFFFF';
const HERO_BG = '#EEF6E8';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hero: {
    backgroundColor: HERO_BG,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5ECD9',
    height: 110,
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 6,
  },
  heroSubtitle: {
    color: '#7E8A7E',
    fontSize: 12,
    lineHeight: 18,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SEARCH_BG,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E0E7D6',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#1F2937',
  },
  gridContainer: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  gridItem: {
    width: '48%',
    backgroundColor: PALE_YELLOW,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E6E6D1',
  },
  cardIconWrap: {
    width: 88,
    height: 62,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6E9',
    marginBottom: 12,
  },
  cardImage: {
    width: 72,
    height: 48,
  },
  cardLabel: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5ECD9',
    elevation: 5,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navText: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  activeNav: {
    color: '#4CAF50',
    fontWeight: '700',
  },
});


