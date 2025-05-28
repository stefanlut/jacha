'use client';

import { useState } from 'react';
import Link from 'next/link';
import TeamSelector from '@/app/components/TeamSelector';
import TeamProfile from '@/app/components/TeamProfile';
import { SportRadarTeam } from '@/app/types';

export default function TeamsPage() {
  const [selectedTeam, setSelectedTeam] = useState<SportRadarTeam | null>(null);

  return (
    <main className="container mx-auto px-4 py-8">
      <nav className="mb-8 flex gap-4">
        <Link href="/" className="text-blue-600 hover:text-blue-800">Rankings</Link>
        <Link href="/teams" className="text-blue-600 hover:text-blue-800">Team Profiles</Link>
      </nav>
      
      <h1 className="text-4xl font-bold mb-8">Team Profiles</h1>
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
