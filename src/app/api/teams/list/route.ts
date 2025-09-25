import { NextResponse } from 'next/server';
import { CollegeHockeyNewsScraper } from '@/app/utils/chnScheduleScraper';
import { apiCache } from '@/app/utils/cache';

export async function GET() {
  // Check cache first (longer cache since team list doesn't change often)
  const cacheKey = 'chn-teams-list';
  const cachedData = apiCache.get(cacheKey);
  if (cachedData) {
    return NextResponse.json(cachedData);
  }

  try {
    const teams = CollegeHockeyNewsScraper.getAllTeams();
    
    // Group teams by conference for better organization
    const teamsByConference = teams.reduce((acc, team) => {
      if (!acc[team.conference]) {
        acc[team.conference] = [];
      }
      acc[team.conference].push(team.name);
      return acc;
    }, {} as Record<string, string[]>);

    // Sort teams within each conference
    Object.keys(teamsByConference).forEach(conference => {
      teamsByConference[conference].sort();
    });

    const result = {
      totalTeams: teams.length,
      conferences: Object.keys(teamsByConference).sort(),
      teamsByConference,
      allTeams: teams.map(t => t.name).sort()
    };
    
    // Cache for 1 hour since team list doesn't change frequently
    apiCache.set(cacheKey, result, 60 * 60 * 1000);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error getting teams list:', error);
    
    return NextResponse.json(
      { error: 'Failed to get teams list' },
      { status: 500 }
    );
  }
}