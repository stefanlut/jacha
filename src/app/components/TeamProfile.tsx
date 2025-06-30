'use client';

import { useState, useEffect } from 'react';
import { SportRadarTeam, TeamProfileData } from '@/app/types';
import TeamScheduleComponent from './TeamSchedule';
import axios from 'axios';

interface TeamProfileProps {
  team: SportRadarTeam;
}

export default function TeamProfile({ team }: TeamProfileProps) {
  const [profileData, setProfileData] = useState<TeamProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'profile' | 'schedule'>('profile');

  useEffect(() => {
    const fetchTeamProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get<TeamProfileData>(`/api/teams/${team.id}/profile`);
        setProfileData(response.data);
        setRetryCount(0); // Reset retry count on success
      } catch (err) {
        setError('Failed to load team profile');
        console.error('Error fetching team profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamProfile();
  }, [team.id, retryCount]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-6"></div>
          <div className="mb-6">
            <div className="h-5 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="mb-6">
            <div className="h-5 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-1"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
          <div>
            <div className="h-5 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="p-3 border rounded">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg p-6">
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

  if (!profileData) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Team Header */}
      <div className="border-b pb-4 mb-6">
        <h2 className="text-3xl font-bold text-gray-900">{profileData.market}</h2>
        <h3 className="text-xl text-gray-700">{profileData.name}</h3>
        {profileData.alias && (
          <p className="text-sm text-gray-500 mt-1">({profileData.alias})</p>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 border-b">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'profile'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Team Profile
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'schedule'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Schedule
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' ? (
        <ProfileTabContent profileData={profileData} />
      ) : (
        <TeamScheduleComponent 
          teamId={team.id} 
          teamName={team.market}
        />
      )}
    </div>
  );
}

// Separate component for profile tab content
function ProfileTabContent({ profileData }: { profileData: TeamProfileData }) {
  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Team Info */}
        <div className="space-y-6">
          {/* Conference Info */}
          {profileData.conference && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2 text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Conference
              </h3>
              <p className="text-gray-800 font-medium">{profileData.conference.name}</p>
              {profileData.conference.alias && (
                <p className="text-sm text-gray-600">({profileData.conference.alias})</p>
              )}
            </div>
          )}

          {/* Venue Info */}
          {profileData.venue && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2 text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Home Arena
              </h3>
              <p className="text-gray-800 font-medium">{profileData.venue.name}</p>
              <p className="text-gray-600">{profileData.venue.city}, {profileData.venue.state}</p>
              {profileData.venue.capacity && (
                <p className="text-sm text-gray-600 mt-1">
                  Capacity: <span className="font-medium">{profileData.venue.capacity.toLocaleString()}</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Additional Info */}
        <div className="space-y-6">
          {/* Team Stats Placeholder */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Season Information
            </h3>
            <p className="text-gray-600">2025-26 Season data will be available when the season begins.</p>
          </div>
        </div>
      </div>

      {/* Players Section */}
      {profileData.players && profileData.players.length > 0 && (
        <div className="mt-8">
          <h3 className="text-2xl font-bold mb-4 text-gray-900 flex items-center">
            <svg className="w-6 h-6 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Roster ({profileData.players.length} players)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profileData.players
              .sort((a, b) => {
                // Sort by jersey number if available, then by name
                if (a.jersey_number && b.jersey_number) {
                  return parseInt(a.jersey_number) - parseInt(b.jersey_number);
                }
                return a.full_name.localeCompare(b.full_name);
              })
              .map((player) => (
                <div key={player.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-gray-900">
                      {player.jersey_number && (
                        <span className="text-blue-600 mr-2">#{player.jersey_number}</span>
                      )}
                      {player.full_name}
                    </p>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p className="font-medium">{player.position}</p>
                    {player.class_year && (
                      <p>{player.class_year}</p>
                    )}
                    {(player.height || player.weight) && (
                      <p>
                        {player.height && `${player.height}`}
                        {player.height && player.weight && ', '}
                        {player.weight && `${player.weight} lbs`}
                      </p>
                    )}
                    {player.shoots && (
                      <p>Shoots: {player.shoots === 'R' ? 'Right' : 'Left'}</p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
