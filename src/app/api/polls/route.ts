import { NextRequest, NextResponse } from 'next/server';
import { USCHOPollScraper } from '@/app/utils/uschoPollScraper';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const gender = searchParams.get('gender');
    
    if (!gender || (gender !== 'men' && gender !== 'women')) {
      return NextResponse.json(
        { error: 'Invalid gender parameter. Must be "men" or "women"' },
        { status: 400 }
      );
    }
    
    const poll = await USCHOPollScraper.scrapePoll(gender as 'men' | 'women');
    
    return NextResponse.json(poll);
  } catch (error) {
    console.error('Poll scraping error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch poll data' },
      { status: 500 }
    );
  }
}
