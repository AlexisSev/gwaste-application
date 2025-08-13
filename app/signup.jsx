export const options = {
  tabBarStyle: { display: 'none' },
  headerShown: false,
};

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Lock, Phone, User } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, LogBox, Image as RNImage, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import InputField from '../components/ui/InputField';
import PrimaryButton from '../components/ui/PrimaryButton';
import { auth, db } from '../firebase';
LogBox.ignoreAllLogs(); // Ignore all log notifications

export default function SignupScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationId, setVerificationId] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [userType, setUserType] = useState('collector'); // Default to collector
  const router = useRouter();

  const handleSendOTP = async () => {
    if (!firstName || !lastName || !username || !phone || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    
    if (phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number.');
      return;
    }

    setLoading(true);
    try {
      // Format phone number for Firebase (add +1 for US, adjust for your country)
      const formattedPhone = phone.startsWith('+') ? phone : `+1${phone}`;
      
      // For now, we'll use a simple approach with email-based auth
      // since phone auth requires additional setup
      const tempEmail = `${username}@collector.local`;
      
      // Create user with temporary email
      const userCredential = await createUserWithEmailAndPassword(auth, tempEmail, password);
      const user = userCredential.user;

      // Store collector info in Firestore
      await setDoc(doc(db, "collectors", user.uid), {
        firstName,
        lastName,
        username,
        phone: formattedPhone,
        tempEmail, // Store the temp email for reference
        userType: 'collector',
        createdAt: new Date(),
        driver: username, // Add driver field for admin dropdown
        status: "active", // Add status field for admin dropdown
      });

      // Clear form
      setFirstName('');
      setLastName('');
      setUsername('');
      setPhone('');
      setPassword('');

      // Navigate to login or show success
      Alert.alert('Success', 'Collector account created successfully! You can now login with your username and password.');
      router.push('/login');
    } catch (error) {
      Alert.alert('Signup Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Logo */}
      <RNImage source={require('../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
      <View style={styles.form}>
        <ThemedText type="title" style={styles.title}>Create Collector Account</ThemedText>
        <ThemedText style={styles.subtitle}>Fill your information below to register as a waste collector.</ThemedText>
        <InputField
          icon={<User size={22} color="#8BC500" />}
          placeholder="First Name"
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
          autoCorrect={false}
          style={styles.input}
        />
        <InputField
          icon={<User size={22} color="#8BC500" />}
          placeholder="Last Name"
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
          autoCorrect={false}
          style={styles.input}
        />
        <InputField
          icon={<User size={22} color="#8BC500" />}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        <InputField
          icon={<Phone size={22} color="#8BC500" />}
          placeholder="Phone number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          style={styles.input}
        />
        <InputField
          icon={<Lock size={22} color="#8BC500" />}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          iconRight={<Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#8BC500" />}
          onIconPress={() => setShowPassword((v) => !v)}
          style={styles.input}
        />
        <PrimaryButton onPress={handleSendOTP} style={styles.button} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Collector Account</Text>
          )}
        </PrimaryButton>
        <TouchableOpacity onPress={() => router.push('/login')}>
          <ThemedText type="link" style={styles.link}>
            Already have an account?
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  logo: {
    width: 200,
    height: 90,
    marginBottom: 20,
  },
  illustration: {
    width: 150,
    height: 120,
    marginTop: 20,
  },
  form: {
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 24,
    color: '#888',
    textAlign: 'center',
  },
  input: {
    width: '100%',
    marginVertical: 8,
  },
  button: {
    width: '100%',
    marginVertical: 12,
    borderRadius: 12,
    backgroundColor: '#458A3D',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  link: {
    color: '#8BC500',
    marginTop: 8,
    textAlign: 'center',
  },

}); 