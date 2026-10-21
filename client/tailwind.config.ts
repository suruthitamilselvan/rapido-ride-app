import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-nunito)', 'Nunito', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        pastel: {
          cream: '#FDFDFD',
          blue: '#EFEFEF',
          green: '#F1F5D8',
          greenDark: '#415720',
          purple: '#957DAD',
          purpleHover: '#856C9E',
          purpleDark: '#352545',
          purpleLight: '#F3EEF8',
          pink: '#FFD6A5',
          pinkDark: '#784315',
          pinkLight: '#FFF5EB',
        },
        rapido: {
          yellow: '#957DAD', // mapped to pastel purple for theme consistency
          yellowHover: '#856C9E',
          yellowLight: '#F1F5D8',
          dark: '#2D283E',
          darkCard: '#3A334E',
          muted: '#6E6680',
        },
      },
    },
  },
  plugins: [],
};
export default config;
