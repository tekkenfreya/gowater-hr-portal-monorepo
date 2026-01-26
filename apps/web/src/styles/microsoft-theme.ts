// Microsoft 365 Design System - Fluent Design Tokens
// Based on Microsoft's modern Fluent Design principles

export const MicrosoftTheme = {
  // Primary Colors (Microsoft Blue)
  colors: {
    primary: {
      main: '#0078D4',      // Microsoft Blue
      dark: '#005A9E',      // Hover/Active state
      light: '#50E6FF',     // Light accent
      lighter: '#E6F3FF',   // Very light background
    },

    // Neutral Colors (Professional Grays)
    neutral: {
      white: '#FFFFFF',
      background: '#F3F2F1', // Warm gray background
      surface: '#FAFAFA',    // Card surface
      border: {
        light: '#E1DFDD',    // Light borders
        medium: '#C8C6C4',   // Medium borders
        dark: '#8A8886',     // Dark borders
      },
      text: {
        primary: '#323130',   // Main text
        secondary: '#605E5C', // Secondary text
        tertiary: '#8A8886',  // Disabled/tertiary text
      },
    },

    // Semantic Colors
    semantic: {
      success: '#107C10',   // Microsoft Green
      warning: '#F59B00',   // Orange
      error: '#D13438',     // Red
      info: '#0078D4',      // Blue (same as primary)
    },

    // Status Colors (for leads)
    status: {
      notStarted: {
        bg: '#F3F2F1',
        text: '#605E5C',
        border: '#C8C6C4',
      },
      contacted: {
        bg: '#E6F3FF',
        text: '#005A9E',
        border: '#0078D4',
      },
      quoted: {
        bg: '#FFF4E5',
        text: '#8A5100',
        border: '#F59B00',
      },
      negotiating: {
        bg: '#F0E6FF',
        text: '#5A2D91',
        border: '#8764B8',
      },
      closedDeal: {
        bg: '#E6F4EA',
        text: '#0B5A10',
        border: '#107C10',
      },
      rejected: {
        bg: '#FDE7E9',
        text: '#A4262C',
        border: '#D13438',
      },
    },
  },

  // Typography
  typography: {
    fontFamily: {
      primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: '"Cascadia Code", "Courier New", monospace',
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px (body default)
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px (h2)
      '2xl': '1.5rem',  // 24px
      '3xl': '2rem',    // 32px (h1)
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },

  // Spacing (8px grid system)
  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '3rem',    // 48px
    '3xl': '4rem',    // 64px
  },

  // Border Radius (Subtle, not overly rounded)
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    md: '0.25rem',    // 4px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px (max for large containers)
  },

  // Shadows (Subtle elevation)
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',              // Subtle
    md: '0 2px 4px 0 rgba(0, 0, 0, 0.06)',              // Cards
    lg: '0 4px 8px 0 rgba(0, 0, 0, 0.08)',              // Modals
    xl: '0 8px 16px 0 rgba(0, 0, 0, 0.10)',             // Flyouts
  },

  // Transitions
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Z-index layers
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
} as const;

// Helper function to get Tailwind-compatible class strings
export const ms = {
  // Quick color utilities
  primary: 'bg-[#0078D4] text-white hover:bg-[#005A9E]',
  primaryOutline: 'border border-[#0078D4] text-[#0078D4] hover:bg-[#E6F3FF]',
  secondary: 'bg-white text-[#323130] border border-[#8A8886] hover:bg-[#F3F2F1]',

  // Button styles
  button: {
    primary: 'bg-[#0078D4] text-white font-semibold px-4 py-2 rounded hover:bg-[#005A9E] transition-colors duration-150',
    secondary: 'bg-white text-[#323130] font-medium px-4 py-2 rounded border border-[#8A8886] hover:bg-[#F3F2F1] transition-colors duration-150',
    ghost: 'text-[#0078D4] font-medium px-4 py-2 hover:bg-[#E6F3FF] rounded transition-colors duration-150',
  },

  // Input styles
  input: 'w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent',

  // Card styles
  card: 'bg-white border border-[#E1DFDD] rounded-lg shadow-sm',

  // Text styles
  text: {
    primary: 'text-[#323130]',
    secondary: 'text-[#605E5C]',
    tertiary: 'text-[#8A8886]',
  },

  // Status badge base
  badge: 'px-2 py-1 rounded text-xs font-normal uppercase tracking-wide',
} as const;

export default MicrosoftTheme;
