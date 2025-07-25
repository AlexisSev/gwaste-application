import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function InputField({ icon, iconRight, onIconPress, style, ...props }) {
  return (
    <View style={[styles.container, style]}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <TextInput style={styles.input} {...props} />
      {iconRight && (
        <TouchableOpacity onPress={onIconPress} style={styles.iconRight}>
          {iconRight}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 16,
  },
  iconRight: {
    marginLeft: 8,
  },
}); 