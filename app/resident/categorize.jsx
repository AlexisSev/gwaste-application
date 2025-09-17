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

  // Grid icons/images
  const categoryImages = {
    recyclable: require('../../assets/images/paper.png'),
    biodegradable: require('../../assets/images/biodegradable.png'),
    hazardous: require('../../assets/images/battery.png'),
    nonbio: require('../../assets/images/non-biodegradable.png'),
    ewaste: require('../../assets/images/phone.png'),
  };

  // Detail screen showcase images
  const categoryDetailImages = {
    recyclable: require('../../assets/images/recyclables.png'),
    biodegradable: require('../../assets/images/bio.png'),
    hazardous: require('../../assets/images/hazardous.png'),
    nonbio: require('../../assets/images/nonbio.png'),
    ewaste: require('../../assets/images/ewaste.png'),
  };

  const CATEGORY_GUIDE = {
    recyclable: {
      examples: ['Paper, cardboard', 'Plastic bottles (rinsed)', 'Glass jars (clean)', 'Metal cans'],
      instructions: [
        'Rinse containers to remove food residue.',
        'Flatten cardboard boxes to save space.',
        'Separate glass, paper, metal if required by your locality.',
        'Do not include plastic bags or greasy pizza boxes.',
      ],
      bin: 'Blue or Recyclables Bin',
      why: 'Recycling reduces the need for raw materials, saves energy, and keeps waste out of landfills and oceans.',
      fact: '💡 Did you know? Recycling 1 ton of paper saves 17 trees and 7,000 gallons of water!',
    },
    biodegradable: {
      examples: ['Food scraps', 'Vegetable peels', 'Garden leaves', 'Coffee grounds'],
      instructions: [
        'Compost at home if possible or use the green organics bin.',
        'Avoid adding plastics, metals, or glass to organics.',
        'Drain liquids to reduce moisture and odors.',
      ],
      bin: 'Green or Organics Bin',
      why: 'Biodegradable waste can be turned into compost or fertilizer, reducing landfill use and creating valuable nutrients for soil.',
      fact: '🌱 Fun fact: Around 50% of household waste is biodegradable and can be composted instead of dumped!',
    },
    hazardous: {
      examples: ['Batteries', 'Paints & solvents', 'Chemicals', 'Medical sharps'],
      instructions: [
        'Never place in household bins.',
        'Bring to designated hazardous waste facilities or collection events.',
        'Store in original containers with labels when possible.',
        'Keep away from children and pets.',
      ],
      bin: 'Authorized Hazardous Waste Facility',
      why: 'Hazardous waste contains toxic substances that can contaminate soil, water, and air if not handled properly.',
      fact: '⚠️ Did you know? A single AA battery can pollute up to 500 liters of water if thrown in the trash.',
    },
    nonbio: {
      examples: ['Styrofoam', 'Certain plastics', 'Synthetic textiles'],
      instructions: [
        'Check local guidance; many non-biodegradables may be recyclable via special programs.',
        'Keep clean and dry if recycling is available.',
        'Avoid burning; it releases toxic fumes.',
      ],
      bin: 'Depends on local guidance; often General Waste or Special Collection',
      why: 'Non-biodegradable waste remains in the environment for hundreds of years, harming wildlife and clogging waterways.',
      fact: '🚯 Did you know? A single plastic bag can take up to 1,000 years to decompose in a landfill.',
    },
    ewaste: {
      examples: ['Phones', 'Laptops', 'Cables', 'Small electronics'],
      instructions: [
        'Erase personal data from devices before drop-off.',
        'Do not dispose in general waste or recycling bins.',
        'Take to certified e-waste collection centers or retail take-back programs.',
      ],
      bin: 'Certified E-Waste Collection Center',
      why: 'E-waste contains valuable metals like gold and copper but also harmful toxins like lead and mercury, making proper disposal essential.',
      fact: '📱 Fun fact: Recycling 1 million cell phones recovers about 24 kg of gold and 250 kg of silver!',
    },
  };

  const categories = [
    { id: 'recyclable', label: 'Recyclable Waste' },
    { id: 'biodegradable', label: 'Biodegradable' },
    { id: 'hazardous', label: 'Hazardous Waste' },
    { id: 'nonbio', label: 'Non-Biodegradable' },
    { id: 'ewaste', label: 'E-Waste' },
  ];

  const [selectedId, setSelectedId] = useState(null);

  const handlePressCategory = (id) => {
    setSelectedId(id);
  };

  const selectedCategory = categories.find((c) => c.id === selectedId);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.gridItem}
      onPress={() => handlePressCategory(item.id)}
      activeOpacity={0.85}>
      <View style={styles.cardIconWrap}>
        <Image source={categoryImages[item.id]} style={styles.cardImage} resizeMode="contain" />
      </View>
      <Text numberOfLines={2} style={styles.cardLabel}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#f5f5f5' }]}>
      <StatusBar style="auto" />

      {/* Show header ONLY when no category is selected */}
      {!selectedId && (
        <View style={styles.hero}>
          <Text style={[styles.heroTitle, { color: colors.primary }]}>Waste Sorting Guide</Text>
          <Text style={[styles.heroSubtitle, { color: colors.primary }]}>
            See which bin each item goes to based{'\n'}on its category.
          </Text>
        </View>
      )}

      {/* Content */}
      {selectedId ? (
        <View style={styles.detailWrapper}>
          {/* Sticky Header with back button */}
          <View style={styles.detailHeader}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedId(null)}>
              <Feather name="arrow-left" size={22} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.detailTitle}>{selectedCategory?.label || 'Waste Category'}</Text>
            <View style={{ width: 22 }} />
          </View>

          {/* Scrollable Content */}
          <ScrollView contentContainerStyle={styles.detailContainer} showsVerticalScrollIndicator={false}>
            {/* Image + Title */}
            <View style={styles.imageWrap}>
              <Image source={categoryDetailImages[selectedId]} style={styles.detailImage} resizeMode="contain" />
              <Text style={styles.detailHeading}>{selectedCategory?.label}</Text>
            </View>

            {/* Examples */}
            <View style={styles.detailCard}>
              <View style={styles.sectionHeader}>
                <Feather name="list" size={20} color="#2D5016" />
                <Text style={styles.sectionTitle}>Examples</Text>
              </View>
              {CATEGORY_GUIDE[selectedId].examples.map((ex, idx) => (
                <Text key={idx} style={styles.sectionBody}>
                  • {ex}
                </Text>
              ))}
            </View>

            {/* Instructions */}
            <View style={styles.detailCard}>
              <View style={styles.sectionHeader}>
                <Feather name="check-circle" size={20} color="#2D5016" />
                <Text style={styles.sectionTitle}>How to Dispose</Text>
              </View>
              {CATEGORY_GUIDE[selectedId].instructions.map((inst, idx) => (
                <Text key={idx} style={styles.sectionBody}>
                  • {inst}
                </Text>
              ))}
            </View>

            {/* Bin */}
            <View style={styles.detailCard}>
              <View style={styles.sectionHeader}>
                <Feather name="trash-2" size={20} color="#2D5016" />
                <Text style={styles.sectionTitle}>Correct Bin</Text>
              </View>
              <Text style={styles.sectionBody}>{CATEGORY_GUIDE[selectedId].bin}</Text>
            </View>

            {/* Why Important */}
            <View style={styles.detailCard}>
              <View style={styles.sectionHeader}>
                <Feather name="info" size={20} color="#2D5016" />
                <Text style={styles.sectionTitle}>Why Important</Text>
              </View>
              <Text style={styles.sectionBody}>{CATEGORY_GUIDE[selectedId].why}</Text>
            </View>

            {/* Fun Fact */}
            <View style={styles.detailCard}>
              <View style={styles.sectionHeader}>
                <Feather name="star" size={20} color="#2D5016" />
                <Text style={styles.sectionTitle}>Did You Know?</Text>
              </View>
              <Text style={styles.sectionBody}>{CATEGORY_GUIDE[selectedId].fact}</Text>
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

const PALE_BG = '#f5f5f5';
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
  imageWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  detailImage: {
    width: 300,
    height: 300,
    marginBottom: 12,
  },
  detailHeading: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    color: '#2D5016',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  gridContainer: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 26,
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E6E6D1',
  },
  cardImage: {
    width: '50%',
    height: undefined,
    aspectRatio: 1,
  },
  cardLabel: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '700',
    color: '#374151',
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
    backgroundColor: PALE_BG,
    zIndex: 1000,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', width: 60 },
  detailTitle: { fontSize: 24, fontWeight: '700', flex: 1, textAlign: 'center' },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#2D5016' },
  sectionBody: { fontSize: 18, color: '#374151', lineHeight: 26 },
});