/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
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
        base: 'var(--font-family-base)',
      },
      fontSize: {
        base: 'var(--font-size-base)',
        sm: 'var(--font-size-sm)',
        lg: 'var(--font-size-lg)',
      },
      spacing: {
        xs: 'var(--spacing-xs)',
        sm: 'var(--spacing-sm)',
        md: 'var(--spacing-md)',
        lg: 'var(--spacing-lg)',
        xl: 'var(--spacing-xl)',
      },
      borderRadius: {
        sm: 'var(--border-radius-sm)',
        md: 'var(--border-radius-md)',
        lg: 'var(--border-radius-lg)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      }
    },
  },
  plugins: [],
  darkMode: 'class',
}