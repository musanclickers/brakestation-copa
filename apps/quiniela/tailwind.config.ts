import type { Config } from 'tailwindcss';
import sharedConfig from '@brakestation/ui/tailwind.config';

const config: Config = {
  presets: [sharedConfig as Config],
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
