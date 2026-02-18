/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['\"Sora\"', 'ui-sans-serif', 'system-ui'],
        body: ['\"Manrope\"', 'ui-sans-serif', 'system-ui']
      },
      boxShadow: {
        glow: '0 10px 40px rgba(15, 23, 42, 0.28)'
      },
      backgroundImage: {
        mesh: 'radial-gradient(circle at 25% 20%, rgba(56,189,248,.14), transparent 35%), radial-gradient(circle at 75% 10%, rgba(251,191,36,.14), transparent 40%), radial-gradient(circle at 65% 80%, rgba(236,72,153,.12), transparent 36%)'
      }
    }
  },
  plugins: []
};
