import { Ionicons } from '@expo/vector-icons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { Tabs, usePathname } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import ResidentChatBot from '../../components/ResidentChatBot';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';

export default function ResidentTabLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();

  const hideTabBarRoutes = [
    '/resident/signup',
  ];

  const shouldHideTabBar = hideTabBarRoutes.includes(pathname);

  return (
    <>
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarStyle: shouldHideTabBar
          ? { display: 'none' }
          : Platform.select({
              ios: { position: 'absolute' },
              default: {},
            }),
        contentStyle: { backgroundColor: Colors[colorScheme ?? 'light'].background },
      }}>
      <Tabs.Screen
        name="index"
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
      <Tabs.Screen
        name="categorize"
        options={{
          title: 'Categorize',
          tabBarIcon: ({ color }) => (
            <FontAwesome5 name="recycle" size={27} color={color} style={{ marginBottom: -8 }} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null, // This completely hides the tab from the tab bar
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null, // This completely hides the tab from the tab bar
        }}
      />
    </Tabs>
    {/* Floating chat widget overlay */}
    <ResidentChatBot />
    </>
  );
}

function TabBarIcon(props) {
  return <Ionicons size={28} style={{ marginBottom: -3 }} {...props} />;
}


