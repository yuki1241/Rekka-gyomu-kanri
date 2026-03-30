import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        sidebar: {
          bg: '#1a1f2e',
          hover: '#252b3b',
          active: '#2d3548',
          text: '#8892a4',
          activeText: '#ffffff',
        },
      },
    },
  },
  plugins: [],
}

export default config
