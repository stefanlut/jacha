'use client';

import { useEffect, useState } from 'react';

import PollSelector from './components/PollSelector';
import { Poll } from './types';
import { USCHOPoll } from './utils/uschoPollScraper';

const defaultPoll: Poll = {
  id: 'd-i-mens-poll',
  name: "Men's Division I",
  url: 'men' // Now using gender instead of URL
};

export default function Home() {
  const [pollData, setPollData] = useState<USCHOPoll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedPoll, setSelectedPoll] = useState<Poll>(defaultPoll);

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        setLoading(true);
        setError('');
        
        const gender = selectedPoll.url as 'men' | 'women';
        const response = await fetch(`/api/polls?gender=${gender}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch poll data');
        }
        
        const poll = await response.json();
        setPollData(poll);
        
      } catch (error) {
        console.error('Error fetching rankings:', error);
        setError(error instanceof Error ? error.message : 'Failed to load rankings');
        setPollData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, [selectedPoll]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-2xl font-semibold mb-2">USCHO Division I Hockey Rankings</h1>
          <p className="text-slate-300">Just Another College Hockey App</p>
        </header>

        <main>
          <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-center mb-6">USCHO Division I Hockey Rankings</h2>
              <PollSelector selectedPoll={selectedPoll} onPollChange={setSelectedPoll} />
              {!loading && !error && pollData && (
                <p className="text-slate-400 text-sm text-center mt-2">Updated {pollData.date}</p>
              )}
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
              </div>
            ) : error ? (
              <div className="text-center text-red-400 p-8">
                <p>{error}</p>
                <p className="mt-2 text-sm text-slate-400">Please try again later or check back for updated rankings.</p>
              </div>
            ) : pollData ? (
              <div className="rankings-table">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="p-3 text-sm font-semibold">Rank</th>
                      <th className="p-3 text-sm font-semibold">Team</th>
                      <th className="p-3 text-sm font-semibold">1st</th>
                      <th className="p-3 text-sm font-semibold">Record</th>
                      <th className="p-3 text-sm font-semibold">Points</th>
                      <th className="p-3 text-sm font-semibold">Last Week</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pollData.teams.map((team) => (
                      <tr key={team.rank} className="border-b border-white/10 hover:bg-white/5">
                        <td className="p-3 font-medium">{team.rank}</td>
                        <td className="p-3">{team.team}</td>
                        <td className="p-3 text-center">{team.firstPlaceVotes || ''}</td>
                        <td className="p-3 text-center">{team.record}</td>
                        <td className="p-3 text-center">{team.points}</td>
                        <td className="p-3 text-center">{team.lastWeekRank || 'NR'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {pollData.othersReceivingVotes && (
                  <div className="mt-6 text-sm text-slate-300">
                    <p className="font-semibold mb-2">Others Receiving Votes:</p>
                    <p>{pollData.othersReceivingVotes}</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </main>

        <footer className="text-center mt-8 text-slate-400 text-sm">
          <p>Data provided by <a href="https://www.uscho.com" className="hover:text-white">USCHO.com</a></p>
        </footer>
      </div>
    </div>
  );
}
