import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.autocaregenius.prohub',
  appName: 'Pro Hub',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
