'use client';

import { useState } from 'react';
import TeamSelector from '@/app/components/TeamSelector';
import TeamProfile from '@/app/components/TeamProfile';
import Header from '@/app/components/Header';
import { SportRadarTeam } from '@/app/types';

export default function TeamsPage() {
  const [selectedTeam, setSelectedTeam] = useState<SportRadarTeam | null>(null);
  const season = '2024-25';  // We'll update this when we implement season selection

  return (
    <main className="container mx-auto px-4 py-8">
      <Header />
      <div className="flex justify-between items-baseline mb-8">
        <h1 className="text-4xl font-bold">Team Profiles</h1>
        <span className="text-lg text-gray-500">{season} Season</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-5">
          <TeamSelector onTeamSelect={setSelectedTeam} />
        </div>
        <div className="md:col-span-7">
          {selectedTeam ? (
            <TeamProfile team={selectedTeam} />
          ) : (
            <div className="bg-gray-100 rounded-lg p-8 text-center">
              <p className="text-gray-800">Select a team to view their profile</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
