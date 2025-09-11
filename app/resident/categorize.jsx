import { Feather } from '@expo/vector-icons';

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

  const handlePressCategory = (id) => {
    router.push({ pathname: '/resident/categorize/[id]', params: { id } });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.gridItem} onPress={() => handlePressCategory(item.id)}>
      <View style={styles.cardIconWrap}>
        <Image source={categoryImages[item.id]} style={styles.cardImage} resizeMode="contain" />
      </View>
      <Text numberOfLines={2} style={[styles.cardLabel, { color: '#4CAF50' }]}>{item.label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F6F7E8' }]}>
      <StatusBar style="auto" />

      {/* Hero Header */}
      <View style={styles.hero}>
        <Text style={[styles.heroTitle, { color: colors.primary }]}>Waste Sorting Guide</Text>
        <Text style={[styles.heroSubtitle, { color: colors.primary }]}>See which bin each item goes to based{"\n"}on its category.</Text>
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

});



