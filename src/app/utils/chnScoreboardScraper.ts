import * as cheerio from 'cheerio';
import { CHNScoreboard, CHNScoreboardGame } from '@/app/types';

export class CHNScoreboardScraper {
  private static readonly USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  
  /**
   * Scrape scoreboard data for a specific date and gender
   */
  static async scrapeScoreboard(date: Date, gender: 'men' | 'women' = 'men'): Promise<CHNScoreboard> {
    const baseUrl = gender === 'women' 
      ? 'https://www.collegehockeynews.com/women/schedule.php'
      : 'https://www.collegehockeynews.com/schedules/';
    
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

      // Look for schedule data in table rows
      let foundTargetDate = false;
      
      $('tr').each((_, row) => {
        const $row = $(row);
        const cells = $row.find('td');
        
        // Check if this row contains a date header
        if (cells.length === 1) {
          const dateText = cells.first().text().trim();
          const targetDateStr = date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          });
          
          if (dateText === targetDateStr) {
            foundTargetDate = true;
            console.log(`Found target date: ${targetDateStr}`);
            return;
          } else if (dateText.match(/^\w+, \w+ \d+, \d{4}$/)) {
            // This is a different date, stop looking if we were in target date
            if (foundTargetDate) {
              foundTargetDate = false;
            }
            return;
          }
        }
        
        // If we found the target date and this is a game row, parse it
        if (foundTargetDate && cells.length >= 8) {
          try {
            const gameData = this.parseGameRow($, cells, date);
            if (gameData) {
              games.push(gameData);
            }
          } catch (error) {
            console.warn('Error parsing game row:', error);
          }
        }
      });

      return {
        date,
        gender,
        games,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('Scoreboard scraping error:', error);
      throw new Error(`Failed to scrape ${gender}'s scoreboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static parseGameRow($: cheerio.CheerioAPI, cells: cheerio.Cheerio<any>, date: Date): CHNScoreboardGame | null {
    if (cells.length < 8) return null;

    try {
      // Parse based on the structure observed:
      // [0]: Away team, [1]: Away score (if completed), [2]: "at"/"vs.", [3]: Home team, 
      // [4]: Home score (if completed), [5]: empty, [6]: time/status, [7]: box score link
      
      const awayTeam = $(cells[0]).text().trim();
      const awayScoreText = $(cells[1]).text().trim();
      const homeTeam = $(cells[3]).text().trim();
      const homeScoreText = $(cells[4]).text().trim();
      const timeText = $(cells[6]).text().trim();
      
      if (!awayTeam || !homeTeam) return null;

      // Determine if game is completed by checking for scores
      const isCompleted = awayScoreText && homeScoreText && 
                         !isNaN(parseInt(awayScoreText)) && !isNaN(parseInt(homeScoreText));

      // Parse conference info - look for conference headers in previous rows
      const conference = 'Non-Conference';
      let exhibition = false;
      
      // Check if this is an exhibition game
      if (timeText.includes('Exhibition') || awayTeam.includes('Exhibition') || homeTeam.includes('Exhibition')) {
        exhibition = true;
      }

      // Generate unique ID
      const gameId = `${awayTeam}-at-${homeTeam}-${date.toISOString().split('T')[0]}`.replace(/\s+/g, '-');

      const game: CHNScoreboardGame = {
        id: gameId,
        date,
        awayTeam,
        homeTeam,
        conference,
        exhibition,
        status: isCompleted ? 'completed' : 'scheduled',
        time: isCompleted ? undefined : timeText,
      };

      // Add result if completed
      if (isCompleted) {
        game.result = {
          awayScore: parseInt(awayScoreText),
          homeScore: parseInt(homeScoreText),
        };
      }

      return game;
    } catch (error) {
      console.warn('Error parsing individual game:', error);
      return null;
    }
  }
}