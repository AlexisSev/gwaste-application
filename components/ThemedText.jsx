import React from 'react';
import { Text } from 'react-native';
import { responsiveFontSize } from '../utils/responsive';

// Map simple "type" values to base font sizes
const TYPE_SIZES = {
  title: 24,
  subtitle: 16,
  body: 14,
  label: 13,
};

export function ThemedText({ children, style, type = 'body', ...props }) {
  const baseSize = TYPE_SIZES[type] || TYPE_SIZES.body;

  // Apply a responsive font size first, then allow callers to override if needed
  const mergedStyle = [{ fontSize: responsiveFontSize(baseSize) }, style];

  return (
    <Text style={mergedStyle} {...props}>
      {children}
    </Text>
  );
} 