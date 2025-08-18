import { useRouter } from 'expo-router';
import { Image as RNImage, StyleSheet, Text, View } from 'react-native';
import PrimaryButton from '../components/ui/PrimaryButton';

export default function HomeScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      {/* Logo and Tagline Section */}
      <View style={styles.headerSection}>
      <RNImage source={require('../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.tagline}>
          Efficient waste collection management system.
        </Text>
      </View>
      
      {/* Illustration Section */}
      <View style={styles.illustrationSection}>
        <RNImage source={require('../assets/images/illustration.png')} style={styles.illustration} resizeMode="contain" />
      </View>
      
      {/* Buttons Section */}
      <View style={styles.buttonSection}>
        <PrimaryButton
          onPress={() => router.push('/resident/signup')}
          style={styles.signUpButton}
        >
          <Text style={styles.signUpButtonText}>Sign Up</Text>
        </PrimaryButton>
        
        <PrimaryButton
          onPress={() => router.push('/login')}
          style={styles.signInButton}
        >
          <Text style={styles.signInButtonText}>Sign In</Text>
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
    width: 250,
    height: 100,
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
    width: 350,
    height: 290,
  },
  buttonSection: {
    paddingBottom: 40,
    gap: 16,
  },
  signUpButton: {
    backgroundColor: '#458A3D',
    marginBottom: 9,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
  },
  signUpButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 18,
    textAlign: 'center',
  },
  signInButton: {
    backgroundColor: '#fff',
    borderColor: '#458A3D',
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
  },
  signInButtonText: {
    color: '#458A3D',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 