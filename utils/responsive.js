import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const vw = (percentage) => (SCREEN_WIDTH * percentage) / 100;
export const vh = (percentage) => (SCREEN_HEIGHT * percentage) / 100;

export const moderateScale = (size, factor = 0.5) => {
  const scale = SCREEN_WIDTH / 375; // base iPhone 11 width
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(size + (newSize - size) * factor));
};

export const responsiveImage = (baseWidth, baseHeight) => {
  const width = vw( Math.min(100, (baseWidth / 375) * 100) );
  const aspectRatio = baseWidth && baseHeight ? baseWidth / baseHeight : undefined;
  return { width, height: undefined, aspectRatio };
};


