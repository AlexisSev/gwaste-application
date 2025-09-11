import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '../../../constants/Colors';
import { useColorScheme } from '../../../hooks/useColorScheme';

const CATEGORY_TITLES = {
  recyclable: 'Recyclable Waste',
  biodegradable: 'Biodegradable Waste',
  hazardous: 'Hazardous Waste',
  residual: 'Residual Waste',
  nonbio: 'Non-Biodegradable Waste',
  ewaste: 'E-Waste (Electronic Waste)'
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
  // ... keep the rest of the categories as in your code
};

export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const title = CATEGORY_TITLES[id] ?? 'Waste Category';
  const guide = CATEGORY_GUIDE[id] ?? {
    examples: [],
    instructions: ['No details found for this category.'],
    bin: 'Check local guidance',
    why: '',
    fact: ''
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="auto" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Optional illustration */}
        {id === 'recyclable' && (
          <Image
            source={require('../../../assets/images/recyclable.png')}
            style={{ width: '100%', height: 150, resizeMode: 'contain', marginBottom: 20 }}
          />
        )}

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Which bin?</Text>
          <Text style={styles.sectionBody}>{guide.bin}</Text>
        </View>

        {guide.examples.length > 0 && (
          <View style={styles.card}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Common examples</Text>
            {guide.examples.map((ex, idx) => (
              <Text key={idx} style={styles.listItem}>
                • {ex}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>How to prepare</Text>
          {guide.instructions.map((ins, idx) => (
            <Text key={idx} style={styles.listItem}>
              • {ins}
            </Text>
          ))}
        </View>

        {guide.why && (
          <View style={styles.card}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Why it matters</Text>
            <Text style={styles.sectionBody}>{guide.why}</Text>
          </View>
        )}

        {guide.fact && (
          <View style={styles.factBox}>
            <Text style={styles.factText}>{guide.fact}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5ECD9',
    backgroundColor: '#FFFFFF'
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 60 },
  backText: { fontSize: 14, fontWeight: '600' },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
    paddingHorizontal: 8
  },
  content: { padding: 16, paddingBottom: 32 },
  card: {
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
  listItem: { fontSize: 14, color: '#374151', marginBottom: 4 },
  factBox: {
    backgroundColor: '#E6F9EC',
    borderLeftWidth: 4,
    borderLeftColor: '#16A34A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20
  },
  factText: { color: '#166534', fontWeight: '600', fontSize: 14 }
});
