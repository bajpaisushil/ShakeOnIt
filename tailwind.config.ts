import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0f0e17',
        card: '#1a1925',
        ink: '#fffffe',
        muted: '#a7a9be',
        accent: '#ff8906',
        'accent-soft': '#ffb86b',
        good: '#6ee7b7',
        line: '#2a2837',
        danger: '#ff6b6b',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 20px 60px rgba(0,0,0,0.3)',
      },
    },
  },
  plugins: [],
};
export default config;
