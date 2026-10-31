/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,html}",
    "./src/popup/index.html",
    "./src/options/index.html"
  ],
  theme: {
    extend: {
      colors: {
        codesense: {
          navy: "#0F172A",
          slate: "#334155",
          red: "#EF4444",
          redLight: "#FEE2E2",
          green: "#10B981",
          greenLight: "#D1FAE5",
          blue: "#3B82F6",
          bg: "#F8FAFC",
          card: "#FFFFFF",
          border: "#E2E8F0"
        }
      }
    },
  },
  plugins: [],
}
