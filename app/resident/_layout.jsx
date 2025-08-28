import { Stack, usePathname } from 'expo-router';
import React from 'react';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';

export default function ResidentTabLayout() {
  const colorScheme = useColorScheme();
  // eslint-disable-next-line no-unused-vars
  const pathname = usePathname();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors[colorScheme ?? 'light'].background },
      }}
    />
  );
}


