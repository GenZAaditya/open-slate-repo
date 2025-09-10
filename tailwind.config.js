/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./client/src/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'hsl(var(--color-primary))',
          dark: 'hsl(var(--color-primary-dark))',
        },
        accent: 'hsl(var(--color-accent))',
        background: {
          DEFAULT: 'hsl(var(--color-bg))',
          alt: 'hsl(var(--color-bg-alt))',
        },
        text: {
          primary: 'hsl(var(--color-text-primary))',
          secondary: 'hsl(var(--color-text-secondary))',
        },
        border: 'hsl(var(--color-border))',
        sidebar: {
          bg: 'hsl(var(--color-sidebar-bg))',
          border: 'hsl(var(--color-sidebar-border))',
          text: 'hsl(var(--color-sidebar-text))',
          hover: 'hsl(var(--color-sidebar-item-hover))',
          active: 'hsl(var(--color-sidebar-item-active))',
        }
      },
      fontFamily: {
        base: ['Segoe UI', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
      },
      fontSize: {
        'base': '16px',
        'sm': '14px', 
        'lg': '18px',
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '20px',
        'xl': '32px',
        'sidebar': '240px',
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px', 
        'lg': '12px',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      animation: {
        'spin': 'spin 1s linear infinite',
        'pulse-ring': 'pulse-ring 2s ease-out infinite',
        'avatar-glow': 'avatar-glow 1.5s ease-in-out infinite alternate',
        'typing': 'typing 1.4s infinite ease-in-out',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.33)', opacity: '1' },
          '80%, 100%': { transform: 'scale(1.1)', opacity: '0' }
        },
        'avatar-glow': {
          '0%': { boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.8), 0 0 30px rgba(59, 130, 246, 0.4)' }
        },
        'typing': {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-10px)' }
        }
      }
    },
  },
  plugins: [],
  darkMode: 'class',
}