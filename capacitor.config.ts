import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: process.env.CLASSIC_IDENTITY === 'lazyoracle' ? 'art.lazying.lazyoracle' : 'art.lazying.auspice',
  appName: process.env.CLASSIC_IDENTITY === 'lazyoracle' ? 'LazyOracle' : 'Auspice',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
