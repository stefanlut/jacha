import * as cheerio from 'cheerio';
import { CHNScoreboard, CHNScoreboardGame } from '@/app/types';

export class CHNLiveScoreboardScraper {
  private static readonly USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  
  /**
   * Scrape live scoreboard data for today's games with real-time updates
   */
  static async scrapeLiveScoreboard(gender: 'men' | 'women' = 'men'): Promise<CHNScoreboard> {
    const baseUrl = gender === 'women' 
      ? 'https://www.collegehockeynews.com/women/scoreboard.php'
      : 'https://www.collegehockeynews.com/schedules/scoreboard.php';
    
    try {
      const response = await fetch(baseUrl, {
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      const games: CHNScoreboardGame[] = [];
      const today = new Date();

      // CHN uses table structure for games:
      // Row 1: away logo (alt="away logo") -> team name -> game time
      // Row 2: home logo (alt="home logo") -> team name
      
      // Find all away team logos and process them with their corresponding home team
      $('img[alt*="away logo"]').each((_, awayImg) => {
        try {
          const $awayImg = $(awayImg);
          const $awayRow = $awayImg.closest('tr');
          const $homeRow = $awayRow.next('tr');
          
          // Extract team names - handle different table structures
          // Men's: logo | empty | team | empty | time
          // Women's: logo | team | score | time
          const $awayCells = $awayRow.find('td');
          const $homeCells = $homeRow.find('td');
          
          let awayTeam = '';
          let homeTeam = '';
          
          // Try women's structure first (logo | team | score)
          if ($awayCells.length >= 3 && $awayCells.eq(1).text().trim() !== '' && !isNaN(parseInt($awayCells.eq(2).text().trim()))) {
            awayTeam = $awayCells.eq(1).text().trim();
            homeTeam = $homeCells.eq(1).text().trim();
          } else {
            // Fall back to men's structure (logo | empty | team | empty)
            awayTeam = $awayCells.eq(2).text().trim();
            homeTeam = $homeCells.eq(2).text().trim();
          }
          
          if (!awayTeam || !homeTeam) {
            return; // continue to next
          }
          
          // Extract game time from the gamestatus cell
          const gameTime = $awayRow.find('.gamestatus').text().trim();
          
          // Check for scores based on table structure
          let awayScoreText = '';
          let homeScoreText = '';
          
          if ($awayCells.length >= 3 && $awayCells.eq(1).text().trim() !== '' && !isNaN(parseInt($awayCells.eq(2).text().trim()))) {
            // Women's structure: logo | team | score
            awayScoreText = $awayCells.eq(2).text().trim();
            homeScoreText = $homeCells.eq(2).text().trim();
          } else {
            // Men's structure: logo | empty | team | score (or empty)
            awayScoreText = $awayCells.eq(3).text().trim();
            homeScoreText = $homeCells.eq(3).text().trim();
          }
          
          let status: CHNScoreboardGame['status'] = 'scheduled';
          let result: CHNScoreboardGame['result'] | undefined;
          let liveData: CHNScoreboardGame['liveData'] | undefined;
          let time: string | undefined;
          
          // Check if scores are present (completed or in-progress game)
          if (awayScoreText && homeScoreText && !isNaN(parseInt(awayScoreText)) && !isNaN(parseInt(homeScoreText))) {
            result = {
              awayScore: parseInt(awayScoreText),
              homeScore: parseInt(homeScoreText),
            };
            
            // Check if it's a live game (look for period info)
            if (gameTime.includes('Per.') || gameTime.includes('Period')) {
              status = 'in-progress';
              // Parse live data if available
              const liveMatch = gameTime.match(/(\d+)\s*Per\.\s*(\d+)\s*(\d+):(\d+)/);
              if (liveMatch) {
                liveData = {
                  period: `Period ${liveMatch[1]}`,
                  timeRemaining: `${liveMatch[3]}:${liveMatch[4]}`,
                };
              }
            } else {
              status = 'completed';
            }
          } else if (gameTime.match(/\d+:\d+\s*(ET|CT|MT|PT|AT)/)) {
            // Scheduled game
            time = gameTime;
          }
          
          // Determine conference and exhibition status by looking for the confGroup container
          let conference = 'Non-Conference';
          let isExhibition = false;
          
          // Find the confGroup div that contains this game
          const $confGroup = $awayRow.closest('.confGroup');
          if ($confGroup.length) {
            const sectionHeader = $confGroup.find('h2').text().trim();
            
            if (sectionHeader.toLowerCase().includes('exhibition')) {
              isExhibition = true;
            }
            
            if (sectionHeader.includes('Hockey East')) {
              conference = 'Hockey East';
            } else if (sectionHeader.includes('NCHC')) {
              conference = 'NCHC'; 
            } else if (sectionHeader.includes('Big Ten')) {
              conference = 'Big Ten';
            } else if (sectionHeader.includes('CCHA')) {
              conference = 'CCHA';
            } else if (sectionHeader.includes('ECAC')) {
              conference = 'ECAC';
            } else if (sectionHeader.includes('Atlantic Hockey')) {
              conference = 'Atlantic Hockey';
            }
          }
          
          const gameId = `${awayTeam}-at-${homeTeam}-${today.toISOString().split('T')[0]}`.replace(/\s+/g, '-');
          
          const game: CHNScoreboardGame = {
            id: gameId,
            date: today,
            awayTeam,
            homeTeam,
            conference,
            exhibition: isExhibition,
            status,
            time,
            result,
            liveData,
          };
          
          games.push(game);
          
        } catch (error) {
          console.warn('Error parsing game row:', error);
        }
      });

      return {
        date: today,
        gender,
        games,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('Live scoreboard scraping error:', error);
      throw new Error(`Failed to scrape ${gender}'s live scoreboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }





  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static parseGameRow($: cheerio.CheerioAPI, cells: cheerio.Cheerio<any>, date: Date): CHNScoreboardGame | null {
    if (cells.length < 4) return null;

    try {
      // Standard table row parsing for fallback
      const awayTeam = cells.eq(0).text().trim();
      const awayScoreText = cells.eq(1).text().trim();
      const homeTeam = cells.eq(2).text().trim();
      const homeScoreText = cells.eq(3).text().trim();
      
      if (!awayTeam || !homeTeam) return null;

      // Check for completed games
      const isCompleted = awayScoreText && homeScoreText && 
                         !isNaN(parseInt(awayScoreText)) && !isNaN(parseInt(homeScoreText));

      const gameId = `${awayTeam}-at-${homeTeam}-${date.toISOString().split('T')[0]}`.replace(/\s+/g, '-');

      const game: CHNScoreboardGame = {
        id: gameId,
        date,
        awayTeam,
        homeTeam,
        conference: 'Non-Conference',
        exhibition: false,
        status: isCompleted ? 'completed' : 'scheduled',
      };

      if (isCompleted) {
        game.result = {
          awayScore: parseInt(awayScoreText),
          homeScore: parseInt(homeScoreText),
        };
      }

      return game;
    } catch (error) {
      console.warn('Error parsing game row:', error);
      return null;
    }
  }
}