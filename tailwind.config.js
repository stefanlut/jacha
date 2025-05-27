/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        varsity: ['var(--font-varsity)'],
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'inherit',
            a: {
              color: '#60a5fa',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
              },
            },
            table: {
              width: '100%',
            },
            th: {
              color: '#94a3b8',
            },
            tr: {
              borderBottomColor: 'rgba(255, 255, 255, 0.1)',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
