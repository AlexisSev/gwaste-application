import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, Platform, StyleSheet, TouchableOpacity } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function DraggableFloatingButton({ onPress, icon = 'robot', iconSize = 24, iconColor = '#ffffff', backgroundColor = '#8BC500' }) {
  const router = useRouter();
  const buttonSize = 56;
  const padding = 20;
  const tabBarHeight = 90;
  const safeAreaBottom = Platform.OS === 'ios' ? 34 : 20;
  const initialX = SCREEN_WIDTH - buttonSize - padding;
  const initialY = SCREEN_HEIGHT - buttonSize - tabBarHeight - safeAreaBottom - padding;
  
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const pan = useRef(new Animated.ValueXY()).current;
  const lastOffset = useRef({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        lastOffset.current = { x: position.x, y: position.y };
        pan.setOffset({ x: 0, y: 0 });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (evt, gestureState) => {
        pan.flattenOffset();
        
        // Calculate new position
        const newX = lastOffset.current.x + gestureState.dx;
        const newY = lastOffset.current.y + gestureState.dy;
        
        // Boundary constraints
        let finalX = newX;
        let finalY = newY;
        
        // Keep button within screen bounds
        finalX = Math.max(padding, Math.min(finalX, SCREEN_WIDTH - buttonSize - padding));
        finalY = Math.max(padding, Math.min(finalY, SCREEN_HEIGHT - buttonSize - tabBarHeight - safeAreaBottom - padding));
        
        // Snap to edges (left or right)
        const snapThreshold = SCREEN_WIDTH / 2;
        if (finalX < snapThreshold) {
          finalX = padding;
        } else {
          finalX = SCREEN_WIDTH - buttonSize - padding;
        }
        
        // Calculate animation delta
        const deltaX = finalX - lastOffset.current.x;
        const deltaY = finalY - lastOffset.current.y;
        
        // Update position
        setPosition({ x: finalX, y: finalY });
        lastOffset.current = { x: finalX, y: finalY };
        
        // Animate to final position
        Animated.spring(pan, {
          toValue: { x: deltaX, y: deltaY },
          useNativeDriver: false,
          tension: 50,
          friction: 7,
        }).start(() => {
          pan.setValue({ x: 0, y: 0 });
          pan.setOffset({ x: 0, y: 0 });
        });
      },
    })
  ).current;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/resident/GwasteChatbot');
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          left: position.x,
          top: position.y,
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={[styles.button, { backgroundColor }]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <FontAwesome5 name={icon} size={iconSize} color={iconColor} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 999,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

