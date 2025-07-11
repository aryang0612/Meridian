/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "var(--primary)",
        secondary: "var(--secondary)",
        accent: "var(--accent)",
        muted: "var(--muted)",
        border: "var(--border)",
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"SF Mono"', 'Monaco', 'Inconsolata', '"Roboto Mono"', '"Source Code Pro"', 'monospace'],
      },
      animation: {
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-in-delay': 'fadeInDelay 0.5s ease-out 0.2s both',
        'fade-in-delay-2': 'fadeInDelay2 0.5s ease-out 0.4s both',
        'logo-in': 'logoIn 0.8s ease-out 0.1s both',
        'btn-in': 'btnIn 0.6s ease-out 0.6s both',
        'logo-float': 'logoFloat 3s ease-in-out infinite',
        'mockup-in': 'mockupIn 1s ease-out 0.8s both',
      },
    },
  },
  plugins: [],
} 