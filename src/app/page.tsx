'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import * as cheerio from 'cheerio';

import PollSelector from './components/PollSelector';
import { Poll } from './types';
import { varsity } from './fonts';

const defaultPoll: Poll = {
  id: 'd-i-mens-poll',
  name: "Men's Division I",
  url: 'https://json-b.uscho.com/json/rankings/d-i-mens-poll'
};

export default function Home() {
  const [rankingsHtml, setRankingsHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [pollDate, setPollDate] = useState<string>('');
  const [selectedPoll, setSelectedPoll] = useState<Poll>(defaultPoll);

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await axios.get(selectedPoll.url, {
          headers: {
            'Accept': 'application/json',
          }
        });
        
        if (!response.data?.html) {
          throw new Error('No data received from USCHO');
        }

        const $ = cheerio.load(response.data.html);
        
        // Remove unwanted elements first
        $('.small-text, script').remove();
        
        // Get the main rankings table
        const table = $('table').first();
        if (!table.length) {
          throw new Error('No rankings table found');
        }
        
        // Replace links with their text content
        table.find('a').each((_, elem) => {
          const $link = $(elem);
          $link.replaceWith($link.text());
        });

        // Try to find the poll date
        const headerText = $('h1, h2, h3, h4').text();
        const dateMatch = headerText.match(/(?:Rankings|Poll).*?([A-Z][a-z]+ \d{1,2},? \d{4})/);
        if (dateMatch) {
          setPollDate(dateMatch[1]);
        } else {
          // If no date found in headers, look for it in other text
          $('*').each((i, elem) => {
            const text = $(elem).text();
            const match = text.match(/(?:Rankings|Poll).*?([A-Z][a-z]+ \d{1,2},? \d{4})/);
            if (match) {
              setPollDate(match[1]);
              return false; // break the loop
            }
          });
        }

        // Try to find the "Others Receiving Votes" text
        let othersVotes = '';
        
        // First try to find it in any HTML element
        $('*').each((i, elem) => {
          $(elem).contents().each((j, child) => {
            if (child.type === 'text') {
              const text = $(child).text().trim();
              if (text.toLowerCase().includes('others receiving votes')) {
                othersVotes = text;
                return false; // break the loop
              }
            }
          });
          if (othersVotes) return false; // break outer loop if found
        });

        // If still not found, try searching the raw HTML
        if (!othersVotes) {
          const fullHtml = response.data.html;
          const match = fullHtml.match(/Others receiving votes:[\s\w,\.]+/i);
          if (match) {
            othersVotes = match[0];
          }
        }

        // Create the cleaned HTML with rankings and others receiving votes
        const cleanedHtml = `${$.html(table)}
          ${othersVotes ? `
            <div class="mt-6 text-sm text-slate-300">
              <p class="font-semibold mb-2">Others Receiving Votes:</p>
              <p>${othersVotes.replace(/others\s+receiving\s+votes:?/i, '').trim()}</p>
            </div>
          ` : ''}`;
        
        setRankingsHtml(cleanedHtml);
      } catch (error) {
        console.error('Error fetching rankings:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch rankings');
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, [selectedPoll.url]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className={`text-5xl mb-2 ${varsity.className} tracking-wider`}>JACHA</h1>
          <p className="text-slate-300">Just Another College Hockey App</p>
        </header>

        <main>
          <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-center mb-6">USCHO Division I Hockey Rankings</h2>
              <PollSelector selectedPoll={selectedPoll} onPollChange={setSelectedPoll} />
              {!loading && !error && rankingsHtml && (
                <p className="text-slate-400 text-sm text-center mt-2">Updated {pollDate}</p>
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
            ) : (
              <div 
                className="rankings-table prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: rankingsHtml }}
              />
            )}
          </div>
        </main>

        <footer className="text-center mt-8 text-slate-400 text-sm">
          <p>Data provided by USCHO.com</p>
        </footer>
      </div>
    </div>
  );
}
