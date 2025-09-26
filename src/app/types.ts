export interface Poll {
  id: string;
  name: string;
  url: string;
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



// College Hockey News specific types
export interface CHNScheduleGame {
  id: string;
  date: Date;
  opponent: string;
  isHome: boolean;
  venue?: string;
  time?: string;
  conference: boolean;
  exhibition: boolean;
  status: 'scheduled' | 'completed' | 'postponed' | 'cancelled';
  result?: {
    score: string;
    won: boolean;
  };
  tournamentInfo?: string;
}

export interface CHNTeamSchedule {
  teamName: string;
  season: string;
  record: {
    overall: string;
    conference: string;
  };
  games: CHNScheduleGame[];
  lastUpdated: Date;
}

export interface CHNTeamsList {
  totalTeams: number;
  conferences: string[];
  teamsByConference: Record<string, string[]>;
  allTeams: string[];
  gender: 'men' | 'women';
}

export interface CHNTeamInfo {
  name: string;
  url: string;
  conference: string;
  gender: 'men' | 'women';
}
