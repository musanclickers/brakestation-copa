import type { Config } from 'tailwindcss';

const config: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#232124',
          red: '#E32125',
          blue: '#3A63A8',
          gray: '#F4F4F4',
          white: '#FFFFFF',
          gold: '#F5C518',
          deep: '#0a1e3d',
        },
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'Anton', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        brand: '8px',
      },
    },
  },
};

export default config;
