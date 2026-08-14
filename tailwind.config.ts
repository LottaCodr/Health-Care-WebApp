import type { Config } from "tailwindcss";

const { fontFamily } = require("tailwindcss/defaultTheme");

const config = {
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
			colors: {
				primary: '#E11D48',
				border: 'hsl(var(--border))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				// shadcn/ui design tokens — these back every dropdown, popover,
				// card, input and focus-ring color used by the ui primitives.
				'primary-foreground': 'hsl(var(--primary-foreground))',
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))',
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))',
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))',
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))',
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))',
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
				},
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				'black-800': '#1a1a1a',
				green: {
					'500': '#24AE7C',
					'600': '#0D2A1F'
				},
				blue: {
					'500': '#79B5EC',
					'600': '#152432'
				},
				red: {
					'500': '#F37877',
					'600': '#3E1716',
					'700': '#F24E43'
				},
				light: {
					'200': '#E8E9E9'
				},
				dark: {
					'200': '#0D0F10',
					'300': '#131619',
					'400': '#1A1D21',
					'500': '#363A3D',
					'600': '#76828D',
					'700': '#ABB8C4'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// Premium Nile Valley Palette
				nile: {
					50: '#F0F9FF',
					100: '#E0F2FE',
					200: '#BAE6FD',
					300: '#7DD3FC',
					400: '#38BDF8',
					500: '#0EA5E9',
					600: '#0284C7',
					700: '#0369A1',
					800: '#075985',
					900: '#0C4A6E',
				}
			},
			fontFamily: {
				sans: [
					'Inter',
					'ui-sans-serif',
					'system-ui',
				],
				outfit: ['Outfit', 'sans-serif'],
			},
			boxShadow: {
				'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
				'glass-sm': '0 4px 16px 0 rgba(31, 38, 135, 0.05)',
				'premium': '0 20px 50px rgba(0, 0, 0, 0.05)',
			},
			borderRadius: {
				'3xl': '1.5rem',
				'4xl': '2rem',
				'5xl': '2.5rem',
			},
			backgroundImage: {
				appointments: "url('/assets/images/appointments-bg.png')",
				pending: "url('/assets/images/pending-bg.png')",
				cancelled: "url('/assets/images/cancelled-bg.png')"
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'caret-blink': {
					'0%,70%,100%': {
						opacity: '1'
					},
					'20%,50%': {
						opacity: '0'
					}
				},
				// Soft red glow for the allergy alert banner — draws the eye
				// without the harsh full-opacity blink of the default pulse.
				'alert-glow': {
					'0%, 100%': {
						boxShadow: '0 0 0 0 rgba(220, 38, 38, 0.25)'
					},
					'50%': {
						boxShadow: '0 0 0 7px rgba(220, 38, 38, 0.06)'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'caret-blink': 'caret-blink 1.25s ease-out infinite',
				'alert-glow': 'alert-glow 2s ease-in-out infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;