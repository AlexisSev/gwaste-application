import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Lock, User } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image as RNImage, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import InputField from '../components/ui/InputField';
import PrimaryButton from '../components/ui/PrimaryButton';
import { db } from '../firebase';
import { useCollectorAuth } from '../hooks/useCollectorAuth';
import { vw } from '../utils/responsive';

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
      // Try resident login first (query by firstName, then verify password)
      const residentsRef = collection(db, 'residents');
      const firstExactQuery = query(residentsRef, where('firstName', '==', firstName.trim()));
      let residentSnapshot = await getDocs(firstExactQuery);

      let residentMatch = null;
      if (!residentSnapshot.empty) {
        residentSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.password === password) {
            residentMatch = { id: doc.id, ...data };
          }
        });
      }

      // Fallback: case-insensitive scan if no exact match
      if (!residentMatch) {
        const allResidents = await getDocs(residentsRef);
        allResidents.forEach((doc) => {
          const data = doc.data();
          const firstLower = data.firstName ? String(data.firstName).trim().toLowerCase() : '';
          if (firstLower === firstName.trim().toLowerCase() && data.password === password) {
            residentMatch = { id: doc.id, ...data };
          }
        });
      }

      if (residentMatch) {
        Alert.alert('Success', `Welcome, ${residentMatch.firstName}!`);
        router.replace({
          pathname: '/resident',
          params: {
            firstName: residentMatch.firstName,
            purok: residentMatch.purok,
            address: residentMatch.address,
          }
        });
        return;
      }

      // Fall back to collector login
      const collectorData = await login(firstName, password);
      Alert.alert('Success', `Welcome back, ${collectorData.firstName}!`);
      router.replace('/collector/home');
    } catch (error) {
      Alert.alert('Login Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <RNImage source={require('../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
        <View style={styles.form}>
        <ThemedText type="title" style={styles.title}>Login</ThemedText>
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
          <Text style={styles.link}>
            Don't have an account?{" "}
            <Text style={styles.linkText} onPress={() => router.replace('/signup')}>
              Sign up here
            </Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    width: Math.min(vw(55), 240),
    height: undefined,
    aspectRatio: 200/90,
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
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  linkText: {
    color: '#87CEEB',
  },
});

export default LoginScreen;