import { NextRequest, NextResponse } from 'next/server';
import { CHNLiveScoreboardScraper } from '@/app/utils/chnLiveScoreboardScraper';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const gender = (searchParams.get('gender') as 'men' | 'women') || 'men';

    const scoreboard = await CHNLiveScoreboardScraper.scrapeLiveScoreboard(gender);    return NextResponse.json(scoreboard);
  } catch (error) {
    console.error('Scoreboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scoreboard data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}