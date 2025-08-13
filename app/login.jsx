export const options = {
  tabBarStyle: { display: 'none' },
  headerShown: false,
};

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Lock, User } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image as RNImage, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import InputField from '../components/ui/InputField';
import PrimaryButton from '../components/ui/PrimaryButton';
import { useCollectorAuth } from '../hooks/useCollectorAuth';

function LoginScreen() {
  const [firstName, setFirstName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useCollectorAuth();

  const handleCollectorLogin = async () => {
    if (!firstName || !password) {
      Alert.alert('Error', 'Please enter both first name and password.');
      return; 
    }
    
    setLoading(true);
    try {
      const collectorData = await login(firstName, password);
      Alert.alert('Success', `Welcome back, ${collectorData.firstName}!`);
      router.replace('/(tabs)/home');
    } catch (error) {
      Alert.alert('Login Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Logo */}
      <RNImage source={require('../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
      <View style={styles.form}>
        <ThemedText type="title" style={styles.title}>Collector Login</ThemedText>
        <ThemedText style={styles.subtitle}>Please log in with your first name and password.</ThemedText>
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
          icon={<Lock size={22} color="#8BC500" />}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          iconRight={<Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#8BC500" />}
          onIconPress={() => setShowPassword((v) => !v)}
          style={styles.input}
        />
        <PrimaryButton onPress={handleCollectorLogin} style={styles.button} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Log In</Text>
          )}
        </PrimaryButton>
        <TouchableOpacity onPress={() => router.push('/signup')}>
          <ThemedText type="link" style={styles.link}>
            Don't have an account?
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    width: 200,
    height: 90,
    marginBottom: 20,
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

export default LoginScreen;