import { NextRequest, NextResponse } from 'next/server';
import { CHNScoreboardScraper } from '@/app/utils/chnScoreboardScraper';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const gender = (searchParams.get('gender') as 'men' | 'women') || 'men';
    const dateParam = searchParams.get('date');
    
    // Parse date parameter or use today
    let targetDate: Date;
    if (dateParam) {
      targetDate = new Date(dateParam);
      if (isNaN(targetDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD format.' },
          { status: 400 }
        );
      }
    } else {
      targetDate = new Date();
    }

    const scoreboard = await CHNScoreboardScraper.scrapeScoreboard(targetDate, gender);
    
    return NextResponse.json(scoreboard);
  } catch (error) {
    console.error('Scoreboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scoreboard data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}