'use client';

import { useState, useEffect } from 'react';
import { SportRadarTeam, ApiErrorResponse } from '@/app/types';
import axios, { AxiosError } from 'axios';

interface TeamSelectorProps {
  onTeamSelect: (team: SportRadarTeam) => void;
  selectedTeam?: SportRadarTeam | null;
}

interface TeamsResponse {
  season: string;
  teams: SportRadarTeam[];
}

export default function TeamSelector({ onTeamSelect, selectedTeam }: TeamSelectorProps) {
  const [teams, setTeams] = useState<SportRadarTeam[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<SportRadarTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get<TeamsResponse>('/api/teams');
        if (response.data.teams) {
          setTeams(response.data.teams); // Teams are already sorted in the API
          setFilteredTeams(response.data.teams);
          setRetryCount(0); // Reset retry count on success
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
  }, [retryCount]);

  // Filter teams based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredTeams(teams);
    } else {
      const filtered = teams.filter(team => 
        team.market.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTeams(filtered);
    }
  }, [searchTerm, teams]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="p-6 border rounded">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg p-4">
        <p className="text-red-700 mb-3">{error}</p>
        <button
          onClick={() => setRetryCount(prev => prev + 1)}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Search Input */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Select a Team</h3>
          <span className="text-sm text-gray-500">
            {filteredTeams.length} of {teams.length} teams
          </span>
        </div>
        <input
          type="text"
          placeholder="Search teams..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      
      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 max-h-96 overflow-y-auto">
        {filteredTeams.length > 0 ? (
          filteredTeams.map((team) => (
            <button
              key={team.id}
              onClick={() => onTeamSelect(team)}
              className={`p-6 text-left border rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full transition-colors ${
                selectedTeam?.id === team.id 
                  ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500' 
                  : ''
              }`}
            >
              <h3 className="font-semibold text-gray-900 mb-1 truncate">{team.market}</h3>
              <p className="text-sm text-gray-700 truncate">{team.name}</p>
            </button>
          ))
        ) : (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-500">No teams found matching &ldquo;{searchTerm}&rdquo;</p>
          </div>
        )}
      </div>
    </div>
  );
}
