import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Lock, User } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Platform, Image as RNImage, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import InputField from '../components/ui/InputField';
import PrimaryButton from '../components/ui/PrimaryButton';
import { useCollectorAuth } from '../hooks/useCollectorAuthSupabase';
import { useResidentAuth } from '../hooks/useResidentAuth';
import { vw } from '../utils/responsive';

function LoginScreen() {
  const [firstName, setFirstName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);
  const router = useRouter();
  const { login: residentLogin } = useResidentAuth();
  const { login: collectorLogin } = useCollectorAuth();

  // Load saved credentials on mount and auto-fill
  useEffect(() => {
    loadSavedCredentials();
  }, []);

  // Check if user is typing a different name and clear saved credentials
  useEffect(() => {
    const checkUserChange = async () => {
      if (firstName.trim()) {
        const isDifferent = await checkIfDifferentUser(firstName);
        if (isDifferent) {
          setPassword('');
          setRememberPassword(false);
        }
      }
    };
    checkUserChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstName]);

  const loadSavedCredentials = async () => {
    try {
      const saved = await AsyncStorage.getItem('rememberedCredentials');
      if (saved) {
        const credentials = JSON.parse(saved);
        // Only auto-fill if we have valid credentials with user type
        if (credentials.firstName && credentials.password && credentials.userType) {
          setFirstName(credentials.firstName);
          setPassword(credentials.password);
          setRememberPassword(true);
        }
      }
    } catch (error) {
      console.error('Error loading saved credentials:', error);
    }
  };

  const saveCredentials = async (firstName, password, userType) => {
    try {
      const credentials = { firstName, password, userType };
      await AsyncStorage.setItem('rememberedCredentials', JSON.stringify(credentials));
    } catch (error) {
      console.error('Error saving credentials:', error);
    }
  };

  const checkIfDifferentUser = useCallback(async (firstName) => {
    try {
      const saved = await AsyncStorage.getItem('rememberedCredentials');
      if (saved) {
        const credentials = JSON.parse(saved);
        // If saved firstName doesn't match current firstName, clear saved credentials
        if (credentials.firstName && credentials.firstName.toLowerCase() !== firstName.toLowerCase()) {
          await clearSavedCredentials();
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error checking saved user:', error);
      return false;
    }
  }, []);

  const clearSavedCredentials = async () => {
    try {
      await AsyncStorage.removeItem('rememberedCredentials');
    } catch (error) {
      console.error('Error clearing saved credentials:', error);
    }
  };


  const handleCollectorLogin = async () => {
    if (!firstName || !password) {
      Alert.alert('Error', 'Please enter both first name and password.');
      return; 
    }
    
    setLoading(true);
    try {
      // Check if a different user is trying to log in
      const isDifferentUser = await checkIfDifferentUser(firstName);
      if (isDifferentUser) {
        // Clear form if different user
        setRememberPassword(false);
      }

      // Try resident login first using the auth hook
      try {
        const residentData = await residentLogin(firstName, password);
        
        // Save credentials if "Remember Password" is checked
        if (rememberPassword) {
          await saveCredentials(firstName, password, 'resident');
        } else {
          await clearSavedCredentials();
        }
        
        Alert.alert('Success', `Welcome, ${residentData.first_name}!`);
        router.replace('/resident');
        return;
      } catch (residentError) {
        console.log('Resident login failed, trying collector login:', residentError.message);
      }

      // Fall back to collector login
      const collectorData = await collectorLogin(firstName, password);
      
      // Save credentials if "Remember Password" is checked
      if (rememberPassword) {
        await saveCredentials(firstName, password, 'collector');
      } else {
        await clearSavedCredentials();
      }
      
      Alert.alert('Success', `Welcome back, ${collectorData.firstName}!`);
      router.replace('/collector/home');
    } catch (error) {
      Alert.alert('Login Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push('/forgot-password');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView 
        contentContainerStyle={styles.container} 
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
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
        
        <View style={styles.optionsRow}>
          <TouchableOpacity 
            style={styles.rememberContainer}
            onPress={() => setRememberPassword(!rememberPassword)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, rememberPassword && styles.checkboxChecked]}>
              {rememberPassword && <Ionicons name="checkmark" size={10} color="#fff" />}
            </View>
            <Text style={styles.rememberText}>Remember password</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPasswordContainer}>
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>
        </View>
      
        <PrimaryButton onPress={handleCollectorLogin} style={styles.button} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Log In</Text>
          )}
        </PrimaryButton>
          <Text style={styles.link}>
            Don`t have an account?{" "}
            <Text 
              style={styles.linkText} 
              onPress={() => {
                Keyboard.dismiss();
                setTimeout(() => {
                  router.replace('/signup');
                }, 100);
              }}
            >
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
    marginTop: 12,
    textAlign: 'center',
    fontSize: 15,
  },
  linkText: {
    color: '#2196F3',
    fontWeight: '600',
    fontSize: 15,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 4,
    marginBottom: 8,
  },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 2,
    borderColor: '#8BC500',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#8BC500',
  },
  rememberText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '500',
  },
  forgotPasswordContainer: {
    // Removed alignSelf: 'flex-end' since it's in a flex row now
  },
  forgotPasswordText: {
    color: '#8BC500',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default LoginScreen;