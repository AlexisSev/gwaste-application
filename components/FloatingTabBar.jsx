import { Feather } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';

const defaultTabs = [
  { key: 'home', route: '/resident', icon: 'home' },
  { key: 'map', route: '/resident/map', icon: 'map' },
  { key: 'schedule', route: '/resident/schedule', icon: 'calendar' },
  { key: 'categorize', route: '/resident/categorize', icon: 'grid' },
];

const normalizePath = (path) => {
  if (!path) return '';
  if (path === '/') return '/';
  return path.replace(/\/+$/, '') || '/';
};

export default function FloatingTabBar({ tabs: customTabs }) {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = customTabs ?? defaultTabs;
  const currentPath = normalizePath(pathname);

  const isActive = (route) => {
    const normalizedRoute = normalizePath(route);
    // Exact match
    if (currentPath === normalizedRoute) return true;
    // Handle index routes - if route is /resident and currentPath is /resident/residenthome
    if (normalizedRoute === '/resident' && (currentPath === '/resident/residenthome' || currentPath === '/resident')) return true;
    // Handle residenthome route specifically
    if (normalizedRoute === '/resident/residenthome' && (currentPath === '/resident/residenthome' || currentPath === '/resident')) return true;
    // Handle collector home route
    if (normalizedRoute === '/collector/home' && (currentPath === '/collector/home' || currentPath === '/collector')) return true;
    // Handle nested routes - check if current path starts with the route (but not for exact matches)
    if (normalizedRoute !== currentPath && currentPath.startsWith(normalizedRoute + '/')) return true;
    return false;
  };

  const handlePress = (route) => {
    router.push(route);
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const active = isActive(tab.route);
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabButton}
              onPress={() => handlePress(tab.route)}
              activeOpacity={0.7}>
              <View style={[styles.iconContainer, active && styles.iconContainerActive]}>
                <Feather
                  name={tab.icon}
                  size={active ? 24 : 22}
                  color={active ? '#000000' : '#9CA3AF'}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
    paddingHorizontal: 16,
    pointerEvents: 'box-none',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 60,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  iconContainerActive: {
    backgroundColor: '#E8F5E8',
    width: 70,
    height: 40,
    borderRadius: 20,
  },
});