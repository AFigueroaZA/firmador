/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0F172A",
        mist: "#EFF3F6",
        accent: "#0B5FFF",
        sand: "#F7F4ED",
        success: "#0F766E",
        danger: "#B42318",
      },
      boxShadow: {
        panel: "0 20px 60px rgba(15, 23, 42, 0.10)",
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

