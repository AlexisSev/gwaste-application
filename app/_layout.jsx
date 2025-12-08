 import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
// import 'react-native-reanimated';
import { CollectorAuthProvider } from '../hooks/useCollectorAuthSupabase';
import { useColorScheme } from '../hooks/useColorScheme';
import { NotificationProvider } from '../hooks/useInAppNotification';
import { ResidentAuthProvider } from '../hooks/useResidentAuth';
// import OneSignal from 'react-native-onesignal';
// import { useEffect } from 'react';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  
  // useEffect(() => {
  //   // Initialize OneSignal with your app ID
  //   OneSignal.setAppId('f2998056-b244-4369-bfff-eaffbb4bb16f');

  //   // Prompt for push permissions (Android 13+ shows a prompt; iOS always prompts)
  //   OneSignal.promptForPushNotificationsWithUserResponse(response => {
  //     console.log('User accepted notifications:', response);
  //   });

  //   // Handle when a notification is opened
  //   OneSignal.setNotificationOpenedHandler(notification => {
  //     console.log('Notification opened:', notification);
  //   });
  // }, []);

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
              </Stack>
              <StatusBar style="auto" />
            </View>
          </ThemeProvider>
        </ResidentAuthProvider>
      </CollectorAuthProvider>
    </NotificationProvider>
  );
}
