/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        notion: {
          gray: "#37352f",
          "gray-light": "#9b9a97",
          bg: "#ffffff",
          "bg-gray": "#f7f6f3",
          border: "#e9e9e7",
        },
      },
      fontFamily: {
        notion: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
