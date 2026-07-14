/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#003443",
          900: "#002732",
          800: "#003443",
          700: "#0A4557",
          600: "#17596E",
        },
        mist: "#EFF3F6",
        accent: "#F76D5A",
        coral: {
          DEFAULT: "#F76D5A",
          700: "#D94E3B",
          600: "#E8563F",
          500: "#F76D5A",
          100: "#FEE4DE",
          50: "#FFF4F1",
        },
        sand: "#F7F4ED",
        success: "#0F766E",
        danger: "#B42318",
      },
      boxShadow: {
        panel: "0 24px 60px -28px rgba(0,52,67,.28),0 2px 6px rgba(0,39,50,.05)",
        glow: "0 12px 28px -10px rgba(247,109,90,.45)",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        rise: "rise 320ms ease-out both",
      },
    },
  },
  plugins: [],
};

