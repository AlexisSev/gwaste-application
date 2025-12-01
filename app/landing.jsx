import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image as RNImage, StyleSheet, Text, View } from 'react-native';
import SplashScreen from '../components/SplashScreen';
import PrimaryButton from '../components/ui/PrimaryButton';
import { vw } from '../utils/responsive';

export default function HomeScreen() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1500); // 4 seconds

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <View style={styles.container}>
      {/* Logo and Tagline Section */}
      <View style={styles.headerSection}>
        <RNImage
          source={require('../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.tagline}>
          Efficient waste collection management system.
        </Text>
      </View>

      {/* Illustration Section */}
      <View style={styles.illustrationSection}>
        <RNImage
          source={require('../assets/images/illustration.png')}
          style={styles.illustration}
          resizeMode="contain"
        />
      </View>

      {/* Button Section */}
      <View style={styles.buttonSection}>
        <PrimaryButton
          onPress={() => router.push('/login')}
          style={styles.getStartedButton}
        >
          <Text style={styles.getStartedButtonText}>Get Started</Text>
        </PrimaryButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  headerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 0,
  },
  logo: {
    width: Math.min(vw(60), 280),
    height: Math.min(vw(24), 120),
  },
  tagline: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 1,
    marginBottom: 0,
  },
  illustrationSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 0,
  },
  illustration: {
    width: Math.min(vw(88), 420),
    height: undefined,
    aspectRatio: 350/290,
  },
  buttonSection: {
    paddingBottom: 40,
    gap: 16,
  },
  getStartedButton: {
    backgroundColor: '#458A3D',
    marginBottom: 9,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
  },
  getStartedButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 18,
    textAlign: 'center',
  },
}); 