import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image as RNImage, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PrimaryButton from '../components/ui/PrimaryButton';
import { useNotification } from '../hooks/useInAppNotification';
import { responsiveFontSize, vw } from '../utils/responsive';

export default function HomeScreen() {
  const router = useRouter();
  const { showNotification } = useNotification();
  
  const handleTestNotification = () => {
    showNotification({
      title: 'Welcome to G-Waste!',
      message: 'This is a test notification from your landing page.',
      type: 'success',
      duration: 3000
    });
  };
  
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
          onPress={() => router.push('/signup')}
          style={styles.getStartedButton}
        >
          <Text style={styles.getStartedButtonText}>Get Started</Text>
        </PrimaryButton>
        
        {/* Test Notification Button */}
        <TouchableOpacity 
          style={styles.testButton}
          onPress={handleTestNotification}
        >
          <MaterialIcons name="notifications" size={20} color="#458A3D" />
          <Text style={styles.testButtonText}>Test Notification</Text>
        </TouchableOpacity>
        
        {/* Link to Full Test Page */}
        <TouchableOpacity 
          style={styles.testLink}
          onPress={() => router.push('/test/notification-test')}
        >
          <Text style={styles.testLinkText}>More Notification Tests →</Text>
        </TouchableOpacity>
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
    fontSize: responsiveFontSize(16),
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
    alignItems: 'center',
  },
  getStartedButton: {
    backgroundColor: '#458A3D',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
  },
  getStartedButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: responsiveFontSize(18),
    textAlign: 'center',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#458A3D',
    backgroundColor: '#F0F8EF',
    width: '100%',
  },
  testButtonText: {
    color: '#458A3D',
    fontWeight: '500',
    fontSize: responsiveFontSize(16),
    marginLeft: 8,
  },
  testLink: {
    marginTop: 12,
    padding: 8,
  },
  testLinkText: {
    color: '#666',
    fontSize: responsiveFontSize(14),
    textDecorationLine: 'underline',
  },
});