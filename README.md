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

## Deployment

This application uses Next.js API routes and requires a server runtime. The recommended deployment method is Vercel:

1. Fork this repository to your GitHub account
2. Sign up for [Vercel](https://vercel.com) (free for hobby projects)
3. Create a new project in Vercel and connect it to your forked repository
4. Add your `SPORTRADAR_API_KEY` in Vercel:
   - Go to Project Settings > Environment Variables
   - Add `SPORTRADAR_API_KEY` with your API key
   - Vercel will automatically encrypt and secure your API key

Vercel will automatically:
- Deploy your application
- Handle API routes correctly
- Manage environment variables securely
- Provide automatic HTTPS
- Enable automatic deployments on git push

### Alternative Deployment Options

If you prefer not to use Vercel, you can:
1. Use another hosting platform that supports Next.js API routes (Netlify, AWS, etc.)
2. Split the application into:
   - Frontend (static site on GitHub Pages)
   - Backend (serverless functions for API calls)

Note: GitHub Pages alone won't work because it doesn't support server-side functionality needed for the API routes.

## Environment Variables

This application requires the following environment variables to be set:

```bash
SPORTRADAR_API_KEY=your_api_key_here  # Required for fetching team data
```

You can get your API key by:
1. Creating an account at [SportRadar Developer Portal](https://developer.sportradar.com/)
2. Subscribing to the NCAA Men's Hockey API
3. Copying your API key from your dashboard

For local development:
1. Copy `.env.example` to `.env.local`
2. Replace `your_api_key_here` with your actual API key

For production deployment:
1. Add the `SPORTRADAR_API_KEY` environment variable to your hosting platform
   - For Vercel: Add in Project Settings > Environment Variables
   - For other platforms: Consult their documentation for adding environment variables

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

