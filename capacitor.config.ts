import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.7233776cd32442e89d70c86e5d3f4ff0',
  appName: 'radiant-nova-chats',
  webDir: 'dist',
  server: {
    url: 'https://7233776c-d324-42e8-9d70-c86e5d3f4ff0.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0d0a1a',
    },
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#0d0a1a',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
