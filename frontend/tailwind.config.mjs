/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Lora', 'serif'],
        display: ['Playfair Display', 'serif'], // Added for drop cap
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            fontFamily: theme('fontFamily.serif'),
          },
        },
      }),
      colors: {
        accent: {
          DEFAULT: '#FF7F50', // Custom accent color
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
