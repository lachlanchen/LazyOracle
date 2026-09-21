import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'art.lazying.lazyoracle',
  appName: 'LazyOracle',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
