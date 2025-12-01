import { Tabs, usePathname } from 'expo-router';
import React from 'react';
import FloatingTabBar from '../../components/FloatingTabBar';
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
        headerShown: false,
        tabBarStyle: { display: 'none' }, // Hide default tab bar
        contentStyle: { 
          backgroundColor: Colors[colorScheme ?? 'light'].background,
          paddingBottom: 90, // Add padding for floating tab bar
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
        }}
      />
      <Tabs.Screen
        name="categorize"
        options={{
          title: 'Categorize',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null, // This hides the tab from the tab bar
        }}
      />
    </Tabs>
    {/* Custom floating tab bar */}
    {!shouldHideTabBar && <FloatingTabBar />}
    {/* Floating chat widget overlay */}
    <ResidentChatBot />
    </>
  );
}


