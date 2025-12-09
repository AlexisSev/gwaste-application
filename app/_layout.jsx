 import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Platform } from 'react-native';
import { Notifications } from 'expo-notifications';
import { useEffect } from 'react';
// import 'react-native-reanimated';
import { CollectorAuthProvider } from '../hooks/useCollectorAuthSupabase';
import { useColorScheme } from '../hooks/useColorScheme';
import { NotificationProvider } from '../hooks/useInAppNotification';
import { ResidentAuthProvider } from '../hooks/useResidentAuth';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    // Only set up notifications on native platforms (not web)
    if (Platform.OS !== 'web') {

      // Get Expo push token for remote notifications
      const getExpoPushToken = async () => {
        try {
          const { data: pushToken } = await Notifications.getExpoPushTokenAsync();
          console.log('Expo push token obtained:', pushToken?.data);
          // Store token in AsyncStorage or send to server for remote notifications
          return pushToken?.data;
        } catch (error) {
          console.error('Error getting Expo push token:', error);
          return null;
        }
      };

      // Set up local notification handler if available
      if (Notifications?.setNotificationHandler) {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });

        // Request notification permissions
        const requestPermissions = async () => {
          try {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status === 'granted') {
              console.log('Notification permissions granted');
              // Get push token after permissions granted
              const token = await getExpoPushToken();
              if (token) {
                // Store token in profile or send to server
                console.log('Push token ready for storage:', token);
              }
            } else {
              console.log('Notification permissions denied');
              // You could show an alert here to guide user to settings
            }
            return status;
          } catch (error) {
            console.error('Error requesting notification permissions:', error);
            return 'error';
          }
        };

        requestPermissions();

        // Handle notification received when app is in foreground
        const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
          console.log('Local notification received in foreground:', notification);
        });

        // Handle notification pressed
        const backgroundSubscription = Notifications.addNotificationResponseReceivedListener(response => {
          console.log('Local notification pressed:', response);
          // You can add navigation or other logic here
        });

        return () => {
          backgroundSubscription?.remove();
          foregroundSubscription?.remove();
        };
      }
    }
  }, []);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <NotificationProvider>
      <CollectorAuthProvider>
        <ResidentAuthProvider>
          <ThemeProvider value={colorScheme === 'light' ? DarkTheme : DefaultTheme}>
            <View style={{ flex: 1 }}>
              <Stack 
                screenOptions={{
                  headerShown: false,
                }}
                initialRouteName="splashscreen"
              >
                <Stack.Screen name="splashscreen" />
                <Stack.Screen name="index" />
                <Stack.Screen name="landing" options={{ title: 'Landing Page' }} />
                <Stack.Screen name="login" options={{ title: 'Log In' }} />
                <Stack.Screen name="forgot-password" options={{ title: 'Forgot Password' }} />
                <Stack.Screen name="collector" />
                <Stack.Screen name="resident" />
                <Stack.Screen name="signup" options={{ title: 'Sign Up' }} />
                <Stack.Screen name="PhoneAuth" options={{ title: 'Phone Auth' }} />
                <Stack.Screen
                  name="test/notification-test"
                  options={{
                    title: 'Notification Test',
                    headerShown: true
                  }}
                />
                <Stack.Screen
                  name="local-notification-panel"
                  options={{
                    title: 'Local Notification Panel',
                    headerShown: true
                  }}
                />
              </Stack>
              <StatusBar style="auto" />
            </View>
          </ThemeProvider>
        </ResidentAuthProvider>
      </CollectorAuthProvider>
    </NotificationProvider>
  );
}
