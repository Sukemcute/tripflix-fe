import type { ExpoConfig } from 'expo/config';

// Màu ở đây phải là chuỗi cố định (Expo đọc lúc build), giữ khớp với @tripflix/tokens.
const BLACK = '#000000';
const WHITE = '#FFFFFF';

const config: ExpoConfig = {
  name: 'Tripflix',
  slug: 'tripflix',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'tripflix',
  userInterfaceStyle: 'light',
  android: {
    package: 'vn.tripflix.app',
    adaptiveIcon: {
      backgroundColor: WHITE,
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  ios: {
    bundleIdentifier: 'vn.tripflix.app',
  },
  web: {
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font',
    'expo-status-bar',
    'expo-video',
    ['expo-image-picker', { photosPermission: false, cameraPermission: false, microphonePermission: false }],
    [
      'expo-splash-screen',
      {
        backgroundColor: BLACK,
        image: './assets/brand/tripflix-launch-mark.png',
        imageWidth: 96,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
