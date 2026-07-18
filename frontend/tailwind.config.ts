import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontSize: {
        /* Premium typography for grand scale */
        "hero": ["4.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "section": ["3.5rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        "subsection": ["2.5rem", { lineHeight: "1.3", letterSpacing: "-0.005em" }],
      },
      spacing: {
        "section-gap": "4rem",
        "card-gap": "1.5rem",
      },
      colors: {
        brand: {
          50:  "#f0f4ff",
          100: "#e0e9ff",
          200: "#c7d6fe",
          300: "#a5b8fd",
          400: "#8192fb",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        neon: {
          cyan:   "#22d3ee",
          violet: "#a78bfa",
          pink:   "#f472b6",
          green:  "#4ade80",
          amber:  "#fbbf24",
        },
        dark: {
          50:  "#f8fafc",
          100: "#f1f5f9",
          800: "#1e293b",
          850: "#172033",
          900: "#0f172a",
          950: "#080c18",
        },
      },
      fontFamily: {
        sans:    ["Inter var", "Inter", "system-ui", "sans-serif"],
        mono:    ["JetBrains Mono", "Fira Code", "monospace"],
        display: ["Cal Sans", "Inter var", "sans-serif"],
      },
      backgroundImage: {
        "mesh-1":     "radial-gradient(at 40% 20%, #6366f155 0px, transparent 50%), radial-gradient(at 80% 0%, #22d3ee33 0px, transparent 50%), radial-gradient(at 0% 50%, #a78bfa44 0px, transparent 50%)",
        "mesh-2":     "radial-gradient(at 21% 33%, #312e8188 0px, transparent 59%), radial-gradient(at 79% 14%, #6366f166 0px, transparent 59%), radial-gradient(at 60% 80%, #22d3ee22 0px, transparent 50%)",
        "glow-brand": "radial-gradient(circle, #6366f140 0%, transparent 70%)",
        "glow-cyan":  "radial-gradient(circle, #22d3ee30 0%, transparent 70%)",
        "card-glass": "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
      },
      boxShadow: {
        "glow-sm":    "0 0 15px rgba(99,102,241,0.3)",
        "glow-md":    "0 0 30px rgba(99,102,241,0.4)",
        "glow-lg":    "0 0 60px rgba(99,102,241,0.5)",
        "glow-cyan":  "0 0 20px rgba(34,211,238,0.4)",
        "glow-green": "0 0 20px rgba(74,222,128,0.4)",
        "glass-inset": "inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.1)",
        "glass":      "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
        "card":       "0 4px 24px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)",
        "card-hover": "0 20px 60px rgba(0,0,0,0.3), 0 4px 16px rgba(99,102,241,0.2)",
      },
      animation: {
        "float":       "float 6s ease-in-out infinite",
        "float-slow":  "floatDeep 14s ease-in-out infinite",
        "pulse-glow":  "pulseGlow 2s ease-in-out infinite",
        "slide-up":    "slideUp 0.5s ease-out",
        "slide-in":    "slideIn 0.4s ease-out",
        "fade-in":     "fadeIn 0.6s ease-out",
        "shimmer":     "shimmer 2s infinite",
        "spin-slow":   "spin 8s linear infinite",
        "spin-slower": "spin 480s linear infinite",
        "moon-aura":   "moonAura 10s ease-in-out infinite",
        "cosmic-drift": "cosmicDrift 40s ease-in-out infinite",
        "gradient":    "gradientShift 8s ease infinite",
        "border-glow": "borderGlow 3s ease-in-out infinite",
        /* Premium animations */
        "shimmer-premium": "shimmerPremium 3s infinite linear",
        "glass-hover": "glassHover 3s ease-in-out infinite",
        "elevate": "elevate 0.4s cubic-bezier(0.34,1.56,0.64,1)",
        "soft-pulse": "softPulse 2s ease-in-out infinite",
        "gradient-flow": "gradientFlow 6s ease infinite",
        "text-glow": "textGlow 2s ease-in-out infinite",
        "blob": "blob 7s infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-20px)" },
        },
        floatDeep: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-10px)" },
        },
        moonAura: {
          "0%, 100%": { boxShadow: "0 0 70px 12px rgba(226,232,240,0.30), 0 0 200px 70px rgba(148,163,184,0.13)" },
          "50%":      { boxShadow: "0 0 95px 20px rgba(226,232,240,0.42), 0 0 260px 95px rgba(148,163,184,0.20)" },
        },
        cosmicDrift: {
          "0%, 100%": { transform: "scale(1) translateY(0px)" },
          "50%":      { transform: "scale(1.05) translateY(-10px)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%":      { opacity: "1",   transform: "scale(1.05)" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%":   { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%":      { backgroundPosition: "100% 50%" },
        },
        borderGlow: {
          "0%, 100%": { borderColor: "rgba(99,102,241,0.3)" },
          "50%":      { borderColor: "rgba(99,102,241,0.8)" },
        },
        /* Premium animations */
        shimmerPremium: {
          "0%": { backgroundPosition: "-2000px 0" },
          "100%": { backgroundPosition: "2000px 0" },
        },
        glassHover: {
          "0%": { background: "rgba(255,255,255,0.032)" },
          "50%": { background: "rgba(255,255,255,0.048)" },
          "100%": { background: "rgba(255,255,255,0.032)" },
        },
        elevate: {
          "0%": { transform: "translateY(0) translateZ(0)" },
          "100%": { transform: "translateY(-6px) translateZ(0)" },
        },
        softPulse: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.85", transform: "scale(1.02)" },
        },
        gradientFlow: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        textGlow: {
          "0%, 100%": { textShadow: "0 0 20px rgba(99,102,241,0.4)" },
          "50%": { textShadow: "0 0 30px rgba(99,102,241,0.7)" },
        },
        blob: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
          "100%": { transform: "translate(0px, 0px) scale(1)" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
export default config;