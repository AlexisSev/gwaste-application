import React from 'react';
import { Linking, Text, TouchableOpacity } from 'react-native';
export function ExternalLink({ href, children, style }) {
  return (
    <TouchableOpacity onPress={() => Linking.openURL(href)}>
      <Text style={[{ color: '#1B95E0' }, style]}>{children}</Text>
    </TouchableOpacity>
  );
} 