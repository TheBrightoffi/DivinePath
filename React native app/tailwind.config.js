/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        'montserrat': ['Montserrat-Medium'],
        'montserrat-bold': ['Montserrat-Bold'],
        'montserrat-light': ['Montserrat-Light'],
        'montserrat-black': ['Montserrat-Black'],
      },
    },
  },
  plugins: [],
}