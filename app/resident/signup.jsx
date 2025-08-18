import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import InputField from '../../components/ui/InputField';
import PrimaryButton from '../../components/ui/PrimaryButton';
import { Colors } from '../../constants/Colors';
import { db } from '../../firebase';
import { useColorScheme } from '../../hooks/useColorScheme';

export default function ResidentSignup() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!fullName.trim() || !address.trim() || !phone.trim()) {
      Alert.alert('Missing info', 'Please fill out name, address, and phone.');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'residents'), {
        fullName: fullName.trim(),
        email: email.trim() || null,
        address: address.trim(),
        phone: phone.trim(),
        createdAt: serverTimestamp(),
      });
      Alert.alert('Success', 'Signup successful. You can now log in.');
      router.replace('/login');
    } catch (err) {
      Alert.alert('Error', err?.message || 'Could not complete signup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.primary }]}>Resident Sign Up</Text>
      <Text style={styles.subtitle}>Create your resident profile</Text>

      <InputField
        icon={<Feather name="user" size={20} color={colors.primary} />}
        placeholder="Full Name"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
        style={styles.input}
      />
      <InputField
        icon={<Feather name="mail" size={20} color={colors.primary} />}
        placeholder="Email (optional)"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />
      <InputField
        icon={<Feather name="map-pin" size={20} color={colors.primary} />}
        placeholder="Address"
        value={address}
        onChangeText={setAddress}
        style={styles.input}
      />
      <InputField
        icon={<Feather name="phone" size={20} color={colors.primary} />}
        placeholder="Phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        style={styles.input}
      />

      <PrimaryButton onPress={handleSignup} style={styles.button}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign Up</Text>
        )}
      </PrimaryButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    color: '#7E8A7E',
    marginBottom: 18,
  },
  input: {
    marginVertical: 8,
  },
  button: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#458A3D',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});


