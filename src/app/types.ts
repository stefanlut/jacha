export interface Poll {
  id: string;
  name: string;
  url: string;
}

export interface Player {
  id: string;
  status: string;
  full_name: string;
  jersey_number?: string;
  position: string;
  height?: string;
  weight?: number;
  class_year?: string;
  shoots?: 'R' | 'L';
}

export interface Team {
  id: string;
  name: string;
  market: string;
  alias: string;
  venue?: {
    name: string;
    city: string;
    state: string;
  };
  players?: Player[];
}

export interface SportRadarTeam {
  id: string;
  name: string;
  market: string;
  alias: string;
}

export interface TeamsResponse {
  season: string;
  teams: SportRadarTeam[];
}

export interface TeamProfileData extends SportRadarTeam {
  players?: Player[];
  venue?: {
    name: string;
    city: string;
    state: string;
    capacity?: number;
  };
  conference?: {
    name: string;
    alias: string;
  };
}

export interface ApiError {
  message: string;
  response?: {
    data?: unknown;
    status?: number;
  };
  config?: {
    url?: string;
    headers?: Record<string, string>;
  };
}

export interface ApiErrorResponse {
  error: string;
  details?: string;
  apiError?: unknown;
}
