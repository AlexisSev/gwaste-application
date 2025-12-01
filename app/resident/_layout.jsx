import { Tabs, usePathname } from 'expo-router';
import React from 'react';
import FloatingTabBar from '../../components/FloatingTabBar';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';

const residentTabs = [
  { key: 'home', route: '/resident/residenthome', icon: 'home' },
  { key: 'map', route: '/resident/map', icon: 'map' },
  { key: 'schedule', route: '/resident/schedule', icon: 'calendar' },
  { key: 'categorize', route: '/resident/categorize', icon: 'grid' },
];

export default function ResidentTabLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();

  const hideTabBarRoutes = [
    '/resident/login',
    '/resident/landing',
    '/resident/signup',
    '/collector/signup',
    '/resident/GwasteChatbot',
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
        name="residenthome"
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
          href: null, // This completely hides the tab from the tab bar
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null, // This completely hides the tab from the tab bar
        }}
      />
      <Tabs.Screen
        name="report-issue"
        options={{
          href: null, // This completely hides the tab from the tab bar
        }}
      />
      <Tabs.Screen
        name="GwasteChatbot"
        options={{
          href: null, // This completely hides the tab from the tab bar
        }}
      />
    </Tabs>
    {!shouldHideTabBar && <FloatingTabBar tabs={residentTabs} />}
    </>
  );
}


