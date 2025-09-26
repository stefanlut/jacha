import { NextRequest, NextResponse } from 'next/server';
import { CHNScoreboardScraper } from '@/app/utils/chnScoreboardScraper';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const gender = (searchParams.get('gender') as 'men' | 'women') || 'men';
    const dateParam = searchParams.get('date');
    
    // Parse date parameter or use today. Normalize to UTC-noon to avoid timezone shifting.
    let targetDate: Date;
    if (dateParam) {
      const match = dateParam.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) {
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD format.' },
          { status: 400 }
        );
      }
  const [, y, m, d] = match;
      targetDate = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), 12, 0, 0));
    } else {
      const now = new Date();
      targetDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
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