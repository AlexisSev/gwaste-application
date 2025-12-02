import React, { useEffect } from 'react';
import { View, Image, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => {
      // After splash, go to your existing landing page
      router.replace('/landing');
    }, 2000); // 2 seconds

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>G-Waste</Text>
      <Text style={styles.subtitle}>Smart Waste Management</Text>
      <ActivityIndicator size="large" color="#2E7D32" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F5E8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#388E3C',
    textAlign: 'center',
  },
  spinner: {
    marginTop: 24,
  },
});


