import { NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';
import { promises as fs } from 'fs';
import path from 'path';
import { ApiError, ApiErrorResponse, SportRadarTeam } from '@/app/types';
import { apiCache } from '@/app/utils/cache';

const API_KEY = process.env.SPORTRADAR_API_KEY;
const BASE_URL = 'https://api.sportradar.com/ncaamh/trial/v3/en';

// Calculate current season based on date
function getCurrentSeason(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // getMonth() returns 0-11
  
  // Hockey season typically runs from September to April
  // If we're in September-December, it's the start of the season (year-year+1)
  // If we're in January-April, it's the end of the season (year-1-year)
  // If we're in May-August, it's off-season, use the upcoming season (year-year+1)
  if (month >= 9) {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  } else if (month <= 4) {
    return `${year - 1}-${year.toString().slice(-2)}`;
  } else {
    // Off-season, return upcoming season
    return `${year}-${(year + 1).toString().slice(-2)}`;
  }
}

const CURRENT_SEASON = getCurrentSeason();

// Map of API team market names to list_of_programs.txt names
const teamNameMap = new Map<string, string>([
  ['Massachusetts', 'UMass'],
  ['Connecticut', 'UConn'],
  ['UMass-Lowell', 'UMass Lowell'],
  ['Massachusetts-Lowell', 'UMass Lowell'],
  ['Long Island University', 'LIU'],
  ['Minnesota Duluth', 'Minnesota Duluth'],
  ['Minnesota-Duluth', 'Minnesota Duluth'],
  ['Miami', 'Miami (OH)'],
  ['Miami (Ohio)', 'Miami (OH)'],
  ['Saint Cloud State', 'St. Cloud State'],
  ['St Cloud State', 'St. Cloud State'],
  ['Saint Lawrence', 'St. Lawrence'],
  ['Saint Thomas', 'St. Thomas'],
  ['St Thomas', 'St. Thomas'],
  ['Army', 'Army West Point'],
  // Map API names to exact names from list_of_programs.txt
  ['Rochester Institute of Technology', 'Rochester Institute of Technology'],
  ['Northern Michigan', 'Northern Michigan']
]);

async function getActivePrograms(): Promise<Set<string>> {
  const filePath = path.join(process.cwd(), 'public', 'list_of_programs.txt');
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('//'));
  
  const programs = new Set<string>();
  for (const line of lines) {
    const name = line.trim();
    if (name) {
      programs.add(name);
    }
  }
  return programs;
}

export async function GET() {
  if (!API_KEY) {
    return NextResponse.json(
      { error: 'API key not configured' },
      { status: 500 }
    );
  }

  // Check cache first
  const cacheKey = 'teams-list';
  const cachedData = apiCache.get(cacheKey);
  if (cachedData) {
    return NextResponse.json(cachedData);
  }

  try {
    const url = `${BASE_URL}/league/teams.json`;    
    const response = await axios.get(url, {
      headers: {
        'accept': 'application/json',
        'x-api-key': API_KEY
      }
    });

    if (!response.data?.teams) {
      return NextResponse.json(
        { error: 'Invalid API response format' },
        { status: 500 }
      );
    }

    const activePrograms = await getActivePrograms();
    
    // Filter teams to only include active programs
    const filteredTeams = response.data.teams.filter((team: SportRadarTeam) => {
      const programName = teamNameMap.get(team.market) || team.market;
      return activePrograms.has(programName);
    });

    // Sort the filtered teams alphabetically
    const sortedTeams = filteredTeams.sort((a: SportRadarTeam, b: SportRadarTeam) => 
      a.market.localeCompare(b.market, 'en', { sensitivity: 'base' })
    );

    const responseData = {
      season: CURRENT_SEASON,
      teams: sortedTeams
    };

    // Cache the response for 5 minutes
    apiCache.set(cacheKey, responseData, 5 * 60 * 1000);

    return NextResponse.json(responseData);
  } catch (error) {
    const err = error as AxiosError<ApiError>;
    return NextResponse.json(
      { 
        error: err.response?.status === 429 
          ? 'Rate limit exceeded. Please try again in a few minutes.' 
          : 'Failed to fetch teams',
        details: err.message,
        apiError: err.response?.data
      } satisfies ApiErrorResponse,
      { status: err.response?.status || 500 }
    );
  }
}
