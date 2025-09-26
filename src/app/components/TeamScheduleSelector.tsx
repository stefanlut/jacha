'use client';

import { useState, useEffect } from 'react';
import { CHNTeamsList } from '@/app/types';

interface TeamScheduleSelectorProps {
  selectedTeam: string | null;
  onTeamChange: (teamName: string) => void;
  selectedGender: 'men' | 'women';
  onGenderChange: (gender: 'men' | 'women') => void;
}

export default function TeamScheduleSelector({ selectedTeam, onTeamChange, selectedGender, onGenderChange }: TeamScheduleSelectorProps) {
  const [teamsList, setTeamsList] = useState<CHNTeamsList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConference, setSelectedConference] = useState<string>('All');

  useEffect(() => {
    const fetchTeams = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/teams/list?gender=${selectedGender}`);
        if (!response.ok) {
          throw new Error('Failed to fetch teams');
        }
        const data = await response.json();
        setTeamsList(data);
        // Reset selections when switching gender
        setSelectedConference('All');
        setSearchTerm('');
        onTeamChange(''); // Clear selected team
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch teams');
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, [selectedGender, onTeamChange]);

  if (loading) {
    return (
      <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
        <div className="animate-pulse">
          <div className="h-8 bg-white/20 rounded mb-4"></div>
          <div className="h-10 bg-white/20 rounded mb-4"></div>
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-12 bg-white/10 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !teamsList) {
    return (
      <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
        <div className="text-center text-red-400">
          <p>Error loading teams: {error}</p>
        </div>
      </div>
    );
  }

  // Filter teams based on search and conference
  const filteredTeams = teamsList.allTeams.filter(team => {
    const matchesSearch = team.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesConference = selectedConference === 'All' || 
      Object.entries(teamsList.teamsByConference).some(([conf, teams]) => 
        conf === selectedConference && teams.includes(team)
      );
    return matchesSearch && matchesConference;
  });

  const getTeamConference = (teamName: string): string => {
    for (const [conference, teams] of Object.entries(teamsList.teamsByConference)) {
      if (teams.includes(teamName)) {
        return conference;
      }
    }
    return 'Unknown';
  };

  return (
    <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
      <h2 className="text-xl font-bold text-white mb-4">Select Team</h2>
      
      {/* Gender Toggle */}
      <div className="mb-6">
        <div className="flex bg-white/10 rounded-lg p-1">
          <button
            onClick={() => onGenderChange('men')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              selectedGender === 'men'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Men&apos;s Hockey
          </button>
          <button
            onClick={() => onGenderChange('women')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              selectedGender === 'women'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Women&apos;s Hockey
          </button>
        </div>
      </div>
      
      {/* Search and Filter Controls */}
      <div className="space-y-4 mb-6">
        <div>
          <input
            type="text"
            placeholder="Search teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <select
            value={selectedConference}
            onChange={(e) => setSelectedConference(e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="All">All Conferences</option>
            {teamsList.conferences.map(conference => (
              <option key={conference} value={conference}>
                {conference}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-slate-400 mb-4">
        Showing {filteredTeams.length} of {teamsList.totalTeams} teams
      </div>

      {/* Teams List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredTeams.map(team => {
          const conference = getTeamConference(team);
          const isSelected = selectedTeam === team;
          
          return (
            <button
              key={team}
              onClick={() => onTeamChange(team)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                isSelected
                  ? 'bg-blue-600 border border-blue-500'
                  : 'bg-white/5 hover:bg-white/10 border border-transparent'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className={`font-medium ${isSelected ? 'text-white' : 'text-white'}`}>
                    {team}
                  </div>
                  <div className={`text-sm ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                    {conference}
                  </div>
                </div>
                {isSelected && (
                  <div className="text-blue-200">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {filteredTeams.length === 0 && (
        <div className="text-center text-slate-400 py-8">
          <p>No teams found matching your criteria</p>
        </div>
      )}
    </div>
  );
}