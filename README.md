# JACHA (Just Another College Hockey App)

A modern, clean interface for viewing NCAA Division I Hockey Rankings and Team Schedules. Built with Next.js and Tailwind CSS.

## Features

### 📊 Hockey Rankings
- Real-time Division I Hockey Rankings from USCHO.com:
  - Men's Division I Rankings  
  - Women's Division I Rankings
- Easy switching between Men's and Women's polls
- Teams receiving votes outside the top rankings
- Last poll update date

### � Team Schedules  
- Complete schedules for all 63 D1 hockey teams
- Data sourced from College Hockey News
- Search and filter teams by conference
- Monthly schedule organization
- Home/away and conference game indicators
- Real-time schedule updates

### �🎨 User Experience
- Clean, modern dark mode interface
- Responsive design that works on desktop and mobile
- Fast loading with intelligent caching
- Error boundaries for graceful error handling

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with React 19
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Data Sources**: 
  - [USCHO.com](https://www.uscho.com/) (Rankings)
  - [College Hockey News](https://www.collegehockeynews.com/) (Team Schedules)
- **Data Parsing**: Cheerio
- **HTTP Client**: Axios
- **TypeScript**: Full type safety

## API Endpoints

The application provides a clean, easy-to-use REST API:

### Teams List
```bash
GET /api/teams/list
```
Returns all 63 D1 hockey teams organized by conference.

### Team Schedule  
```bash
GET /api/schedule?team=Boston University
```
Returns complete season schedule for any D1 hockey team.

## Deployment

This application uses Next.js API routes and requires a server runtime. The recommended deployment method is Vercel:

1. Fork this repository to your GitHub account
2. Sign up for [Vercel](https://vercel.com) (free for hobby projects)  
3. Create a new project in Vercel and connect it to your forked repository
4. Deploy automatically - no API keys required!

Vercel will automatically:

- Deploy your application
- Handle API routes correctly  
- Provide automatic HTTPS
- Enable automatic deployments on git push

### Alternative Deployment Options

You can also deploy to any platform that supports Next.js API routes (Netlify, Railway, AWS, etc.).

## Local Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```text
src/
  app/
    components/
      PollSelector.tsx           # Poll switching component
      TeamScheduleSelector.tsx   # Team selection with search/filter
      TeamScheduleDisplay.tsx    # Schedule display component
      Header.tsx                 # Navigation header
    utils/
      chnScheduleScraper.ts     # College Hockey News scraper
      cache.ts                  # API response caching
    api/
      teams/list/               # Teams list endpoint
      schedule/                 # Team schedule endpoint
    types.ts                    # TypeScript interfaces
    page.tsx                    # Main rankings page
    teams/page.tsx              # Team schedules page
    layout.tsx                  # App layout
    globals.css                 # Global styles
```

## Data Sources & Refresh

### Rankings
- Source: USCHO.com JSON endpoints
- Updates: Real-time when page loads or polls switch
- Available: Men's top 20, Women's top 15, plus receiving votes

### Team Schedules
- Source: College Hockey News schedule pages
- Updates: Cached for 10 minutes for performance
- Coverage: All 63 D1 hockey teams with complete season schedules
- Features: Home/away indicators, conference games, monthly organization

