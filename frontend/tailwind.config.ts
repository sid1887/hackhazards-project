import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			zIndex: {
				'-2': '-2',
				'-1': '-1',
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				cyber: {
					black: '#121212',         // Deep, rich black
					dark: '#1a1a1a',          // Slightly lighter dark tone
					darker: '#0F0F0F',        // Even darker shade
					primary: '#00BCD4',       // Main accent color - soft blue
					secondary: '#1E293B',     // Dark slate
					accent: '#3B82F6',        // Softer blue accent
					text: '#f2f2f2',          // Light gray for text
					muted: '#a0a0a0',         // Soft gray for secondary text
					border: '#2C2C2E',        // Dark border color
					purple: '#9b87f5',        // Soft purple
					blue: '#3B82F6',          // Bright blue
					pink: '#EC4899',          // Vibrant pink
					green: '#10B981',         // Emerald green
					orange: '#F59E0B',        // Amber orange
					red: '#EF4444',           // Red
				}
			},
			fontFamily: {
				sans: ['Inter', 'Roboto', 'sans-serif'],
				cyber: ['Poppins', 'Inter', 'sans-serif'],
				mono: ['JetBrains Mono', 'Consolas', 'monospace'],
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' },
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' },
				},
				'glitch': {
					'0%': { transform: 'translate(0)' },
					'20%': { transform: 'translate(-2px, 2px)' },
					'40%': { transform: 'translate(-2px, -2px)' },
					'60%': { transform: 'translate(2px, 2px)' },
					'80%': { transform: 'translate(2px, -2px)' },
					'100%': { transform: 'translate(0)' }
				},
				'flicker': {
					'0%': { opacity: '0.3' },
					'2%': { opacity: '1' },
					'8%': { opacity: '0.3' },
					'9%': { opacity: '1' },
					'12%': { opacity: '0.3' },
					'20%': { opacity: '1' },
					'25%': { opacity: '0.5' },
					'30%': { opacity: '1' },
					'100%': { opacity: '1' }
				},
				'scanline': {
					'0%': { transform: 'translateY(0)' },
					'100%': { transform: 'translateY(100%)' }
				},
				'pulse-glow': {
					'0%, 100%': { 
						boxShadow: '0 0 5px rgba(14, 165, 233, 0.3), 0 0 10px rgba(14, 165, 233, 0.2)',
						borderColor: 'rgba(14, 165, 233, 0.3)'
					},
					'50%': { 
						boxShadow: '0 0 20px rgba(14, 165, 233, 0.4), 0 0 30px rgba(14, 165, 233, 0.2), 0 0 40px rgba(14, 165, 233, 0.1)',
						borderColor: 'rgba(217, 70, 239, 0.4)'
					}
				},
				'dual-pulse-glow': {
					'0%, 100%': { 
						boxShadow: '0 0 5px rgba(14, 165, 233, 0.3), 0 0 10px rgba(236, 72, 153, 0.2)',
					},
					'50%': { 
						boxShadow: '0 0 20px rgba(236, 72, 153, 0.3), 0 0 30px rgba(14, 165, 233, 0.2)',
					}
				},
				'fade-in': {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' }
				},
				'fade-in-up': {
					'0%': { opacity: '0', transform: 'translateY(20px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'fade-in-right': {
					'0%': { opacity: '0', transform: 'translateX(-20px)' },
					'100%': { opacity: '1', transform: 'translateX(0)' }
				},
				'rotate-gradient': {
					'0%': { backgroundPosition: '0% 0%' },
					'100%': { backgroundPosition: '100% 100%' }
				},
				'ping-slow': {
					'0%': { transform: 'scale(1)', opacity: '0.8' },
					'75%, 100%': { transform: 'scale(2)', opacity: '0' }
				},
				'float': {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-10px)' }
				},
				'shimmer': {
					'0%': { transform: 'translateX(-100%)' },
					'100%': { transform: 'translateX(100%)' }
				},
				'border-flow': {
					'0%': { backgroundPosition: '0% 0%' },
					'100%': { backgroundPosition: '200% 0%' }
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'glitch': 'glitch 0.8s infinite alternate-reverse',
				'flicker': 'flicker 2s linear forwards',
				'scanline': 'scanline 8s linear infinite',
				'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
				'dual-pulse-glow': 'dual-pulse-glow 3s ease-in-out infinite',
				'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
				'fade-in': 'fade-in 0.8s ease-out forwards',
				'fade-in-right': 'fade-in-right 0.6s ease-out forwards',
				'rotate-gradient': 'rotate-gradient 3s ease alternate infinite',
				'ping-slow': 'ping-slow 3s ease-in-out infinite',
				'float': 'float 6s ease-in-out infinite',
				'shimmer': 'shimmer 3s infinite',
				'border-flow': 'border-flow 2s linear infinite',
			},
			backgroundImage: {
				'cyber-gradient': 'linear-gradient(45deg, #38BDF8, #3B82F6, #2C3E50)',
				'cyber-radial': 'radial-gradient(circle, rgba(15,23,42,0.3) 0%, rgba(15,23,42,0.6) 100%)',
				'dual-tone': 'linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(59, 130, 246, 0.2))',
				'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.01))',
				'frosted-glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02))',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
