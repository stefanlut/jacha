'use client';

import { useState, useEffect } from 'react';
import { SportRadarTeam, ApiErrorResponse } from '@/app/types';
import axios, { AxiosError } from 'axios';

interface TeamSelectorProps {
  onTeamSelect: (team: SportRadarTeam) => void;
}

interface TeamsResponse {
  season: string;
  teams: SportRadarTeam[];
}

export default function TeamSelector({ onTeamSelect }: TeamSelectorProps) {
  const [teams, setTeams] = useState<SportRadarTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await axios.get<TeamsResponse>('/api/teams');
        if (response.data.teams) {
          setTeams(response.data.teams); // Teams are already sorted in the API
        } else {
          setError('Invalid response format');
        }
      } catch (err) {
        const error = err as AxiosError<ApiErrorResponse>;
        const errorMessage = error.response?.data?.error || 
          (error.response?.status === 429 ? 'Rate limit exceeded. Please try again in a few minutes.' : 'Failed to load teams');
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <p className="text-gray-800">Loading teams...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        {teams.map((team) => (
          <button
            key={team.id}
            onClick={() => onTeamSelect(team)}
            className="p-6 text-left border rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
          >
            <h3 className="font-semibold text-gray-900 mb-1 truncate">{team.market}</h3>
            <p className="text-sm text-gray-700 truncate">{team.name}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
