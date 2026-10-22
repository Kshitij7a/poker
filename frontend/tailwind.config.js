/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        table: {
          dark: '#07130e',
          felt: '#0a2e1d',
          feltLight: '#0d3d27',
          border: '#1b4a34',
          rail: '#18120c',
          leather: '#261b11',
          gold: '#eab308',
        },
        chip: {
          white: '#f8fafc',
          red: '#ef4444',
          blue: '#3b82f6',
          green: '#10b981',
          black: '#1e293b',
          gold: '#f59e0b',
          purple: '#a855f7',
        },
        poker: {
          darkBg: '#090d16',
          panel: 'rgba(15, 23, 42, 0.75)',
          panelBorder: 'rgba(255, 255, 255, 0.08)',
          accent: '#10b981',
          gold: '#f59e0b',
          crimson: '#e11d48',
        }
      },
      boxShadow: {
        'glow-green': '0 0 25px -5px rgba(16, 185, 129, 0.4)',
        'glow-gold': '0 0 25px -5px rgba(245, 158, 11, 0.5)',
        'glow-red': '0 0 25px -5px rgba(239, 68, 68, 0.5)',
        'glow-blue': '0 0 25px -5px rgba(59, 130, 246, 0.4)',
        'table-inner': 'inset 0 0 60px 15px rgba(0, 0, 0, 0.75)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'chip-drop': 'chipDrop 0.3s ease-out forwards',
        'turn-ping': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        chipDrop: {
          '0%': { transform: 'translateY(-20px) scale(0.8)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
