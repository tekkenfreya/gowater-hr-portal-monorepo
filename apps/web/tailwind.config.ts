import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Persona 3 Reload Color Palette
      colors: {
        p3: {
          // Dark backgrounds (for contrast)
          'navy-darkest': '#0a0e1f',
          'navy-dark': '#1a1f3a',
          'navy-medium': '#1e2843',
          'navy': '#2a3f5f',
          'accent-blue': '#3d5a80',
          // Bright P3R Blues (vibrant cyan/turquoise)
          'blue': '#0066cc',
          'blue-bright': '#0088ff',
          'cyan': '#00ccff',
          'cyan-bright': '#00e5ff',
          'cyan-light': '#5ce1e6',
          'cyan-lightest': '#b0f7ff',
          // Hot Pink accents
          'pink': '#ff0080',
          'pink-bright': '#ff1493',
          'pink-light': '#ff69b4',
          // Red accents
          'red': '#ff0000',
          'red-bright': '#ff2d2d',
          // Yellow (existing)
          'yellow': '#f4c430',
          'yellow-dark': '#d4a824',
          'yellow-light': '#ffe066',
          'gold': '#ffd700',
          // Status colors
          'success': '#4ade80',
          'working': '#22c55e',
          'rest': '#fbbf24',
          'absent': '#ef4444',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'Courier New', 'monospace'],
      },
      animation: {
        'slide-perspective': 'slideInPerspective 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'card-lift': 'cardHoverLift 0.3s ease-out forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'typewriter': 'typewriter 2s steps(40) forwards',
        'blink': 'blinkCursor 1s step-end infinite',
        'card-slide-in': 'cardSlideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'page-exit': 'pageExitCamera 1s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'page-enter': 'pageEnterCamera 1s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'fade-in-delay-100': 'fadeInUp 0.6s ease-out 0.1s forwards',
        'fade-in-delay-200': 'fadeInUp 0.6s ease-out 0.2s forwards',
        'fade-in-delay-300': 'fadeInUp 0.6s ease-out 0.3s forwards',
        'border-flow': 'borderFlow 8s linear infinite',
        'border-flow-reverse': 'borderFlowReverse 8s linear infinite',
        'border-flow-vertical': 'borderFlowVertical 6s linear infinite',
        'border-flow-vertical-reverse': 'borderFlowVerticalReverse 6s linear infinite',
      },
      // Shadow definitions removed - using Tailwind defaults only
      boxShadow: {},
      // Background gradients removed - using Tailwind defaults only
      backgroundImage: {},
    },
  },
  plugins: [],
};

export default config;
