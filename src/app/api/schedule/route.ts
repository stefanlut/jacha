import { NextRequest, NextResponse } from 'next/server';
import { CollegeHockeyNewsScraper } from '@/app/utils/chnScheduleScraper';
import { apiCache } from '@/app/utils/cache';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const teamName = searchParams.get('team');

  if (!teamName) {
    return NextResponse.json(
      { error: 'Team name is required' },
      { status: 400 }
    );
  }

  // Check cache first (10 minute cache for schedules)
  const cacheKey = `chn-schedule-${teamName.toLowerCase().replace(/\s+/g, '-')}`;
  const cachedData = apiCache.get(cacheKey);
  if (cachedData) {
    return NextResponse.json(cachedData);
  }

  try {
    // Check if team exists in our mapping
    const teamInfo = CollegeHockeyNewsScraper.getTeamInfo(teamName);
    if (!teamInfo) {
      return NextResponse.json(
        { error: `Team "${teamName}" not found. Available teams can be retrieved from /api/teams/list` },
        { status: 404 }
      );
    }

    // Scrape the schedule
    const schedule = await CollegeHockeyNewsScraper.scrapeTeamSchedule(teamName);
    
    // Cache the result for 10 minutes
    apiCache.set(cacheKey, schedule, 10 * 60 * 1000);

    return NextResponse.json(schedule);

  } catch (error) {
    console.error('Error scraping CHN schedule:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to scrape team schedule' },
      { status: 500 }
    );
  }
}