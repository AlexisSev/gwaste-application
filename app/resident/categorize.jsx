import { Feather } from '@expo/vector-icons';

import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { FlatList, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

  const [selectedId, setSelectedId] = useState(null);

  const handlePressCategory = (id) => {
    setSelectedId(id);
  };

  const selectedLabel = categories.find(c => c.id === selectedId)?.label;

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

      {/* Search Bar
      <View style={styles.searchWrap}>
        <Feather name="search" size={18} color={colors.primary} />
        <TextInput
          placeholder="What do you wanna sort?"
          placeholderTextColor="#7D8A7D"
          style={styles.searchInput}
        />
      </View> */}

      {/* Content */}
      {selectedId ? (
        <ScrollView contentContainerStyle={styles.detailContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.detailHeader}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedId(null)}>
              <Feather name="arrow-left" size={20} color={colors.primary} />
              <Text style={[styles.backText, { color: colors.primary }]}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.detailTitle}>{selectedLabel || 'Waste Category'}</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.detailCard}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Which bin?</Text>
            <Text style={styles.sectionBody}>See local guidance for proper bin usage.</Text>
          </View>

          <View style={styles.detailCard}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>How to prepare</Text>
            <Text style={styles.sectionBody}>Rinse containers, keep materials dry, and avoid mixing non-recyclables.</Text>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          contentContainerStyle={styles.gridContainer}
          data={categories}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  detailContainer: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20 },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 60 },
  backText: { fontSize: 14, fontWeight: '600' },
  detailTitle: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  sectionBody: { fontSize: 14, color: '#374151' },

});



