'use client';

import { useState, useEffect } from 'react';
import { TeamSchedule, ScheduleGame } from '@/app/types';
import axios from 'axios';

interface TeamScheduleProps {
  teamId: string;
  teamName: string;
  customUrl?: string;
}

export default function TeamScheduleComponent({ teamId, teamName, customUrl }: TeamScheduleProps) {
  const [schedule, setSchedule] = useState<TeamSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const params = new URLSearchParams();
        params.append('teamName', teamName);
        if (customUrl) {
          params.append('url', customUrl);
        }

        const response = await axios.get<TeamSchedule>(`/api/teams/${teamId}/schedule?${params}`);
        setSchedule(response.data);
      } catch (err) {
        console.error('Error fetching schedule:', err);
        setError('Failed to load team schedule');
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [teamId, teamName, customUrl]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex justify-between items-center p-3 border rounded">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-1/6"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg p-6">
        <div className="flex items-center mb-2">
          <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-red-800 font-semibold">Schedule Unavailable</h3>
        </div>
        <p className="text-red-700">{error}</p>
        <p className="text-red-600 text-sm mt-2">
          This feature requires web scraping from the team&apos;s official website. 
          Some teams may not be supported yet or their website structure may have changed.
        </p>
      </div>
    );
  }

  if (!schedule) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Schedule Header */}
      <div className="border-b pb-4 mb-6">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-2xl font-bold text-gray-900">
            {schedule.season} Schedule
          </h3>
          <div className="text-sm text-gray-500">
            Last updated: {new Date(schedule.lastUpdated).toLocaleDateString()}
          </div>
        </div>
        
        {/* Season Record */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div className="bg-gray-50 rounded p-3">
            <div className="text-sm text-gray-600">Overall</div>
            <div className="font-semibold">{schedule.record.overall}</div>
          </div>
          <div className="bg-blue-50 rounded p-3">
            <div className="text-sm text-gray-600">Conference</div>
            <div className="font-semibold">{schedule.record.conference}</div>
          </div>
          <div className="bg-green-50 rounded p-3">
            <div className="text-sm text-gray-600">Home</div>
            <div className="font-semibold">{schedule.record.home}</div>
          </div>
          <div className="bg-orange-50 rounded p-3">
            <div className="text-sm text-gray-600">Away</div>
            <div className="font-semibold">{schedule.record.away}</div>
          </div>
          <div className="bg-purple-50 rounded p-3">
            <div className="text-sm text-gray-600">Neutral</div>
            <div className="font-semibold">{schedule.record.neutral}</div>
          </div>
        </div>
      </div>

      {/* Games List */}
      <div className="space-y-3">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">
          Games ({schedule.games.length})
        </h4>
        
        {schedule.games.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No games found in the schedule
          </div>
        ) : (
          schedule.games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))
        )}
      </div>
    </div>
  );
}

function GameCard({ game }: { game: ScheduleGame }) {
  const gameDate = new Date(game.date);
  const isToday = gameDate.toDateString() === new Date().toDateString();

  return (
    <div className={`p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
      isToday ? 'border-blue-300 bg-blue-50' : ''
    }`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900">
              {gameDate.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              })}
            </span>
            {game.time && (
              <span className="text-sm text-gray-600">
                at {game.time}
              </span>
            )}
            {game.exhibition && (
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                Exhibition
              </span>
            )}
            {game.conference && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded">
                Conference
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-600">
              {game.isHome ? 'vs' : 'at'}
            </span>
            <span className="font-medium text-gray-900">
              {game.opponent}
            </span>
          </div>

          {(game.venue || game.city) && (
            <div className="text-sm text-gray-600">
              📍 {game.venue ? `${game.venue}, ` : ''}{game.city}{game.state ? `, ${game.state}` : ''}
            </div>
          )}

          {game.broadcastInfo?.network && (
            <div className="text-sm text-blue-600 mt-1">
              📺 {game.broadcastInfo.network}
            </div>
          )}
        </div>

        <div className="text-right">
          <div className={`px-2 py-1 text-xs rounded ${
            game.status === 'completed' ? 'bg-green-100 text-green-700' :
            game.status === 'scheduled' ? 'bg-gray-100 text-gray-700' :
            game.status === 'postponed' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {game.status.charAt(0).toUpperCase() + game.status.slice(1)}
          </div>
          
          {game.result && (
            <div className={`mt-1 font-semibold ${
              game.result.won ? 'text-green-600' : 'text-red-600'
            }`}>
              {game.result.won ? 'W' : 'L'} {game.result.score}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
