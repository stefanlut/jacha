# JACHA (Just Another College Hockey App)

A modern, clean interface for viewing NCAA Division I Men's Hockey Rankings. Built with Next.js and Tailwind CSS.

## Features

- 📊 Real-time Division I Men's Hockey Rankings from USCHO.com
- 🎨 Clean, modern dark mode interface
- 📱 Responsive design that works on desktop and mobile
- 🔄 Live updates showing:
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
    page.tsx      # Main rankings page
    layout.tsx    # App layout
    globals.css   # Global styles
```

## Data Refresh

The rankings are fetched from USCHO.com's JSON endpoint and automatically updated when you load the page. The data includes:
- Current top 20 rankings
- Teams receiving votes but not in the top rankings
- Last poll update date

## License

This project is licensed under the MIT License - see below for details.

MIT License

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
