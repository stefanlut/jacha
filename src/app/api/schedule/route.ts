import { NextRequest, NextResponse } from 'next/server';
import { CollegeHockeyNewsScraper } from '@/app/utils/chnScheduleScraper';
import { apiCache } from '@/app/utils/cache';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const teamName = searchParams.get('team');
  const gender = (searchParams.get('gender') as 'men' | 'women') || 'men';

  if (!teamName) {
    return NextResponse.json(
      { error: 'Team name is required' },
      { status: 400 }
    );
  }

  // Validate gender parameter
  if (gender !== 'men' && gender !== 'women') {
    return NextResponse.json(
      { error: 'Gender must be either "men" or "women"' },
      { status: 400 }
    );
  }

  // Check cache first (10 minute cache for schedules)
  const cacheKey = `chn-schedule-${gender}-${teamName.toLowerCase().replace(/\s+/g, '-')}`;
  const cachedData = apiCache.get(cacheKey);
  if (cachedData) {
    return NextResponse.json(cachedData);
  }

  try {
    // Check if team exists in our mapping
    const teamInfo = CollegeHockeyNewsScraper.getTeamInfo(teamName, gender);
    if (!teamInfo) {
      return NextResponse.json(
        { error: `Team "${teamName}" not found in ${gender}'s teams. Available teams can be retrieved from /api/teams/list?gender=${gender}` },
        { status: 404 }
      );
    }

    // Scrape the schedule
    const schedule = await CollegeHockeyNewsScraper.scrapeTeamSchedule(teamName, gender);
    
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