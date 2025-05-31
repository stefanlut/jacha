import { NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';
import { NextRequest } from 'next/server';
import { ApiError, ApiErrorResponse } from '@/app/types';
import { apiCache } from '@/app/utils/cache';

const API_KEY = process.env.SPORTRADAR_API_KEY;
const BASE_URL = 'https://api.sportradar.com/ncaamh/trial/v3/en';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: 'API key not configured' },
      { status: 500 }
    );
  }

  try {
    const { teamId } = await context.params;
    
    // Check cache first
    const cacheKey = `team-profile-${teamId}`;
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    const response = await axios.get(
      `${BASE_URL}/teams/${teamId}/profile.json`,
      {
        headers: {
          'accept': 'application/json',
          'x-api-key': API_KEY
        }
      }
    );

    // Cache the response for 10 minutes (team profiles change less frequently)
    apiCache.set(cacheKey, response.data, 10 * 60 * 1000);

    return NextResponse.json(response.data);
  } catch (error) {
    const err = error as AxiosError<ApiError>;
    return NextResponse.json(
      { 
        error: err.response?.status === 429 
          ? 'Rate limit exceeded. Please try again in a few minutes.' 
          : 'Failed to fetch team profile',
        details: err.message,
        apiError: err.response?.data
      } satisfies ApiErrorResponse,
      { status: err.response?.status || 500 }
    );
  }
}
