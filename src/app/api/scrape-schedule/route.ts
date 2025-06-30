import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { HockeyScheduleScraper, loadTeamScheduleUrls } from '@/app/utils/scheduleScraper';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamName = searchParams.get('team');

    if (!teamName) {
      return NextResponse.json(
        { error: 'Team name is required' },
        { status: 400 }
      );
    }

    // Load team URLs from the mapping file
    const teamUrls = await loadTeamScheduleUrls();
    const url = teamUrls[teamName];
    
    if (!url) {
      return NextResponse.json(
        { error: `Schedule not available for ${teamName}. The 2025-26 season schedule may not be published yet, or the team may not be supported.` },
        { status: 404 }
      );
    }

    const scraper = new HockeyScheduleScraper();
    const schedule = await scraper.scrapeSchedule(url, teamName);

    if (!schedule) {
      return NextResponse.json(
        { 
          error: `No 2025-26 schedule found for ${teamName}. The website may only show the 2024-25 season schedule. Since we're in the offseason, the 2025-26 schedule may not be published yet.`,
          isOffseason: true,
          expectedSeason: '2025-26'
        },
        { status: 404 }
      );
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Schedule scraping error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url, teamName } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    const scraper = new HockeyScheduleScraper();
    const schedule = await scraper.scrapeSchedule(url, teamName);

    if (!schedule) {
      return NextResponse.json(
        { error: 'Failed to scrape schedule data' },
        { status: 500 }
      );
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Schedule scraping error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
