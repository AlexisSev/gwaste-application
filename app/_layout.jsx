import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { CollectorAuthProvider } from '../hooks/useCollectorAuthSupabase';
import { useColorScheme } from '../hooks/useColorScheme';
import { ResidentAuthProvider } from '../hooks/useResidentAuth';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <CollectorAuthProvider>
      <ResidentAuthProvider>
      <ThemeProvider value={colorScheme === 'light' ? DarkTheme : DefaultTheme}>
        <Stack initialRouteName="index">
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="landing" options={{ title: 'Landing Page', headerShown: false }} />
          <Stack.Screen name="login" options={{ title: 'Log In', headerShown: false }} />
          <Stack.Screen name="collector" options={{ headerShown: false }} />
          <Stack.Screen name="resident" options={{ headerShown: false }} />
          <Stack.Screen name="signup" options={{ title: 'Sign Up', headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
      </ResidentAuthProvider>
    </CollectorAuthProvider>
  );
}
