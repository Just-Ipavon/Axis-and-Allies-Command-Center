/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vintage: {
          bg: '#f4ecd8',        // warm paper
          paper: '#e8dbb9',     // dark paper
          text: '#2b2a26',      // faded black text
          border: '#bda682',    // brown-ish border
          accent: '#8a2b2b'     // dark blood red
        },
        faction: {
          ussr: '#8B0000',      // Maroon
          germany: '#404040',   // Dark gray
          uk: '#D2B48C',        // Tan
          japan: '#D2691E',     // Burnt Orange
          usa: '#556B2F'        // Olive Drab
        }
      },
      fontFamily: {
        typewriter: ['"Courier New"', 'Courier', 'monospace'],
        display: ['Impact', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
