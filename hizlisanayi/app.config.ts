import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Hızlısanayi',
  slug: 'hizlisanayi',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'hizlisanayi',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    bundleIdentifier: 'com.hizlisanayi.app',
    supportsTablet: false,
    infoPlist: {
      NSCameraUsageDescription: 'İlan fotoğrafı çekmek için',
      NSPhotoLibraryUsageDescription: 'İlan için fotoğraf seçmek için',
    },
  },
  android: {
    package: 'com.hizlisanayi.app',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    permissions: ['NOTIFICATIONS', 'CAMERA', 'READ_EXTERNAL_STORAGE'],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#F97316',
      },
    ],
  ],
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    eas: {
      projectId: '389fdcc5-d6cb-4e80-bf40-b21886a2a14b',
    },
  },
});
