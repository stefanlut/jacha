'use client';

import { useState } from 'react';
import Header from '@/app/components/Header';
import TeamScheduleSelector from '@/app/components/TeamScheduleSelector';
import TeamScheduleDisplay from '@/app/components/TeamScheduleDisplay';

export default function SchedulesPage() {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedGender, setSelectedGender] = useState<'men' | 'women'>('men');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Team Schedules</h1>
          <p className="text-slate-300">NCAA Division I Hockey Schedules</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <TeamScheduleSelector 
              selectedTeam={selectedTeam}
              onTeamChange={setSelectedTeam}
              selectedGender={selectedGender}
              onGenderChange={setSelectedGender}
            />
          </div>

          <div>
            {selectedTeam ? (
              <TeamScheduleDisplay teamName={selectedTeam} gender={selectedGender} />
            ) : (
              <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
                <div className="text-center text-slate-400 py-16">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-lg font-medium mb-2">Select a Team</h3>
                  <p>Choose a team from the list to view their schedule</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="text-center mt-12 text-slate-400 text-sm">
          <p>Schedule data provided by <a href="https://www.collegehockeynews.com" className="hover:text-white">College Hockey News</a></p>
        </footer>
      </div>
    </div>
  );
}
