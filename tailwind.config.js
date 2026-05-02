/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'],
      },
      colors: {
        plaza: {
          bg: '#0b0f14',
          panel: '#111821',
          border: '#1f2a37',
          accent: '#22d3ee',
          good: '#22c55e',
          bad: '#ef4444',
          warn: '#f59e0b',
          dim: '#64748b',
        },
      },
    },
  },
  plugins: [],
};
