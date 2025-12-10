 
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
// import 'react-native-reanimated';
import { CollectorAuthProvider } from '../hooks/useCollectorAuthSupabase';
import { useColorScheme } from '../hooks/useColorScheme';
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
    // Proceed without waiting for fonts to render splashscreen immediately
  }

  return (
    <CollectorAuthProvider>
      <ResidentAuthProvider>
      <ThemeProvider value={colorScheme === 'light' ? DarkTheme : DefaultTheme}>
        <Stack initialRouteName="splashscreen">
          <Stack.Screen name="splashscreen" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="landing" options={{ title: 'Landing Page', headerShown: false }} />
          <Stack.Screen name="login" options={{ title: 'Log In', headerShown: false }} />
          <Stack.Screen name="forgot-password" options={{ title: 'Forgot Password', headerShown: false }} />
          <Stack.Screen name="collector" options={{ headerShown: false }} />
          <Stack.Screen name="resident" options={{ headerShown: false }} />
          <Stack.Screen name="signup" options={{ title: 'Sign Up', headerShown: false }} />
          <Stack.Screen name="PhoneAuth" options={{ title: 'Phone Auth', headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
      </ResidentAuthProvider>
    </CollectorAuthProvider>
  );
}
