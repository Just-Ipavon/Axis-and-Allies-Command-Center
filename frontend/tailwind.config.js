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
          bg: 'var(--vintage-bg)',        // warm paper
          paper: 'var(--vintage-paper)',     // dark paper
          text: 'var(--vintage-text)',      // faded black text
          border: 'var(--vintage-border)',    // brown-ish border
          accent: '#8a2b2b'     // dark blood red
        },
        faction: {
          ussr: '#8B0000',      // Maroon
          germany: '#404040',   // Dark gray
          uk: '#D2B48C',        // Tan
          japan: '#D2691E',     // Burnt Orange
          usa: '#556B2F',       // Olive Drab
          italy: '#8b5a2b'      // Brown
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
