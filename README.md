# JACHA (Just Another College Hockey App)

A modern, clean interface for viewing NCAA Division I Hockey Rankings for both Men's and Women's programs. Built with Next.js and Tailwind CSS.

## Features

- 📊 Real-time Division I Hockey Rankings from USCHO.com:
  - Men's Division I Rankings
  - Women's Division I Rankings
- 🔄 Easy switching between Men's and Women's polls
- 🎨 Clean, modern dark mode interface
- 📱 Responsive design that works on desktop and mobile
- 📈 Live updates showing:
  - Current rankings
  - Teams receiving votes outside the top rankings
  - Last poll update date

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Data Source**: [USCHO.com](https://www.uscho.com/)
- **Data Parsing**: Cheerio
- **HTTP Client**: Axios

## Local Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
  app/
    components/
      PollSelector.tsx  # Poll switching component
    types.ts           # TypeScript interfaces
    page.tsx          # Main rankings page
    layout.tsx        # App layout
    globals.css       # Global styles
```

## Data Refresh

The rankings are fetched from USCHO.com's JSON endpoints and automatically updated when you load the page or switch between polls. Available data includes:

### Men's Division I
- Current top 20 rankings
- Teams receiving votes but not in the top rankings
- Last poll update date

### Women's Division I
- Current top 15 rankings
- Teams receiving votes but not in the top rankings
- Last poll update date

Rankings are fetched in real-time and include the latest updates from USCHO.com.

