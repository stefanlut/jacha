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

      // Build date sections: each header (single td) with subsequent rows
  // Using loose typing for Cheerio nodes to avoid cross-env type issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Section = { header: string; rows: any[] };
      const sections: Section[] = [];
      let current: Section | null = null;

      $('tr').each((_, row) => {
        const $row = $(row);
        const cells = $row.find('td');
        if (cells.length === 1) {
          const header = cells.first().text().replace(/\s+/g, ' ').trim();
          if (/^\w+, \w+ \d+, \d{4}$/.test(header)) {
            current = { header, rows: [] };
            sections.push(current);
          }
          return;
        }
        if (current) {
          // Store the raw row node; we'll wrap with $ later
          current.rows.push(row);
        }
      });

      const targetDateStr = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

      const target = sections.find(sec => sec.header === targetDateStr);
      const games: CHNScoreboardGame[] = [];
      if (target) {
        for (const rawRow of target.rows) {
          const $row = $(rawRow as never);
          const cells = $row.find('td');
          if (cells.length >= 8) {
            const game = this.parseGameRow($, cells, date);
            if (game) games.push(game);
          }
        }
      }

      return { date, gender, games, lastUpdated: new Date() };
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
      
  const awayTeam = cells.eq(0).text().trim();
  const awayScoreText = cells.eq(1).text().trim();
  const homeTeam = cells.eq(3).text().trim();
  const homeScoreText = cells.eq(4).text().trim();
  const timeText = cells.eq(6).text().trim();
      
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