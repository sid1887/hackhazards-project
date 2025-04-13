/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Dark mode foundation
        'dark-bg': '#121212',
        'dark-surface': '#1E1E1E',
        'dark-card': '#252525',
        'dark-border': '#333333',
        'dark-hover': '#2A2A2A',
        'dark-text-primary': '#FFFFFF',
        'dark-text-secondary': '#B0B0B0',
        'dark-text-disabled': '#666666',
        // Neon accent spectrum
        'neon-blue': '#00F0FF',
        'neon-green': '#39FF14',
        'neon-teal': '#01FFC3',
        'neon-pink': '#FF00FF',
        'neon-purple': '#BC13FE',
        'neon-yellow': '#FFFF00',
        // Additional accents for subtle gradients
        'neon-cyan': '#00FFFF',
        'neon-magenta': '#FF00FF',
        // Additional cyberpunk colors
        'cyber-blue': '#00F0FF',
        'cyber-green': '#39FF14',
        'cyber-purple': '#BC13FE',
        'cyber-red': '#FF003C',
        'cyber-orange': '#FF9E00',
        'cyber-dark-blue': '#0B0B2B',
        'cyber-black': '#080808',
        'cyber-background': '#121212',
        'glitch-blue': '#08FAFA',
        'glitch-red': '#FE0000',
        'matrix-green': '#00FF41',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'scanner': 'scanner 2s linear infinite',
        'typing': 'typing 3.5s steps(40, end) infinite',
        'blink-caret': 'blink-caret .75s step-end infinite',
        'matrix-fall': 'matrix-fall 20s linear infinite',
        'glitch': 'glitch 1s linear infinite',
        'neon-flicker': 'neon-flicker 1.5s infinite alternate-reverse',
        'scanline': 'scanline 8s linear infinite',
        'text-glitch': 'text-glitch 3.5s infinite',
        'border-flow': 'border-flow 2s linear infinite',
        'card-hover': 'card-hover 0.3s ease-out forwards',
        'card-unhover': 'card-unhover 0.3s ease-in forwards',
        'fade-in': 'fade-in 0.6s ease-out forwards',
        'slide-up': 'slide-up 0.5s ease-out forwards',
        'rotate-slow': 'rotate 6s linear infinite',
        'data-pulse': 'data-pulse 2s infinite',
        'shake': 'shake 0.5s ease-in-out',
        'staggered-fade-in': 'fade-in 0.5s ease-out forwards var(--delay, 0s)',
        'modal-fade-in': 'modal-fade-in 0.3s ease-out forwards',
        'modal-fade-out': 'modal-fade-out 0.3s ease-in forwards',
        'scale-in': 'scale-in 0.3s ease-out forwards',
        'scale-out': 'scale-out 0.3s ease-in forwards',
      },
      keyframes: {
        glow: {
          '0%': { textShadow: '0 0 5px #00F0FF, 0 0 10px #00F0FF' },
          '100%': { textShadow: '0 0 20px #00F0FF, 0 0 30px #00F0FF, 0 0 40px #00F0FF' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        scanner: {
          '0%': { top: '0%' },
          '50%': { top: '90%' },
          '100%': { top: '0%' },
        },
        typing: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
        'blink-caret': {
          '0%, 100%': { borderColor: 'transparent' },
          '50%': { borderColor: '#39FF14' },
        },
        'matrix-fall': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        glitch: {
          '0%, 100%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-5px, 5px)' },
          '40%': { transform: 'translate(-5px, -5px)' },
          '60%': { transform: 'translate(5px, 5px)' },
          '80%': { transform: 'translate(5px, -5px)' },
        },
        'neon-flicker': {
          '0%': { opacity: '1' },
          '50%': { opacity: '.8' },
          '100%': { opacity: '1' },
        },
        'scanline': {
          '0%': { transform: 'translateY(-100%)', opacity: '0.6' },
          '50%': { opacity: '0.2' },
          '100%': { transform: 'translateY(100vh)', opacity: '0.6' },
        },
        'text-glitch': {
          '0%, 100%': { 
            textShadow: '1px 0 0 #00F0FF, -1px 0 0 #FF00FF', 
            transform: 'translate(0)' 
          },
          '25%': { 
            textShadow: '-1px 0 0 #00F0FF, 1px 0 0 #FF00FF', 
            transform: 'translate(-1px, 1px)' 
          },
          '50%': { 
            textShadow: '2px 0 0 #00F0FF, -2px 0 0 #FF00FF', 
            transform: 'translate(1px, -1px)' 
          },
          '75%': { 
            textShadow: '-2px 0 0 #00F0FF, 2px 0 0 #FF00FF', 
            transform: 'translate(-1px, -1px)' 
          },
        },
        'border-flow': {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '100% 100%' },
        },
        'card-hover': {
          '0%': { transform: 'scale(1)', boxShadow: '0 0 0 rgba(0, 240, 255, 0)' },
          '100%': { transform: 'scale(1.05)', boxShadow: '0 0 15px rgba(0, 240, 255, 0.7)' },
        },
        'card-unhover': {
          '0%': { transform: 'scale(1.05)', boxShadow: '0 0 15px rgba(0, 240, 255, 0.7)' },
          '100%': { transform: 'scale(1)', boxShadow: '0 0 0 rgba(0, 240, 255, 0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'data-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-5px)' },
          '40%': { transform: 'translateX(5px)' },
          '60%': { transform: 'translateX(-3px)' },
          '80%': { transform: 'translateX(3px)' },
        },
        'modal-fade-in': {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'modal-fade-out': {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-20px)' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'scale-out': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.9)', opacity: '0' },
        },
      },
      backgroundImage: {
        'cyber-grid': "linear-gradient(to right, #333333 1px, transparent 1px), linear-gradient(to bottom, #333333 1px, transparent 1px)",
        'neon-gradient': "linear-gradient(45deg, #00F0FF, #01FFC3, #39FF14, #FF00FF)",
        'glitch-pattern': "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)",
        'scanline': "linear-gradient(to bottom, transparent, rgba(0, 240, 255, 0.1) 50%, transparent 100%)",
        'tech-pattern': "radial-gradient(circle at center, rgba(57, 255, 20, 0.1) 1px, transparent 1px)",
        'data-grid': "linear-gradient(to right, rgba(0, 240, 255, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 240, 255, 0.1) 1px, transparent 1px)",
        'cyber-dots': "radial-gradient(rgba(0, 240, 255, 0.15) 2px, transparent 2px)",
        'neon-border': "linear-gradient(90deg, #00F0FF, #39FF14, #FF00FF, #00F0FF)",
        'diagonal-stripes': "repeating-linear-gradient(45deg, rgba(0, 240, 255, 0.05) 0px, rgba(0, 240, 255, 0.05) 5px, transparent 5px, transparent 10px)",
        'radial-glow': "radial-gradient(circle at center, rgba(0, 240, 255, 0.2) 0%, rgba(0, 240, 255, 0) 70%)",
        'matrix-rain': "linear-gradient(to bottom, rgba(0, 255, 65, 0.1) 0%, rgba(0, 255, 65, 0) 100%)",
      },
      boxShadow: {
        'neon-blue': '0 0 5px #00F0FF, 0 0 20px rgba(0, 240, 255, 0.5)',
        'neon-green': '0 0 5px #39FF14, 0 0 20px rgba(57, 255, 20, 0.5)',
        'neon-pink': '0 0 5px #FF00FF, 0 0 20px rgba(255, 0, 255, 0.5)',
        'neon-glow': '0 0 10px #00F0FF, 0 0 30px #39FF14',
        'inner-neon': 'inset 0 0 10px rgba(0, 240, 255, 0.5)',
        'card-hover': '0 10px 25px -5px rgba(0, 240, 255, 0.4)',
        'button-glow': '0 0 10px #00F0FF, 0 0 20px rgba(0, 240, 255, 0.5), 0 0 40px rgba(0, 240, 255, 0.3)',
        'data-card': '0 4px 10px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 240, 255, 0.2)',
        'tooltip': '0 5px 15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(57, 255, 20, 0.3)',
        'input-focus': '0 0 0 2px rgba(0, 240, 255, 0.5), 0 0 15px rgba(0, 240, 255, 0.3)',
        'modal': '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(0, 240, 255, 0.2)',
      },
      fontFamily: {
        // Add futuristic and monospaced fonts
        'sans': ['Inter', 'Roboto', 'ui-sans-serif', 'system-ui'],
        'mono': ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'SFMono-Regular'],
        'tech': ['Orbitron', 'Rajdhani', 'sans-serif'],
        'cyber': ['Cyberpunk', 'Orbitron', 'sans-serif'],
        'display': ['BlenderPro', 'Inter', 'sans-serif'],
      },
      textShadow: {
        'neon-blue': '0 0 5px #00F0FF, 0 0 10px #00F0FF',
        'neon-green': '0 0 5px #39FF14, 0 0 10px #39FF14',
        'neon-pink': '0 0 5px #FF00FF, 0 0 10px #FF00FF',
        'cyberpunk': '2px 2px 0px #00F0FF, -2px -2px 0px #FF00FF',
        'header': '0 0 10px #00F0FF, 0 0 20px #00F0FF, 0 0 30px #00F0FF',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      borderWidth: {
        '1': '1px',
        '3': '3px',
      },
      gradientColorStops: {
        'neon-blue-start': '#00F0FF',
        'neon-blue-end': '#0077FF',
        'neon-green-start': '#39FF14',
        'neon-green-end': '#00FF41',
      },
      backgroundSize: {
        'grid-pattern': '50px 50px',
        'expand': '200% 200%',
        'cyber-dots': '20px 20px',
      },
      backdropBlur: {
        'xs': '2px',
      },
      screens: {
        'xs': '480px',
        '3xl': '1920px',
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
        'width': 'width',
        'glow': 'box-shadow, text-shadow',
        'filter': 'filter',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
      spacing: {
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
        '128': '32rem',
      },
      opacity: {
        '15': '0.15',
        '35': '0.35',
        '85': '0.85',
        '95': '0.95',
      },
      rotate: {
        '1': '1deg',
        '2': '2deg',
        '3': '3deg',
      },
      scale: {
        '98': '.98',
        '102': '1.02',
        '103': '1.03',
      },
      letterSpacing: {
        'widest': '0.25em',
        'ultra-wide': '0.5em',
      },
      lineHeight: {
        'extra-tight': '1.1',
        'ultra-tight': '1',
      },
      minHeight: {
        '0': '0',
        '1/4': '25%',
        '1/2': '50%',
        '3/4': '75%',
        'screen-50': '50vh',
        'screen-75': '75vh',
      },
      maxHeight: {
        '1/4': '25%',
        '1/2': '50%',
        '3/4': '75%',
        'screen-50': '50vh',
        'screen-75': '75vh',
      },
      minWidth: {
        '0': '0',
        '1/4': '25%',
        '1/2': '50%',
        '3/4': '75%',
      },
      maxWidth: {
        '1/4': '25%',
        '1/2': '50%',
        '3/4': '75%',
        'screen-sm': '640px',
        'screen-md': '768px',
        'screen-lg': '1024px',
        'screen-xl': '1280px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
    // Create custom utilities for text shadows
    function({ addUtilities }) {
      const newUtilities = {
        '.text-shadow-neon-blue': {
          textShadow: '0 0 5px #00F0FF, 0 0 10px #00F0FF',
        },
        '.text-shadow-neon-green': {
          textShadow: '0 0 5px #39FF14, 0 0 10px #39FF14',
        },
        '.text-shadow-neon-pink': {
          textShadow: '0 0 5px #FF00FF, 0 0 10px #FF00FF',
        },
        '.text-shadow-cyberpunk': {
          textShadow: '2px 2px 0px #00F0FF, -2px -2px 0px #FF00FF',
        },
        '.text-shadow-header': {
          textShadow: '0 0 10px #00F0FF, 0 0 20px #00F0FF, 0 0 30px #00F0FF',
        },
        '.text-shadow-none': {
          textShadow: 'none',
        },
      };
      addUtilities(newUtilities, ['responsive', 'hover']);
    },
    // Add custom plugin for blended text effects
    function({ addComponents }) {
      const components = {
        '.text-glitch': {
          position: 'relative',
          '&::before, &::after': {
            content: 'attr(data-text)',
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
          },
          '&::before': {
            left: '2px',
            textShadow: '-2px 0 #00F0FF',
            animation: 'glitch 0.3s infinite',
            animationDirection: 'alternate-reverse',
            animationTimingFunction: 'linear',
            zIndex: '-1',
          },
          '&::after': {
            left: '-2px',
            textShadow: '2px 0 #FF00FF',
            animation: 'glitch 0.3s infinite',
            animationDirection: 'alternate',
            animationTimingFunction: 'linear',
            zIndex: '-2',
          },
        },
        '.scanline': {
          position: 'relative',
          overflow: 'hidden',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '2px',
            backgroundColor: 'rgba(0, 240, 255, 0.3)',
            animation: 'scanline 4s linear infinite',
          },
        },
        '.cyberpunk-border': {
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: '-3px',
            background: 'linear-gradient(90deg, #00F0FF, #39FF14, #FF00FF)',
            backgroundSize: '200% 200%',
            animation: 'border-flow 2s linear infinite',
            borderRadius: 'inherit',
            zIndex: '-1',
          },
        },
        '.glitch-overlay': {
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0, 240, 255, 0.05) 2px, rgba(0, 240, 255, 0.05) 4px)',
            pointerEvents: 'none',
          },
        },
      };
      addComponents(components);
    },
    // Add custom plugin for responsive grid layouts
    function({ addComponents, theme }) {
      const screens = theme('screens', {});
      const components = {
        '.cyber-grid': {
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
          '@screen sm': {
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          },
          '@screen lg': {
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          },
          '@screen xl': {
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          },
        },
        '.staggered-grid': {
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          '& > *': {
            animationName: 'fade-in',
            animationDuration: '0.5s',
            animationFillMode: 'forwards',
            opacity: '0',
          },
        },
      };
      addComponents(components);
    },
  ],
}
