'use client';

import { useState, useEffect } from 'react';
import { CHNScoreboard, CHNScoreboardGame } from '@/app/types';

interface ScoreboardProps {
  initialDate?: Date;
}

export default function Scoreboard({ initialDate }: ScoreboardProps) {
  const [scoreboard, setScoreboard] = useState<CHNScoreboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
  const [selectedGender, setSelectedGender] = useState<'men' | 'women'>('men');

  useEffect(() => {
    const fetchScoreboard = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Build YYYY-MM-DD from local date parts to avoid timezone shifting
        const y = selectedDate.getFullYear();
        const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const d = String(selectedDate.getDate()).padStart(2, '0');
        const dateParam = `${y}-${m}-${d}`;
        const response = await fetch(`/api/scoreboard?date=${dateParam}&gender=${selectedGender}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch scoreboard');
        }
        
        const scoreboardData = await response.json();
        
        // Convert date strings back to Date objects
        scoreboardData.date = new Date(scoreboardData.date);
        scoreboardData.lastUpdated = new Date(scoreboardData.lastUpdated);
        scoreboardData.games = scoreboardData.games.map((game: CHNScoreboardGame) => ({
          ...game,
          date: new Date(game.date)
        }));
        
        setScoreboard(scoreboardData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch scoreboard');
      } finally {
        setLoading(false);
      }
    };

    fetchScoreboard();
  }, [selectedDate, selectedGender]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatGameResult = (game: CHNScoreboardGame) => {
    if (game.status === 'completed' && game.result) {
      return `${game.result.awayScore}-${game.result.homeScore}`;
    }
    return game.time || 'TBD';
  };

  const getGameStatusClass = (game: CHNScoreboardGame) => {
    if (game.status === 'completed') {
      return 'bg-green-600/30 text-green-300';
    }
    return 'bg-blue-600/30 text-blue-300';
  };

  const goToPreviousDay = () => {
    const prevDay = new Date(selectedDate);
    prevDay.setDate(prevDay.getDate() - 1);
    setSelectedDate(prevDay);
  };

  const goToNextDay = () => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setSelectedDate(nextDay);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  if (loading) {
    return (
      <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
        <div className="animate-pulse">
          <div className="h-8 bg-white/20 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 bg-white/10 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
        <div className="text-center text-red-400">
          <p className="text-lg font-semibold mb-2">Error Loading Scoreboard</p>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600/30 text-red-300 rounded hover:bg-red-600/50 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 rounded-lg p-4 sm:p-6 backdrop-blur-sm">
      {/* Header with controls */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-white">Live Scoreboard</h1>
          
          {/* Gender Toggle */}
          <div className="flex bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setSelectedGender('men')}
              className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                selectedGender === 'men'
                  ? 'bg-white/20 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Men&apos;s
            </button>
            <button
              onClick={() => setSelectedGender('women')}
              className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                selectedGender === 'women'
                  ? 'bg-white/20 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Women&apos;s
            </button>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
            <button
              onClick={goToPreviousDay}
              className="px-2 sm:px-3 py-2 bg-white/10 text-white rounded hover:bg-white/20 transition-colors text-sm sm:text-base"
            >
              ← Prev
            </button>
            <button
              onClick={goToNextDay}
              className="px-2 sm:px-3 py-2 bg-white/10 text-white rounded hover:bg-white/20 transition-colors text-sm sm:text-base"
            >
              Next →
            </button>
          </div>
          
          <div className="text-center sm:text-center flex-1 sm:flex-initial">
            <h2 className="text-base sm:text-lg font-semibold text-white">
              {formatDate(selectedDate)}
            </h2>
            <button
              onClick={goToToday}
              className="text-xs sm:text-sm text-slate-300 hover:text-white transition-colors"
            >
              Go to Today
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-400">
          Last updated: {scoreboard?.lastUpdated.toLocaleTimeString()}
        </div>
      </div>

      {/* Games List */}
      <div className="space-y-3">
        {scoreboard?.games.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            <p>No games scheduled for this date</p>
          </div>
        ) : (
          scoreboard?.games.map((game) => (
            <div
              key={game.id}
              className="p-3 sm:p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
            >
              {/* Mobile: Stack vertically, Desktop: Side by side */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                {/* Team matchup */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 text-white font-medium">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="truncate text-sm sm:text-base">{game.awayTeam}</span>
                      <span className="text-slate-400 text-sm">@</span>
                      <span className="truncate text-sm sm:text-base">{game.homeTeam}</span>
                    </div>
                  </div>
                  <div className="flex items-center flex-wrap gap-2 mt-1">
                    {game.exhibition && (
                      <span className="text-xs bg-yellow-600/30 text-yellow-300 px-2 py-1 rounded">
                        EX
                      </span>
                    )}
                    <span className="text-xs text-slate-400 truncate">{game.conference}</span>
                  </div>
                </div>
                
                {/* Score and status */}
                <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                  <div className={`text-xs sm:text-sm font-bold px-2 sm:px-3 py-1 sm:py-2 rounded whitespace-nowrap ${getGameStatusClass(game)}`}>
                    {game.status === 'completed' ? 'Final' : 'Scheduled'}
                  </div>
                  <div className="text-white font-mono text-base sm:text-lg min-w-[50px] sm:min-w-[60px] text-right">
                    {formatGameResult(game)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}