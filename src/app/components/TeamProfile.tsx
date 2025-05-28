'use client';

import { useState, useEffect } from 'react';
import { SportRadarTeam, TeamProfileData } from '@/app/types';
import axios from 'axios';

interface TeamProfileProps {
  team: SportRadarTeam;
}

export default function TeamProfile({ team }: TeamProfileProps) {
  const [profileData, setProfileData] = useState<TeamProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeamProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get<TeamProfileData>(`/api/teams/${team.id}/profile`);
        setProfileData(response.data);
      } catch (err) {
        setError('Failed to load team profile');
        console.error('Error fetching team profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamProfile();
  }, [team.id]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Loading team profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg p-6">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!profileData) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">{profileData.market} {profileData.name}</h2>
      
      {/* Conference Info */}
      {profileData.conference && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Conference</h3>
          <p>{profileData.conference.name}</p>
        </div>
      )}

      {/* Venue Info */}
      {profileData.venue && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Home Arena</h3>
          <p>{profileData.venue.name}</p>
          <p>{profileData.venue.city}, {profileData.venue.state}</p>
          {profileData.venue.capacity && (
            <p>Capacity: {profileData.venue.capacity.toLocaleString()}</p>
          )}
        </div>
      )}

      {/* Players */}
      {profileData.players && profileData.players.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Players</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profileData.players.map((player) => (
              <div key={player.id} className="p-3 border rounded">
                <p className="font-semibold">
                  {player.jersey_number && `#${player.jersey_number} `}
                  {player.full_name}
                </p>
                <p className="text-sm text-gray-600">
                  {player.position}
                  {player.class_year && ` • ${player.class_year}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
