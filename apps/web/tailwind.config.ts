import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        control: {
          bg: '#0B0F17',
          surface: '#111827',
          border: '#1F2937',
          card: '#161F30',
        },
      },
    },
  },
  plugins: [],
};

export default config;
