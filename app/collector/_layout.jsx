import { Tabs, usePathname } from 'expo-router';
import React from 'react';
import FloatingTabBar from '../../components/FloatingTabBar';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';

const collectorTabs = [
  { key: 'home', route: '/collector/home', icon: 'home' },
  { key: 'map', route: '/collector/map', icon: 'map' },
  { key: 'schedule', route: '/collector/schedule', icon: 'calendar' },
];

export default function CollectorTabLayout() { 
  const colorScheme = useColorScheme();
  const pathname = usePathname();

  const hideTabBarRoutes = [
    '/collector/login',
    '/collector/landing',
    '/collector/signup',
    '/collector/settings',
    '/collector/profile',
    '/resident/signup',
  ];

  const shouldHideTabBar = hideTabBarRoutes.includes(pathname);

  return (
    <>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
        contentStyle: {
          backgroundColor: Colors[colorScheme ?? 'light'].background,
          paddingBottom: 90,
        },
      }}>
      <Tabs.Screen
        name="home"
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
        name="settings"
        options={{
          href: null, // This completely hides the tab from the tab bar
        }}
      />
    </Tabs>
    {!shouldHideTabBar && <FloatingTabBar tabs={collectorTabs} />}
    </>
  );
}