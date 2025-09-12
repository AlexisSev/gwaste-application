 import { Feather } from '@expo/vector-icons';

import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';

export default function CategorizeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Static image map for each category
  const categoryImages = {
    recyclable: require('../../assets/images/biodegradable.png'),
    biodegradable: require('../../assets/images/paper.png'),
    hazardous: require('../../assets/images/battery.png'),
    residual: require('../../assets/images/waste.png'),
    nonbio: require('../../assets/images/non-biodegradable.png'),
    ewaste: require('../../assets/images/phone.png'),
  };

  const CATEGORY_GUIDE = {
    recyclable: {
      examples: ['Paper, cardboard', 'Plastic bottles (rinsed)', 'Glass jars (clean)', 'Metal cans'],
      instructions: [
        'Rinse containers to remove food residue.',
        'Flatten cardboard boxes to save space.',
        'Separate glass, paper, metal if required by your locality.',
        'Do not include plastic bags or greasy pizza boxes.'
      ],
      bin: 'Blue or Recyclables Bin',
      why: 'Recycling reduces the need for raw materials, saves energy, and keeps waste out of landfills and oceans.',
      fact: '💡 Did you know? Recycling 1 ton of paper saves 17 trees and 7,000 gallons of water!'
    },

    biodegradable: {
      examples: ['Food scraps', 'Vegetable peels', 'Garden leaves', 'Coffee grounds'],
      instructions: [
        'Compost at home if possible or use the green organics bin.',
        'Avoid adding plastics, metals, or glass to organics.',
        'Drain liquids to reduce moisture and odors.'
      ],
      bin: 'Green or Organics Bin',
      why: 'Biodegradable waste can be turned into compost or fertilizer, reducing landfill use and creating valuable nutrients for soil.',
      fact: '🌱 Fun fact: Around 50% of household waste is biodegradable and can be composted instead of dumped!'
    },

    hazardous: {
      examples: ['Batteries', 'Paints & solvents', 'Chemicals', 'Medical sharps'],
      instructions: [
        'Never place in household bins.',
        'Bring to designated hazardous waste facilities or collection events.',
        'Store in original containers with labels when possible.',
        'Keep away from children and pets.'
      ],
      bin: 'Authorized Hazardous Waste Facility',
      why: 'Hazardous waste contains toxic substances that can contaminate soil, water, and air if not handled properly.',
      fact: '⚠️ Did you know? A single AA battery can pollute up to 500 liters of water if thrown in the trash.'
    },

    residual: {
      examples: ['Sanitary waste', 'Broken ceramics', 'Multi-layer packaging', 'Contaminated plastics'],
      instructions: [
        'Bag securely to prevent scattering.',
        'Do not mix with recyclables or organics.',
        'Reduce, reuse, and choose products with minimal packaging to cut residual waste.'
      ],
      bin: 'Black or General Waste Bin',
      why: 'Residual waste usually ends up in landfills and contributes the most to long-term pollution.',
      fact: '🗑 On average, each person generates about 0.7 kg of residual waste per day that cannot be reused or recycled.'
    },

    nonbio: {
      examples: ['Styrofoam', 'Certain plastics', 'Synthetic textiles'],
      instructions: [
        'Check local guidance; many non-biodegradables may be recyclable via special programs.',
        'Keep clean and dry if recycling is available.',
        'Avoid burning; it releases toxic fumes.'
      ],
      bin: 'Depends on local guidance; often General Waste or Special Collection',
      why: 'Non-biodegradable waste remains in the environment for hundreds of years, harming wildlife and clogging waterways.',
      fact: '🚯 Did you know? A single plastic bag can take up to 1,000 years to decompose in a landfill.'
    },

    ewaste: {
      examples: ['Phones', 'Laptops', 'Cables', 'Small electronics'],
      instructions: [
        'Erase personal data from devices before drop-off.',
        'Do not dispose in general waste or recycling bins.',
        'Take to certified e-waste collection centers or retail take-back programs.'
      ],
      bin: 'Certified E-Waste Collection Center',
      why: 'E-waste contains valuable metals like gold and copper but also harmful toxins like lead and mercury, making proper disposal essential.',
      fact: '📱 Fun fact: Recycling 1 million cell phones recovers about 24 kg of gold and 250 kg of silver!'
    }
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

  const selectedCategory = categories.find(c => c.id === selectedId);

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
        <View style={styles.detailWrapper}>
          {/* Sticky Header */}
          <View style={[styles.detailHeader, { backgroundColor: '#F6F7E8' }]}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedId(null)}>
              <Feather name="arrow-left" size={20} color={colors.primary} />
              <Text style={[styles.backText, { color: colors.primary }]}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.detailTitle}>{selectedCategory?.label || 'Waste Category'}</Text>
            <View style={{ width: 60 }} />
          </View>
          
          {/* Scrollable Content */}
          <ScrollView contentContainerStyle={styles.detailContainer} showsVerticalScrollIndicator={false}>

          {/* Why Card */}
          <View style={styles.detailCard}>
            <View style={styles.sectionHeader}>
              <Feather name="info" size={24} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>Why is this important?</Text>
            </View>
            <Text style={styles.sectionBody}>{CATEGORY_GUIDE[selectedId]?.why}</Text>
          </View>

          {/* Bin Information Card */}
          <View style={styles.detailCard}>
            <View style={styles.sectionHeader}>
              <Feather name="trash-2" size={24} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>Which bin?</Text>
            </View>
            <Text style={styles.sectionBody}>{CATEGORY_GUIDE[selectedId]?.bin}</Text>
          </View>

          {/* Instructions Card */}
          <View style={styles.detailCard}>
            <View style={styles.sectionHeader}>
              <Feather name="settings" size={24} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>Instructions</Text>
            </View>
            {CATEGORY_GUIDE[selectedId]?.instructions.map((instruction, index) => (
              <Text key={index} style={[styles.sectionBody, { marginBottom: 8 }]}>
                • {instruction}
              </Text>
            ))}
          </View>

          {/* Examples Card */}
          <View style={styles.detailCard}>
            <View style={styles.sectionHeader}>
              <Feather name="list" size={24} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>Examples</Text>
            </View>
            {CATEGORY_GUIDE[selectedId]?.examples.map((example, index) => (
              <Text key={index} style={[styles.sectionBody, { marginBottom: 4 }]}>
                • {example}
              </Text>
            ))}
          </View>

          {/* Fun Fact Card */}
          <View style={styles.detailCard}>
            <View style={styles.sectionHeader}>
              <Feather name="zap" size={24} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>Fun Fact</Text>
            </View>
            <Text style={styles.sectionBody}>{CATEGORY_GUIDE[selectedId]?.fact}</Text>
          </View>
          </ScrollView>
        </View>
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
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 24,
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
    paddingVertical: 24,
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E6E6D1',
  },
  cardIconWrap: {
    width: '90%',
    height: undefined,
    aspectRatio: 88/62,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6E9',
    marginBottom: 12,
  },
  cardImage: {
    width: '70%',
    height: undefined,
    aspectRatio: 72/48,
  },
  cardLabel: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  detailWrapper: {
    flex: 1,
  },
  detailContainer: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20 },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5ECD9',
    zIndex: 1000,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 60 },
  backText: { fontSize: 18, fontWeight: '600' },
  detailTitle: { fontSize: 24, fontWeight: '700', flex: 1, textAlign: 'center' },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#2D5016' },
  sectionBody: { fontSize: 18, color: '#374151', lineHeight: 26 },

});