/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('daisyui'),
  ],
  // daisyUI config (optional)
  daisyui: {
    styled: true,
    themes: true, // false: only light + dark themes, true: all themes
    base: true, // applies background color and foreground color for root element by default
    utils: true, // adds responsive and modifier utility classes
    logs: true, // Shows info about daisyUI version and used config in the console
    prefix: "", // prefix for daisyUI classnames (e.g. da-btn)
    darkTheme: "dark", // name of one of the included themes for dark mode
  },
}
