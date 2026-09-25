import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width } = Dimensions.get('window');

// Guideline sizes are based on standard ~5" screen mobile device (e.g., iPhone 11 Pro)
const guidelineBaseWidth = 375;

export const scale = (size: number) => (width / guidelineBaseWidth) * size;

export const rf = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

// Optional: you can use this for moderate scaling so fonts don't get too huge on tablets
export const responsiveFontSize = (size: number) => {
  const newSize = rf(size);
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 1;
  }
};
