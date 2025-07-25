import { Ionicons } from '@expo/vector-icons';
import { Tabs, usePathname } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';

export default function TabLayout() { 
  const colorScheme = useColorScheme();
  const pathname = usePathname();

  // List of routes where the tab bar should be hidden
  const hideTabBarRoutes = [
    '/(tabs)/login',
    '/(tabs)/signup',
    '/(tabs)/landing',
  ];

  const shouldHideTabBar = hideTabBarRoutes.includes(pathname);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarStyle: shouldHideTabBar
          ? { display: 'none' }
          : Platform.select({
              ios: {
                position: 'absolute',
              },
              default: {},
            }),
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <TabBarIcon name="map" color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color }) => <TabBarIcon name="calendar" color={color} />,
        }}
      />
    </Tabs>
  );
}

function TabBarIcon(props) {
  return <Ionicons size={28} style={{ marginBottom: -3 }} {...props} />;
}
