export default {
  content: ["./index.html","./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', 'system-ui', 'sans-serif'],
      },
      colors: {
        tahoe: {
          bg: {
            primary: '#0B0B0C',
            secondary: '#161618',
            tertiary: '#1a1a1c',
            quaternary: '#242426',
            hover: 'rgba(255, 255, 255, 0.08)',
          },
          text: {
            primary: '#ffffff',
            secondary: '#e5e5e7',
            tertiary: '#d1d1d3',
            muted: '#98989a',
          },
          accent: {
            DEFAULT: '#0A84FF',
            hover: '#0071e3',
          },
          border: {
            primary: 'rgba(255, 255, 255, 0.12)',
            secondary: 'rgba(255, 255, 255, 0.18)',
          },
          'input-bg': 'rgba(255, 255, 255, 0.12)',
          'card-bg': 'rgba(22, 22, 24, 0.8)',
        },
      },
      borderRadius: {
        'tahoe': '20px',
        'tahoe-sm': '18px',
        'tahoe-lg': '24px',
        'tahoe-input': '14px',
        'tahoe-pill': '9999px',
      },
      backdropBlur: {
        'tahoe': '20px',
      },
      boxShadow: {
        'tahoe': '0 18px 40px rgba(0, 0, 0, 0.25)',
        'tahoe-sm': '0 2px 8px rgba(0, 0, 0, 0.15)',
        'tahoe-md': '0 4px 12px rgba(0, 0, 0, 0.2)',
        'tahoe-lg': '0 20px 50px rgba(0, 0, 0, 0.3)',
        'tahoe-focus': '0 0 0 3px rgba(10, 132, 255, 0.2)',
      },
      transitionTimingFunction: {
        'tahoe': 'cubic-bezier(0.25, 0.8, 0.25, 1)',
      },
      transitionDuration: {
        'tahoe': '180ms',
      },
      spacing: {
        'tahoe-global': '24px',
        'tahoe-card': '16px',
      },
    },
  },
  plugins: []
};
