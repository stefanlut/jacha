'use client';

import { useState, useEffect } from 'react';
import Header from '@/app/components/Header';
import { TeamSchedule } from '@/app/utils/scheduleScraper';

// Team Schedule Scraper Component
function TeamScheduleScraper({ team }: { team: Team }) {
  const [schedule, setSchedule] = useState<TeamSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Automatically load schedule when component mounts or team changes
  useEffect(() => {
    const scrapeSchedule = async () => {
      setLoading(true);
      setError(null);
      setSchedule(null);

      try {
        const url = new URL('/api/scrape-schedule', window.location.origin);
        url.searchParams.set('team', team.name);
        
        const finalResponse = await fetch(url.toString());

        if (!finalResponse.ok) {
          const errorData = await finalResponse.json();
          throw new Error(errorData.error || 'Failed to scrape schedule');
        }

        const result = await finalResponse.json();
        
        // Convert date strings back to Date objects
        if (result && result.games) {
          result.games = result.games.map((game: { date: string; [key: string]: unknown }) => ({
            ...game,
            date: new Date(game.date)
          }));
        }
        if (result && result.lastUpdated) {
          result.lastUpdated = new Date(result.lastUpdated);
        }
        
        setSchedule(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred while scraping');
        console.error('Scraping error:', err);
      } finally {
        setLoading(false);
      }
    };

    scrapeSchedule();
  }, [team]); // Re-run when team changes

  const formatDate = (date: Date) => {
    // Check if the date is valid
    if (!date || isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const formatTime = (time?: string) => {
    if (!time) return '';
    return time;
  };

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading {team.name} schedule...</span>
          </div>
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 rounded-lg p-4">
          <h4 className="text-red-800 font-medium mb-2">Unable to Load Schedule</h4>
          <p className="text-red-700 text-sm mb-3">{error}</p>
          {(error.includes('2025-26 schedule may not be published yet') || 
            error.includes('only show the 2024-25 season') || 
            error.includes('offseason')) ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-3">
              <p className="text-xs text-yellow-700">
                <strong>Offseason Notice:</strong> We&apos;re currently in the offseason period. Many teams are still showing their 2024-25 schedules and haven&apos;t published their 2025-26 schedules yet. This is completely normal and expected. Please check back in late summer/early fall when the new season schedules are typically released.
              </p>
            </div>
          ) : (
            <p className="text-xs text-red-600">
              This may be due to website changes or network issues. The scraping functionality works with supported athletics website formats.
            </p>
          )}
        </div>
      )}          {/* Schedule Display */}
          {schedule && (
            <div className="bg-white rounded-lg border">
              {/* Schedule Header */}
              <div className="p-4 border-b bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-lg font-semibold text-gray-900">
                    {schedule.teamName} - {schedule.season}
                  </h4>
                  <div className="text-right">
                    <div className="text-sm font-medium text-blue-600">
                      {schedule.games.length} Games Found
                    </div>
                    <div className="text-xs text-gray-500">
                      Verification Count
                    </div>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Overall:</span> {schedule.record.overall}
                  </div>
                  <div>
                    <span className="font-medium">Conference:</span> {schedule.record.conference}
                  </div>
                  <div>
                    <span className="font-medium">Home:</span> {schedule.record.home}
                  </div>
                  <div>
                    <span className="font-medium">Away:</span> {schedule.record.away}
                  </div>
                  <div>
                    <span className="font-medium">Neutral:</span> {schedule.record.neutral}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Last updated: {schedule.lastUpdated.toLocaleString()}
                </p>
              </div>

          {/* Games List */}
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {schedule.games.map((game, index) => (
              <div key={game.id || index} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">
                        {game.isHome ? 'vs' : '@'} {game.opponent}
                      </span>
                      {game.conference && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                          Conference
                        </span>
                      )}
                      {game.exhibition && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                          Exhibition
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-1 text-sm text-gray-600">
                      <span>{formatDate(game.date)}</span>
                      {game.time && <span> • {formatTime(game.time)}</span>}
                      {game.venue && <span> • {game.venue}</span>}
                      {game.city && game.state && (
                        <span> • {game.city}, {game.state}</span>
                      )}
                    </div>

                    {game.result && (
                      <div className="mt-2">
                        <span className={`text-sm font-medium ${
                          game.result.won ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {game.result.won ? 'W' : 'L'} {game.result.score}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      game.status === 'completed' ? 'bg-green-100 text-green-800' :
                      game.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      game.status === 'postponed' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {game.status.charAt(0).toUpperCase() + game.status.slice(1)}
                    </span>
                  </div>
                </div>

                {game.broadcastInfo && (
                  <div className="mt-2 flex space-x-4 text-xs">
                    {game.broadcastInfo.network && (
                      <span className="text-purple-600">
                        📺 {game.broadcastInfo.network}
                      </span>
                    )}
                    {game.broadcastInfo.watchLink && (
                      <a
                        href={game.broadcastInfo.watchLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Watch Live
                      </a>
                    )}
                    {game.broadcastInfo.ticketsLink && (
                      <a
                        href={game.broadcastInfo.ticketsLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:underline"
                      >
                        Tickets
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {schedule.games.length === 0 && (
            <div className="p-8 text-center">
              <div className="bg-yellow-50 rounded-lg p-6">
                <h4 className="text-yellow-800 font-medium mb-2">No Games Found</h4>
                <p className="text-yellow-700 text-sm mb-3">
                  The 2025-26 season schedule has not been published yet, or no games are currently listed on the website.
                </p>
                <p className="text-xs text-yellow-600">
                  This is common early in the off-season. Check back later for updated schedule information.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Conference mapping for NCAA men's hockey teams
const TEAM_CONFERENCES: { [key: string]: string } = {
  'Boston College': 'Hockey East',
  'Boston University': 'Hockey East',
  'UMass': 'Hockey East',
  'UMass Lowell': 'Hockey East',
  'Northeastern': 'Hockey East',
  'Providence': 'Hockey East',
  'Maine': 'Hockey East',
  'New Hampshire': 'Hockey East',
  'Vermont': 'Hockey East',
  'UConn': 'Hockey East',
  'Merrimack': 'Hockey East',
  'Michigan': 'Big Ten',
  'Michigan State': 'Big Ten',
  'Minnesota': 'Big Ten',
  'Wisconsin': 'Big Ten',
  'Ohio State': 'Big Ten',
  'Penn State': 'Big Ten',
  'Notre Dame': 'Big Ten',
  'Denver': 'NCHC',
  'North Dakota': 'NCHC',
  'Minnesota Duluth': 'NCHC',
  'Colorado College': 'NCHC',
  'Western Michigan': 'NCHC',
  'Miami (OH)': 'NCHC',
  'Omaha': 'NCHC',
  'St. Cloud State': 'NCHC',
  'Quinnipiac': 'ECAC',
  'Cornell': 'ECAC',
  'Clarkson': 'ECAC',
  'Dartmouth': 'ECAC',
  'Harvard': 'ECAC',
  'Princeton': 'ECAC',
  'Brown': 'ECAC',
  'Union (NY)': 'ECAC',
  'Yale': 'ECAC',
  'St. Lawrence': 'ECAC',
  'Colgate': 'ECAC',
  'Rensselaer': 'ECAC',
  'Minnesota State': 'CCHA',
  'Bowling Green': 'CCHA',
  'Alaska Fairbanks': 'Independent',
  'Michigan Tech': 'CCHA',
  'Bemidji State': 'CCHA',
  'Lake Superior State': 'CCHA',
  'Northern Michigan': 'CCHA',
  'Ferris State': 'CCHA',
  'Arizona State': 'NCHC',
  'Army West Point': 'Atlantic Hockey',
  'Bentley': 'Atlantic Hockey',
  'Holy Cross': 'Atlantic Hockey',
  'Sacred Heart': 'Atlantic Hockey',
  'LIU': 'Independent',
  'Niagara': 'Atlantic Hockey',
  'Canisius': 'Atlantic Hockey',
  'Robert Morris': 'Atlantic Hockey',
  'Rochester Institute of Technology': 'Atlantic Hockey',
  'Mercyhurst': 'Atlantic Hockey',
  'Air Force': 'Atlantic Hockey',
  'St. Thomas': 'CCHA',
  'Augustana': 'CCHA',
  'Alaska Anchorage': 'Independent',
  'Lindenwood': 'Independent',
  'Stonehill': 'Independent'
};

interface Team {
  id: string;
  name: string;
  conference: string;
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Load teams from the CSV file
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const response = await fetch('/program_schedule_sites.csv');
        const text = await response.text();
        const teamNames = text.split('\n')
          .map(line => {
            const trimmedLine = line.trim();
            if (trimmedLine && trimmedLine.includes(',')) {
              const [teamName] = trimmedLine.split(',').map(s => s.trim());
              return teamName;
            }
            return '';
          })
          .filter(name => name.length > 0);
        
        const teamsWithConferences: Team[] = teamNames.map((name, index) => ({
          id: (index + 1).toString(),
          name: name,
          conference: TEAM_CONFERENCES[name] || 'Unknown'
        })).sort((a, b) => a.name.localeCompare(b.name));
        
        setTeams(teamsWithConferences);
      } catch (error) {
        console.error('Error loading teams:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTeams();
  }, []);

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.conference.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <Header />
        <div className="flex justify-between items-baseline mb-8">
          <h1 className="text-4xl font-bold">NCAA Men&apos;s Hockey Teams</h1>
          <span className="text-lg text-gray-500">2025-26 Season</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-5">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-10 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-2">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="md:col-span-7">
            <div className="bg-gray-100 rounded-lg p-8 text-center">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-300 rounded w-1/2 mx-auto mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-3/4 mx-auto"></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <Header />
      <div className="flex justify-between items-baseline mb-8">
        <h1 className="text-4xl font-bold">NCAA Men&apos;s Hockey Teams</h1>
        <span className="text-lg text-gray-500">2025-26 Season</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Panel - Team List */}
        <div className="md:col-span-5">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Select a Team</h2>
            
            {/* Search Bar */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search teams or conferences..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Team List */}
            <div className="max-h-96 overflow-y-auto">
              {filteredTeams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeam(team)}
                  className={`w-full text-left p-3 mb-2 rounded-lg border transition-colors ${
                    selectedTeam?.id === team.id
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="font-medium">{team.name}</div>
                  <div className={`text-sm ${
                    selectedTeam?.id === team.id ? 'text-blue-600' : 'text-gray-600'
                  }`}>
                    {team.conference}
                  </div>
                </button>
              ))}
            </div>
            
            {filteredTeams.length === 0 && (
              <p className="text-gray-700 text-center py-4">No teams found</p>
            )}
          </div>
        </div>

        {/* Right Panel - Web Scraping Implementation */}
        <div className="md:col-span-7">
          {selectedTeam ? (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">{selectedTeam.name}</h2>
              <div className="text-gray-600 mb-6">
                <p><strong>Conference:</strong> {selectedTeam.conference}</p>
              </div>
              
              {/* Team Schedule Scraping Section */}
              <TeamScheduleScraper team={selectedTeam} />
            </div>
          ) : (
            <div className="bg-gray-100 rounded-lg p-8 text-center">
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                Select a team to get started
              </h3>
              <p className="text-gray-500">
                Choose a team from the list to begin implementing web scraping features.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
