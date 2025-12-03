import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Simple viewport helpers (width/height percentage)
export const vw = (percentage) => (SCREEN_WIDTH * percentage) / 100;
export const vh = (percentage) => (SCREEN_HEIGHT * percentage) / 100;

/**
 * Moderately scale a size based on screen width.
 * Still exported in case we want it later, but most text should use responsiveFontSize.
 */
export const moderateScale = (size, factor = 0.5) => {
  const baseWidth = 375;
  const scale = SCREEN_WIDTH / baseWidth;
  const newSize = size * scale;
  return Math.round(
    PixelRatio.roundToNearestPixel(size + (newSize - size) * factor)
  );
};

/**
 * Responsive font size tuned for small phones like Tecno Spark 20 Go.
 *
 * - Uses a smaller base width (320) so 360–400 px phones get a slight bump.
 * - Caps the scale so text does not become huge on tablets.
 */
export const responsiveFontSize = (size) => {
  const guidelineBaseWidth = 320; // treat 320px as "1x"
  const rawScale = SCREEN_WIDTH / guidelineBaseWidth;

  // Allow fonts to grow up to ~20% larger than the base size
  const clampedScale = Math.min(rawScale, 1.2);
  const newSize = size * clampedScale;

  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

// Helper for scaling images while keeping aspect ratio
export const responsiveImage = (baseWidth, baseHeight) => {
  const width = vw(Math.min(100, (baseWidth / 375) * 100));
  const aspectRatio =
    baseWidth && baseHeight ? baseWidth / baseHeight : undefined;
  return { width, height: undefined, aspectRatio };
};


