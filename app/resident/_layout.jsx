import { Feather } from '@expo/vector-icons';
import { Redirect, Tabs, usePathname } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { Colors } from '../../constants/Colors';
import { useCollectorAuth } from '../../hooks/useCollectorAuth';
import { useColorScheme } from '../../hooks/useColorScheme';

export default function ResidentTabLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, loading } = useCollectorAuth();
  const pathname = usePathname();

  if (loading) return null;
  const allowUnauthedRoutes = ['/resident/signup'];
  const isAllowlisted = allowUnauthedRoutes.includes(pathname);

  if (!isAuthenticated() && !isAllowlisted) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarStyle: Platform.select({
          ios: { position: 'absolute' },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, size }) => <Feather name="map-pin" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color, size }) => <Feather name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="categorize"
        options={{
          title: 'Categorize',
          tabBarIcon: ({ color, size }) => <Feather name="book-open" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="signup"
        options={{
          href: '/resident/signup',
          headerShown: false,
          // Hide from tab bar
          tabBarButton: () => null,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}


