'use client';

import { useState, useEffect } from 'react';
import { CHNTeamSchedule, CHNScheduleGame } from '@/app/types';

interface TeamScheduleDisplayProps {
  teamName: string;
}

export default function TeamScheduleDisplay({ teamName }: TeamScheduleDisplayProps) {
  const [schedule, setSchedule] = useState<CHNTeamSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchedule = async () => {
      if (!teamName) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/schedule?team=${encodeURIComponent(teamName)}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch schedule');
        }
        
        const scheduleData = await response.json();
        
        // Convert date strings back to Date objects
        if (scheduleData.games) {
          scheduleData.games = scheduleData.games.map((game: { date: string; [key: string]: unknown }) => ({
            ...game,
            date: new Date(game.date)
          }));
        }
        if (scheduleData.lastUpdated) {
          scheduleData.lastUpdated = new Date(scheduleData.lastUpdated);
        }
        
        setSchedule(scheduleData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch schedule');
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [teamName]);

  if (loading) {
    return (
      <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
        <div className="animate-pulse">
          <div className="h-8 bg-white/20 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
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
          <p className="text-lg font-semibold mb-2">Error Loading Schedule</p>
          <p>{error}</p>
          <p className="text-sm text-slate-400 mt-2">
            Please try selecting a different team or refresh the page.
          </p>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
        <div className="text-center text-slate-400">
          <p>No schedule data available</p>
        </div>
      </div>
    );
  }

  // Group games by month
  const gamesByMonth = schedule.games.reduce((acc, game) => {
    const monthKey = game.date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(game);
    return acc;
  }, {} as Record<string, CHNScheduleGame[]>);

  const formatGameTime = (time?: string) => {
    if (!time) return '';
    return time;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">{schedule.teamName}</h2>
        <div className="flex flex-wrap gap-4 text-sm text-slate-300">
          <span>Season: {schedule.season}</span>
          <span>Overall: {schedule.record.overall}</span>
          <span>Conference: {schedule.record.conference}</span>
        </div>
        <div className="text-xs text-slate-400 mt-2">
          Last updated: {schedule.lastUpdated.toLocaleDateString()}
        </div>
      </div>

      {/* Schedule */}
      <div className="space-y-6">
        {Object.entries(gamesByMonth).map(([month, games]) => (
          <div key={month}>
            <h3 className="text-lg font-semibold text-white mb-3 border-b border-white/20 pb-1">
              {month}
            </h3>
            <div className="space-y-2">
              {games.map((game) => (
                <div
                  key={game.id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-slate-300 w-16">
                      {formatDate(game.date)}
                    </div>
                    <div className="flex items-center space-x-2">
                      {!game.isHome && (
                        <span className="text-xs text-slate-400">@</span>
                      )}
                      <span className="text-white font-medium">
                        {game.opponent}
                      </span>
                      {game.exhibition && (
                        <span className="text-xs bg-yellow-600/30 text-yellow-300 px-2 py-1 rounded">
                          EX
                        </span>
                      )}
                      {!game.conference && !game.exhibition && (
                        <span className="text-xs bg-blue-600/30 text-blue-300 px-2 py-1 rounded">
                          NC
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-slate-300">
                    {formatGameTime(game.time)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {schedule.games.length === 0 && (
        <div className="text-center text-slate-400 py-8">
          <p>No games scheduled</p>
        </div>
      )}
    </div>
  );
}