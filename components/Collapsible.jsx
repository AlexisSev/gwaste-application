import React from 'react';
import { Text, View } from 'react-native';
export function Collapsible({ title, children }) {
  return (
    <View style={{ marginVertical: 8 }}>
      <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>{title}</Text>
      <View>{children}</View>
    </View>
  );
} 