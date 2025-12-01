import React from 'react';
import { Image as RNImage, StyleSheet, Text, View } from 'react-native';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <RNImage
        source={require('../assets/images/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Gwaste</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 250,
    height: 120,
    marginBottom: 8,
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    color: '#a6d71e',
    letterSpacing: 1,
    textAlign: 'center',
    fontFamily: 'KumbhSans',
  },
});


