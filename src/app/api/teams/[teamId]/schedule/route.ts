import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { scheduleScraper, loadTeamScheduleUrls } from '@/app/utils/scheduleScraper';
import { apiCache } from '@/app/utils/cache';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await context.params;
    const { searchParams } = new URL(request.url);
    const teamName = searchParams.get('teamName');
    const customUrl = searchParams.get('url');

    if (!teamName && !customUrl) {
      return NextResponse.json(
        { error: 'Team name or URL is required' },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = `schedule-${teamId}-${teamName || 'custom'}`;
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    // Load team URLs and determine the URL to scrape
    const teamUrls = await loadTeamScheduleUrls();
    let scheduleUrl: string | undefined;
    
    if (customUrl) {
      scheduleUrl = customUrl;
    } else if (teamName && teamUrls[teamName]) {
      scheduleUrl = teamUrls[teamName];
    }

    if (!scheduleUrl) {
      return NextResponse.json(
        { 
          error: 'Schedule URL not found for this team',
          availableTeams: Object.keys(teamUrls),
          message: 'You can provide a custom URL using the "url" query parameter'
        },
        { status: 404 }
      );
    }

    // Scrape the schedule
    const schedule = await scheduleScraper.scrapeSchedule(scheduleUrl, teamName || undefined);

    if (!schedule) {
      return NextResponse.json(
        { error: 'Failed to scrape schedule data' },
        { status: 500 }
      );
    }

    // Cache the results for 1 hour (schedules don't change frequently)
    apiCache.set(cacheKey, schedule, 60 * 60 * 1000);

    return NextResponse.json(schedule);

  } catch (error) {
    console.error('Error in schedule API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
