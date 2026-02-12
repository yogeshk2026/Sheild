/** @type {import('tailwindcss').Config} */
const plugin = require("tailwindcss/plugin");

module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./App.tsx", "./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  corePlugins: {
    space: false,
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ['NunitoSans_400Regular'],
        'sans-medium': ['NunitoSans_500Medium'],
        'sans-semibold': ['NunitoSans_600SemiBold'],
        'sans-bold': ['NunitoSans_700Bold'],
        'sans-extrabold': ['NunitoSans_800ExtraBold'],
      },
      colors: {
        // Courial Shield brand colors - black, white, grey, orange
        shield: {
          black: '#000000',
          dark: '#1A1A1A',
          charcoal: '#2D2D2D',
          grey: '#6B7280',
          light: '#E5E7EB',
          surface: '#F5F5F5',
          white: '#FFFFFF',
          accent: '#F97316', // orange
          'accent-dark': '#EA580C',
          success: '#22C55E', // green - use sparingly
          muted: '#9CA3AF',
        },
      },
      fontSize: {
        xs: "10px",
        sm: "12px",
        base: "14px",
        lg: "18px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
        "4xl": "40px",
        "5xl": "48px",
        "6xl": "56px",
        "7xl": "64px",
        "8xl": "72px",
        "9xl": "80px",
      },
    },
  },
  darkMode: "class",
  plugins: [
    plugin(({ matchUtilities, theme }) => {
      const spacing = theme("spacing");

      // space-{n}  ->  gap: {n}
      matchUtilities(
        { space: (value) => ({ gap: value }) },
        { values: spacing, type: ["length", "number", "percentage"] }
      );

      // space-x-{n}  ->  column-gap: {n}
      matchUtilities(
        { "space-x": (value) => ({ columnGap: value }) },
        { values: spacing, type: ["length", "number", "percentage"] }
      );

      // space-y-{n}  ->  row-gap: {n}
      matchUtilities(
        { "space-y": (value) => ({ rowGap: value }) },
        { values: spacing, type: ["length", "number", "percentage"] }
      );
    }),
  ],
};

