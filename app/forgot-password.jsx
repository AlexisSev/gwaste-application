import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import { Lock, Phone, User } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image as RNImage, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import InputField from '../components/ui/InputField';
import PrimaryButton from '../components/ui/PrimaryButton';
import { sendOTPSMS, verifyOTP } from '../services/otpService';
import { supabase } from '../services/supabaseClient';
import { vw, responsiveFontSize } from '../utils/responsive';

function ForgotPasswordScreen() {
  const [step, setStep] = useState(1); // 1: Enter identifier, 2: Enter OTP, 3: Reset password
  const [identifier, setIdentifier] = useState(''); // First name or phone number
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState(null); // 'resident' or 'collector'
  const [userData, setUserData] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const router = useRouter();

  const formatPhoneNumber = (value = "") => {
    try {
      if (!value || typeof value !== "string") return null;
      const digits = value.replace(/\D/g, "");
      if (!digits) return null;

      let normalized = digits;
      if (normalized.startsWith("0")) normalized = "63" + normalized.substring(1);
      else if (normalized.length === 10) normalized = "63" + normalized;
      else if (!normalized.startsWith("63")) normalized = `63${normalized}`;

      const e164 = `+${normalized}`;
      return /^\+63\d{10}$/.test(e164) ? e164 : null;
    } catch (_err) {
      return null;
    }
  };

  const handleFindUser = async () => {
    if (!identifier.trim()) {
      Alert.alert('Error', 'Please enter your first name or phone number.');
      return;
    }

    setLoading(true);
    try {
      const identifierTrimmed = identifier.trim();
      const formattedPhone = formatPhoneNumber(identifierTrimmed);

      // Try to find as resident first
      let residentMatch = null;
      if (formattedPhone) {
        // Search by phone number
        const { data: residents, error: resErr } = await supabase
          .from('residents')
          .select('*')
          .eq('phone_number', formattedPhone)
          .maybeSingle();
        
        if (!resErr && residents) {
          residentMatch = residents;
        }
      }

      // If not found by phone, try by first name
      if (!residentMatch) {
        const { data: residents, error: resErr } = await supabase
          .from('residents')
          .select('*')
          .ilike('first_name', identifierTrimmed)
          .limit(20);
        
        if (!resErr && Array.isArray(residents)) {
          residentMatch = residents.find(
            r => String(r.first_name || '').trim().toLowerCase() === identifierTrimmed.toLowerCase()
          ) || null;
        }
      }

      if (residentMatch && residentMatch.phone_number) {
        setUserType('resident');
        setUserData(residentMatch);
        setPhoneNumber(residentMatch.phone_number);
        await sendOTP(residentMatch.phone_number);
        return;
      }

      // Try collector
      let collectorMatch = null;
      if (formattedPhone) {
        const { data: collectors, error: colErr } = await supabase
          .from('collectors')
          .select('*')
          .eq('contact', formattedPhone)
          .maybeSingle();
        
        if (!colErr && collectors) {
          collectorMatch = collectors;
        }
      }

      if (!collectorMatch) {
        const { data: collectors, error: colErr } = await supabase
          .from('collectors')
          .select('*')
          .ilike('firstName', identifierTrimmed)
          .limit(20);
        
        if (!colErr && Array.isArray(collectors)) {
          collectorMatch = collectors.find(
            c => String(c.firstName || '').trim().toLowerCase() === identifierTrimmed.toLowerCase()
          ) || null;
        }
      }

      if (collectorMatch && collectorMatch.contact) {
        setUserType('collector');
        setUserData(collectorMatch);
        setPhoneNumber(collectorMatch.contact);
        await sendOTP(collectorMatch.contact);
        return;
      }

      Alert.alert('Not Found', 'No account found with that first name or phone number. Please check and try again.');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to find user account.');
    } finally {
      setLoading(false);
    }
  };

  const sendOTP = async (phone) => {
    try {
      const result = await sendOTPSMS(phone);
      if (result.success) {
        setStep(2);
        Alert.alert('OTP Sent', `A verification code has been sent to ${phone}. Please check your SMS.`);
      } else {
        Alert.alert('Error', result.error || 'Failed to send OTP. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send OTP.');
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim() || otp.trim().length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP code.');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyOTP(phoneNumber, otp.trim());
      if (result.success) {
        setStep(3);
        Alert.alert('Verified', 'OTP verified successfully. Please enter your new password.');
      } else {
        Alert.alert('Error', result.error || 'Invalid or expired OTP. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to verify OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim() || newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match. Please try again.');
      return;
    }

    setLoading(true);
    try {
      if (userType === 'resident') {
        // For residents, store password as plain text (matching login.jsx logic)
        const { error } = await supabase
          .from('residents')
          .update({ password: newPassword.trim() })
          .eq('id', userData.id);

        if (error) throw error;
      } else if (userType === 'collector') {
        // For collectors, hash the password
        const hashedPassword = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          newPassword.trim()
        );

        const { error } = await supabase
          .from('collectors')
          .update({ password: hashedPassword })
          .eq('id', userData.id);

        if (error) throw error;
      }

      Alert.alert(
        'Success',
        'Your password has been reset successfully. You can now log in with your new password.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/login'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      await sendOTP(phoneNumber);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <RNImage source={require('../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
        
        <View style={styles.form}>
          <ThemedText type="title" style={styles.title}>Forgot Password</ThemedText>
          
          {step === 1 && (
            <>
              <ThemedText style={styles.subtitle}>
                Enter your first name or phone number to receive a verification code.
              </ThemedText>
              <InputField
                icon={<User size={22} color="#8BC500" />}
                placeholder="First Name or Phone Number"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="words"
                autoCorrect={false}
                keyboardType="default"
                style={styles.input}
              />
              <PrimaryButton onPress={handleFindUser} style={styles.button} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Send Verification Code</Text>
                )}
              </PrimaryButton>
            </>
          )}

          {step === 2 && (
            <>
              <ThemedText style={styles.subtitle}>
                Enter the 6-digit verification code sent to {phoneNumber}
              </ThemedText>
              <InputField
                icon={<Phone size={22} color="#8BC500" />}
                placeholder="Enter OTP Code"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                style={styles.input}
              />
              <PrimaryButton onPress={handleVerifyOTP} style={styles.button} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Verify Code</Text>
                )}
              </PrimaryButton>
              <TouchableOpacity onPress={handleResendOTP} style={styles.resendContainer} disabled={loading}>
                <Text style={styles.resendText}>Didn`t receive code? Resend</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 3 && (
            <>
              <ThemedText style={styles.subtitle}>
                Enter your new password below.
              </ThemedText>
              <InputField
                icon={<Lock size={22} color="#8BC500" />}
                placeholder="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
                iconRight={<Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#8BC500" />}
                onIconPress={() => setShowPassword((v) => !v)}
                style={styles.input}
              />
              <InputField
                icon={<Lock size={22} color="#8BC500" />}
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                iconRight={<Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={22} color="#8BC500" />}
                onIconPress={() => setShowConfirmPassword((v) => !v)}
                style={styles.input}
              />
              <PrimaryButton onPress={handleResetPassword} style={styles.button} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Reset Password</Text>
                )}
              </PrimaryButton>
            </>
          )}

          <TouchableOpacity onPress={() => router.replace('/login')} style={styles.backContainer}>
            <Ionicons name="arrow-back" size={20} color="#8BC500" />
            <Text style={styles.backText}>Back to Login</Text>
          </TouchableOpacity>
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
    fontSize: responsiveFontSize(14),
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
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
    color: '#fff',
  },
  resendContainer: {
    marginTop: 12,
    paddingVertical: 8,
  },
  resendText: {
    color: '#8BC500',
    fontSize: responsiveFontSize(14),
    fontWeight: '500',
  },
  backContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 8,
  },
  backText: {
    color: '#8BC500',
    fontSize: responsiveFontSize(14),
    fontWeight: '500',
    marginLeft: 6,
  },
});

export default ForgotPasswordScreen;

