import React from 'react';
import { ScrollView, View } from 'react-native';
export default function ParallaxScrollView({ headerImage, children, ...props }) {
  return (
    <ScrollView {...props}>
      {headerImage && <View>{headerImage}</View>}
      {children}
    </ScrollView>
  );
} 