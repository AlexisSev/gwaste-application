import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const InAppNotification = ({ notification, onDismiss }) => {
  const [visible, setVisible] = useState(!!notification);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (notification) {
      setVisible(true);
      showNotification();
      
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        hideNotification();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = () => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideNotification = () => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: -100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      if (onDismiss) onDismiss();
    });
  };

  if (!visible || !notification) return null;

  const { title, message, type = 'info' } = notification;

  const getNotificationStyle = () => {
    switch (type) {
      case 'success':
        return [styles.notification, styles.success];
      case 'error':
        return [styles.notification, styles.error];
      case 'warning':
        return [styles.notification, styles.warning];
      default:
        return [styles.notification, styles.info];
    }
  };

  const getIconName = () => {
    switch (type) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
      onTouchEnd={hideNotification}
    >
      <View style={getNotificationStyle()}>
        <MaterialIcons 
          name={getIconName()} 
          size={24} 
          color="white" 
          style={styles.icon} 
        />
        <View style={styles.content}>
          {title && <Text style={styles.title}>{title}</Text>}
          <Text style={styles.message}>{message}</Text>
        </View>
        <TouchableOpacity onPress={hideNotification} style={styles.closeButton}>
          <MaterialIcons name="close" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    padding: 10,
    ...Platform.select({
      ios: {
        paddingTop: 50, // Account for status bar on iOS
      },
      android: {
        paddingTop: 10,
      },
    }),
  },
  notification: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    flex: 1,
    marginLeft: 10,
  },
  title: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  message: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
  },
  icon: {
    marginRight: 10,
  },
  closeButton: {
    padding: 4,
  },
  success: {
    backgroundColor: '#4CAF50',
  },
  error: {
    backgroundColor: '#F44336',
  },
  warning: {
    backgroundColor: '#FF9800',
  },
  info: {
    backgroundColor: '#2196F3',
  },
});

export default InAppNotification;
