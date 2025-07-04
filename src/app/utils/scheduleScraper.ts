import * as cheerio from 'cheerio';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

export interface ScheduleGame {
  id: string;
  date: Date;
  opponent: string;
  isHome: boolean;
  venue?: string;
  city?: string;
  state?: string;
  time?: string;
  conference?: boolean;
  exhibition?: boolean;
  status: 'scheduled' | 'completed' | 'postponed' | 'cancelled';
  result?: {
    score: string;
    won: boolean;
  };
  broadcastInfo?: {
    network?: string;
    watchLink?: string;
    statsLink?: string;
    ticketsLink?: string;
  };
}

export interface TeamSchedule {
  teamName: string;
  season: string;
  record: {
    overall: string;
    conference: string;
    home: string;
    away: string;
    neutral: string;
  };
  games: ScheduleGame[];
  lastUpdated: Date;
}

export class HockeyScheduleScraper {
  private static readonly USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  
  /**
   * Generic scraper for college hockey schedules
   * Now enhanced with team-aware format detection using the mapping file
   * Supports multiple athletics website formats and can adapt based on team names
   */
  async scrapeSchedule(url: string, teamName?: string): Promise<TeamSchedule | null> {
    try {
      let response;
      
      // Try multiple request strategies for sites that might block requests
      const strategies = [
        // Strategy 1: Full browser-like headers
        {
          headers: {
            'User-Agent': HockeyScheduleScraper.USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0',
          },
          timeout: 15000,
        },
        // Strategy 2: Minimal headers
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          timeout: 20000,
        },
        // Strategy 3: Different user agent
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
          },
          timeout: 25000,
        }
      ];
      
      let lastError;
      for (let i = 0; i < strategies.length; i++) {
        try {
          response = await axios.get(url, strategies[i]);
          break;
        } catch (error) {
          lastError = error;
          
          // Wait a bit before trying the next strategy
          if (i < strategies.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      if (!response) {
        throw lastError || new Error('All request strategies failed');
      }
      
      const $ = cheerio.load(response.data);
      
      // Enhanced format detection system using team names and URL patterns
      const formatResult = this.detectWebsiteFormat(url, teamName, $);
      
      // Try the detected format first
      let schedule = await this.tryFormatParser(formatResult.format, $, teamName);
      
      // If that fails and confidence is low, try fallback methods
      if (!schedule && formatResult.confidence < 0.8) {
        schedule = await this.tryAllParsers($, teamName);
      }
      
      return schedule;
      
    } catch {
      return null;
    }
  }

  private detectWebsiteFormat(url: string, teamName: string | undefined, $: cheerio.CheerioAPI): { format: string, confidence: number } {
    // URL-based detection
    if (url.includes('thesundevils.com')) return { format: 'arizona-state', confidence: 1.0 };
    if (url.includes('goterriers.com')) return { format: 'boston-university', confidence: 1.0 };
    if (url.includes('ferrisstatebulldogs.com')) return { format: 'ferris-state', confidence: 1.0 };
    if (url.includes('goairforcefalcons.com')) return { format: 'air-force', confidence: 1.0 };
    
    // Team name-based detection for known patterns
    const teamPatterns: { [key: string]: { format: string, confidence: number } } = {
      'Arizona State': { format: 'arizona-state', confidence: 0.9 },
      'Boston University': { format: 'sidearm-sports', confidence: 0.9 },
      'Boston College': { format: 'sidearm-sports', confidence: 0.8 },
      'Ferris State': { format: 'ferris-state', confidence: 0.9 },
      'UMass': { format: 'umass', confidence: 0.9 },
      'Air Force': { format: 'air-force', confidence: 0.9 },
      'Michigan': { format: 'big-ten', confidence: 0.7 },
      'Michigan State': { format: 'big-ten', confidence: 0.7 },
      'Ohio State': { format: 'big-ten', confidence: 0.7 },
      'Penn State': { format: 'big-ten', confidence: 0.7 },
      'Wisconsin': { format: 'big-ten', confidence: 0.7 },
      'Minnesota': { format: 'big-ten', confidence: 0.7 },
      'Notre Dame': { format: 'big-ten', confidence: 0.7 },
    };
    
    if (teamName && teamPatterns[teamName]) {
      return teamPatterns[teamName];
    }
    
    // Content-based detection
    const pageContent = $.text().toLowerCase();
    const titleContent = $('title').text().toLowerCase();
    
    if (pageContent.includes('sidearm') || pageContent.includes('schedule events')) {
      return { format: 'sidearm-sports', confidence: 0.6 };
    }
    
    if (titleContent.includes('sun devil')) {
      return { format: 'arizona-state', confidence: 0.8 };
    }
    
    // Default to generic with low confidence
    return { format: 'generic', confidence: 0.3 };
  }

  private async tryFormatParser(format: string, $: cheerio.CheerioAPI, teamName?: string): Promise<TeamSchedule | null> {
    try {
      let schedule: TeamSchedule | null = null;
      
      switch (format) {
        case 'arizona-state':
          schedule = this.scrapeArizonaStateSchedule($, teamName || 'Arizona State');
          break;
        case 'ferris-state':
          schedule = this.scrapeFerrisStateSchedule($, teamName || 'Ferris State');
          break;
        case 'umass':
          schedule = this.scrapeUMassSchedule($, teamName || 'UMass');
          break;
        case 'air-force':
          schedule = this.scrapeAirForceSchedule($, teamName || 'Air Force');
          break;
        case 'sidearm-sports':
        case 'boston-university':
          schedule = this.scrapeSidearmSchedule($, teamName || 'Unknown Team');
          break;
        case 'big-ten':
          schedule = this.scrapeBigTenSchedule($, teamName || 'Unknown Team');
          break;
        case 'generic':
        default:
          schedule = this.scrapeGenericSchedule($, teamName);
          break;
      }
      
      // Validate that we got a current season schedule with actual games
      if (schedule && this.isValidCurrentSeason(schedule.season) && schedule.games.length > 0) {
        return schedule;
      } else if (schedule && this.isValidCurrentSeason(schedule.season) && schedule.games.length === 0) {
        return null;
      } else if (schedule) {
        return null;
      }
      
      return null;
    } catch {
      return null;
    }
  }

  private isValidCurrentSeason(season: string): boolean {
    // We specifically want 2025-26 season schedules
    const targetSeason = '2025-26';
    
    // Reject offseason marker
    if (season === 'offseason') {
      return false;
    }
    
    if (season === targetSeason) {
      return true;
    }
    
    // Check if it's a valid hockey season format (YYYY-YY where YY = YY+1)
    const seasonMatch = season.match(/^(\d{4})-(\d{2})$/);
    if (!seasonMatch) {
      return false;
    }
    
    const [, startYear, endYearTwoDigit] = seasonMatch;
    const startYearNum = parseInt(startYear);
    const endYearTwoDigit_Num = parseInt(endYearTwoDigit);
    
    // Validate that it's a proper hockey season (start year + 1 = end year)
    const expectedEndYear = (startYearNum + 1) % 100;
    if (endYearTwoDigit_Num !== expectedEndYear) {
      return false;
    }
    
    // Accept current season (2025-26) and future seasons
    if (startYearNum >= 2025) {
      return true;
    }
    
    // Reject old seasons (2024-25 and earlier)
    return false;
  }

  private async tryAllParsers($: cheerio.CheerioAPI, teamName?: string): Promise<TeamSchedule | null> {
    const parsers = [
      { name: 'sidearm-sports', func: () => this.scrapeSidearmSchedule($, teamName || 'Unknown Team') },
      { name: 'umass', func: () => this.scrapeUMassSchedule($, teamName || 'Unknown Team') },
      { name: 'ferris-state', func: () => this.scrapeFerrisStateSchedule($, teamName || 'Unknown Team') },
      { name: 'arizona-state', func: () => this.scrapeArizonaStateSchedule($, teamName || 'Unknown Team') },
      { name: 'big-ten', func: () => this.scrapeBigTenSchedule($, teamName || 'Unknown Team') },
      { name: 'generic', func: () => this.scrapeGenericSchedule($, teamName) },
    ];

    for (const parser of parsers) {
      try {
        const result = parser.func();
        
        if (result && result.games && result.games.length > 0 && this.isValidCurrentSeason(result.season)) {
          return result;
        } else if (result && result.season === 'offseason') {
          // Continue trying other parsers in case one can find current data
        } else if (result && this.isValidCurrentSeason(result.season) && result.games.length === 0) {
          // Continue trying other parsers
        } else if (result && !this.isValidCurrentSeason(result.season)) {
          // Continue trying other parsers
        }
      } catch {
        // Continue trying other parsers
      }
    }

    // Don't return empty schedules during offseason - better to return null
    // so the API can provide proper offseason messaging
    return null;
  }

  private scrapeSidearmSchedule($: cheerio.CheerioAPI, teamName: string): TeamSchedule {
    const games: ScheduleGame[] = [];
    const season = this.extractSeason($);
    
    // If no valid season found or old season detected, return null to indicate offseason
    if (!season) {
      return {
        teamName,
        season: 'offseason',
        record: this.extractRecord($),
        games: [],
        lastUpdated: new Date(),
      };
    }
    
    const record = this.extractRecord($);

    // Many college athletics sites use Sidearm Sports platform with similar HTML structure
    // Let's try multiple approaches to catch all game formats
    const textContent = $.text();
    
    // Use text content for pattern matching but normalize whitespace first
    // The text content has lots of line breaks and extra spaces, so we need to clean it
    const normalizedText = textContent.replace(/\s+/g, ' ').trim();
    
    // Split text by date patterns to avoid cross-contamination
    const datePattern = /([A-Z][a-z]{2}\s+\d{1,2}\s+\([A-Z][a-z]{2}\))/g;
    const textSections = normalizedText.split(datePattern);
    
    let gameIndex = 0;
    
    // Check if this is Minnesota (which has a different format)
    if (teamName.toLowerCase().includes('minnesota') && !teamName.includes('State') && !teamName.includes('Duluth')) {
      
      // Minnesota has format: vs[Opponent]3M Arena at Mariucci[Date] or at[Opponent][Location][Date]
      // Also handle neutral site games and exhibitions
      const gamePatterns = normalizedText.match(/((vs|at)[A-Za-z\s&().''-]+?(?:3M Arena at Mariucci|[A-Z][a-z]+,\s*[A-Z]{2})[A-Z][a-z]{2}\s+\d{1,2}\s+\([A-Z][a-z]{2}\))/g);
      
      // Also look for neutral site games and exhibitions that might not follow the standard pattern
      // Pattern like: "TBDDenverDenver, CO (Ball Arena)Nov 28 (Fri) TBD"
      const neutralSitePatterns = normalizedText.match(/TBD([A-Z][A-Za-z\s&().''-]+?)([A-Z][a-z]+,\s*[A-Z]{2}.*?)([A-Z][a-z]{2}\s+\d{1,2}\s+\([A-Z][a-z]{2}\))/g);
      
      // Pattern for exhibitions: "TBDatBemidji StateBemidji, MN(Exhibition)Jan 2 (Fri) TBD"
      const exhibitionPatterns = normalizedText.match(/TBD(at|vs)([A-Z][A-Za-z\s&().''-]+?)([A-Z][a-z]+,\s*[A-Z]{2}[^A-Z]*?\(Exhibition\))([A-Z][a-z]{2}\s+\d{1,2}\s+\([A-Z][a-z]{2}\))/g);
      
      // Combine all patterns
      const allPatterns = [
        ...(gamePatterns || []),
        ...(neutralSitePatterns || []),
        ...(exhibitionPatterns || [])
      ];
      
      if (allPatterns.length > 0) {
        
        allPatterns.forEach((gamePattern) => {
          // Extract components from each game pattern
          let homeAwayMatch, opponent, datePart, isExhibition = false, isNeutralSite = false;
          
          if (gamePattern.includes('3M Arena at Mariucci')) {
            // Home games: vs[Opponent]3M Arena at Mariucci[Date]
            const homeMatch = gamePattern.match(/(vs)([^3]+?)3M Arena at Mariucci([A-Z][a-z]{2}\s+\d{1,2}\s+\([A-Z][a-z]{2}\))/);
            if (homeMatch) {
              homeAwayMatch = homeMatch[1];
              opponent = homeMatch[2].trim();
              datePart = homeMatch[3];
            }
          } else if (gamePattern.includes('(Exhibition)')) {
            // Exhibition games: TBDat[Opponent][Location](Exhibition)[Date]
            const exhibitionMatch = gamePattern.match(/TBD(at|vs)([A-Z][A-Za-z\s&().''-]+?)([A-Z][a-z]+,\s*[A-Z]{2}[^A-Z]*?\(Exhibition\))([A-Z][a-z]{2}\s+\d{1,2}\s+\([A-Z][a-z]{2}\))/);
            if (exhibitionMatch) {
              homeAwayMatch = exhibitionMatch[1];
              opponent = exhibitionMatch[2].trim();
              datePart = exhibitionMatch[4];
              isExhibition = true;
            }
          } else if (gamePattern.startsWith('TBD') && !gamePattern.includes('at') && !gamePattern.includes('vs')) {
            // Neutral site games: TBD[Opponent][Location][Date]
            const neutralMatch = gamePattern.match(/TBD([A-Z][A-Za-z\s&().''-]+?)([A-Z][a-z]+,\s*[A-Z]{2}.*?)([A-Z][a-z]{2}\s+\d{1,2}\s+\([A-Z][a-z]{2}\))/);
            if (neutralMatch) {
              homeAwayMatch = 'vs'; // Treat neutral as home for simplicity
              opponent = neutralMatch[1].trim();
              datePart = neutralMatch[3];
              isNeutralSite = true;
            }
          } else {
            // Away games: at[Opponent][Location][Date]
            const awayMatch = gamePattern.match(/(at)([A-Za-z\s&().''-]+?)([A-Z][a-z]+,\s*[A-Z]{2})([A-Z][a-z]{2}\s+\d{1,2}\s+\([A-Z][a-z]{2}\))/);
            if (awayMatch) {
              homeAwayMatch = awayMatch[1];
              opponent = awayMatch[2].trim();
              
              // Clean up opponent name - remove location fragments that got concatenated
              // Handle specific cases like "North DakotaGrand" -> "North Dakota"
              opponent = opponent.replace(/Grand\s*$/, ''); // Remove trailing "Grand" 
              opponent = opponent.replace(/Forks\s*$/, ''); // Remove trailing "Forks"
              opponent = opponent.replace(/Arena.*$/, ''); // Remove "Arena" and anything after
              opponent = opponent.replace(/Center.*$/, ''); // Remove "Center" and anything after
              opponent = opponent.replace(/Rink.*$/, ''); // Remove "Rink" and anything after
              opponent = opponent.replace(/Ice.*$/, ''); // Remove "Ice" and anything after
              opponent = opponent.replace(/Stadium.*$/, ''); // Remove "Stadium" and anything after
              opponent = opponent.replace(/Hall.*$/, ''); // Remove "Hall" and anything after
              
              // Also handle cases where location words got concatenated without spaces
              opponent = opponent.replace(/Grand$/, ''); // Remove "Grand" at end (no space)
              opponent = opponent.replace(/Forks$/, ''); // Remove "Forks" at end (no space)
              
              opponent = opponent.trim();
              
              datePart = awayMatch[4]; // Skip the location part (awayMatch[3])
            }
          }
          
          if (homeAwayMatch && opponent && datePart && opponent.length > 1) {
            const syntheticMatch = [
              `${datePart} ${homeAwayMatch} ${opponent}`,
              datePart,
              homeAwayMatch,
              opponent
            ];
            
            const game = this.parseGameFromMatch(syntheticMatch as RegExpMatchArray, gameIndex, teamName);
            if (game) {
              // Mark exhibitions and neutral site games
              if (isExhibition) {
                game.exhibition = true;
              }
              if (isNeutralSite) {
                game.isHome = false; // Neutral site games are typically considered away
                game.venue = 'Neutral Site';
              }
              
              games.push(game);
              gameIndex++;
            }
          }
        });
      } else {
        // Fallback: try simpler pattern matching
        const vsMatches = normalizedText.match(/(vs|at)([^3]+?)3M Arena/g);
        if (vsMatches) {
          // Would need date matching as well - but the complete pattern above should work
        }
      }
    } else {
      // Use the original split-by-date approach for other teams
      // Process each section that starts with a date
      for (let i = 1; i < textSections.length; i += 2) {
        const datePart = textSections[i]; // The date (captured group)
        const contentPart = textSections[i + 1]; // The content after the date
        
        if (!datePart || !contentPart) continue;
        
        // Look for vs/at pattern in this specific section - handle ESPN+HEA * and other prefixes
        let vsAtMatch = contentPart.match(/\*\s+(vs|at)\s+(.+?)(?=\s*(?:ESPN|Watch|Listen|Tickets|Game|Exhibition|\bAHA\s*\*|\bHistory\s+vs\b|\bWinter\s+Carnival\b|\b3M\s+Arena\b|\bConte\s+Forum\b|\bAgganis\s+Arena\b|\b[A-Z][a-z]+,\s*[A-Z]{2}\b|\bArena\b|\bCenter\b|\bRink\b|\bIce\s+Arena|$))/i);
        
        // If no * pattern found, try the regular pattern
        if (!vsAtMatch) {
          vsAtMatch = contentPart.match(/\s+(vs|at)\s+(.+?)(?=\s*(?:ESPN|Watch|Listen|Tickets|Game|Exhibition|\bAHA\s*\*|\bHistory\s+vs\b|\bWinter\s+Carnival\b|\b3M\s+Arena\b|\bConte\s+Forum\b|\bAgganis\s+Arena\b|\b[A-Z][a-z]+,\s*[A-Z]{2}\b|\bArena\b|\bCenter\b|\bRink\b|\bIce\s+Arena|$))/i);
        }
        
        if (vsAtMatch) {
          // Create a synthetic match array for our existing parser
          const syntheticMatch = [
            `${datePart} ${vsAtMatch[0]}`, // Full match
            datePart,                      // Date part
            vsAtMatch[1],                  // vs/at
            vsAtMatch[2]                   // Opponent
          ];
          
          const game = this.parseGameFromMatch(syntheticMatch as RegExpMatchArray, gameIndex, teamName);
          if (game) {
            games.push(game);
            gameIndex++;
          }
        }
      }
    }

    // Remove any remaining duplicates
    const uniqueGames = this.removeDuplicateGames(games);

    return {
      teamName,
      season,
      record,
      games: uniqueGames.sort((a: ScheduleGame, b: ScheduleGame) => a.date.getTime() - b.date.getTime()),
      lastUpdated: new Date(),
    };
  }

  private scrapeArizonaStateSchedule($: cheerio.CheerioAPI, teamName: string): TeamSchedule {
    const games: ScheduleGame[] = [];
    const season = this.extractSeason($);
    
    // If no valid season found or old season detected, return null to indicate offseason
    if (!season) {
      return {
        teamName,
        season: 'offseason',
        record: this.extractRecord($),
        games: [],
        lastUpdated: new Date(),
      };
    }
    
    const record = this.extractRecord($);

    // Arizona State uses a different format - try to find schedule section specifically
    const textContent = $.text();
    
    // Look for the schedule events section specifically
    const scheduleEventsIndex = textContent.indexOf('Schedule Events');
    let relevantText = textContent;
    
    if (scheduleEventsIndex !== -1) {
      // Extract just the schedule events section
      relevantText = textContent.substring(scheduleEventsIndex, scheduleEventsIndex + 3000);
    }
    
    // Try multiple patterns to catch Arizona State's format
    const patterns = [
      // Pattern 1: "Oct3Oct3(Fri)7:00 p.m. (MST)Mullett Arenavs. Penn State"
      /([A-Z][a-z]{2})(\d{1,2})[A-Z][a-z]{2}\d{1,2}\([A-Z][a-z]{2}\)[^vs.at]+?(vs\.|at)\s+(.+?)(?=Event details|Show Event Info|$)/g,
      // Pattern 2: Looking for just the basic format after "vs." or "at"
      /(vs\.|at)\s+(.+?)(?=Event details|Show Event Info|Season opener|$)/g,
      // Pattern 3: More specific to the actual content we see
      /([A-Z][a-z]{2})(\d{1,2})[^vs.at]*?(vs\.|at)\s+(.+?)(?=Season|Event|Show|$)/g
    ];
    
    let gameIndex = 0;
    
    // For Arizona State, let's also try a simpler approach - just look for "vs." and "at" patterns
    const vsAtMatches = relevantText.match(/(vs\.|at)\s+(.+?)(?=Event details|Show Event Info|Season opener|\s+[A-Z][a-z]{2}\d|\s*$)/g);
    
    if (vsAtMatches) {
      // Extract dates separately
      const dateMatches = relevantText.match(/([A-Z][a-z]{2})(\d{1,2})\([A-Z][a-z]{2}\)/g);
      
      if (dateMatches && vsAtMatches.length <= dateMatches.length) {
        for (let i = 0; i < Math.min(vsAtMatches.length, dateMatches.length); i++) {
          try {
            const vsAtMatch = vsAtMatches[i];
            const dateMatch = dateMatches[i];
            
            // Parse the vs/at match
            const homeAwayMatch = vsAtMatch.match(/(vs\.|at)\s+([A-Za-z\s&().'-]+?)(?=Event|Show|Season|$)/);
            if (!homeAwayMatch) continue;
            
            const [, homeAway, opponent] = homeAwayMatch;
            
            // Parse the date match
            const dateParseMatch = dateMatch.match(/([A-Z][a-z]{2})(\d{1,2})/);
            if (!dateParseMatch) continue;
            
            const [, month, day] = dateParseMatch;
            
            // Clean up opponent name
            const cleanOpponent = opponent.trim()
              .replace(/Event details.*$/, '')
              .replace(/Show Event Info.*$/, '')
              .replace(/Season opener.*$/, '')
              .replace(/NCHC$/, '') // Remove conference abbreviation
              .replace(/HEA$/, '') // Remove Hockey East abbreviation
              .replace(/ECAC$/, '') // Remove ECAC abbreviation
              .replace(/CCHA$/, '') // Remove CCHA abbreviation
              .replace(/Big Ten$/, '') // Remove Big Ten abbreviation
              .replace(/Atlantic Hockey$/, '') // Remove Atlantic Hockey abbreviation
              .replace(/\s+/g, ' ')
              .trim();
            
            // Skip if opponent is too short
            if (!cleanOpponent || cleanOpponent.length < 2) {
              continue;
            }
            
            // Check for duplicates more carefully
            const isDuplicate = games.some(game => 
              game.opponent === cleanOpponent && 
              game.date.getMonth() === this.getMonthNumber(month) &&
              game.date.getDate() === parseInt(day) &&
              game.isHome === homeAway.includes('vs')
            );
            
            if (isDuplicate) {
              continue;
            }
            
            // Parse date
            const currentYear = new Date().getFullYear();
            const gameYear = ['Jan', 'Feb', 'Mar', 'Apr'].includes(month) ? currentYear + 1 : currentYear;
            const dateString = `${month} ${day}, ${gameYear}`;
            const gameDate = new Date(dateString);
            
            if (isNaN(gameDate.getTime())) {
              continue;
            }
            
            const game: ScheduleGame = {
              id: `game-${gameIndex}`,
              date: gameDate,
              opponent: cleanOpponent,
              isHome: homeAway.includes('vs'),
              conference: this.isConferenceGame(teamName, cleanOpponent),
              exhibition: false,
              status: 'scheduled' as const,
              broadcastInfo: {}
            };
            
            games.push(game);
            gameIndex++;
            
          } catch {
            // Continue processing other games
          }
        }
      }
    }
    
    // If the simple approach didn't work, try the regex patterns
    if (games.length === 0) {
      for (const pattern of patterns) {
        let match;
        pattern.lastIndex = 0; // Reset pattern
        
        while ((match = pattern.exec(relevantText)) !== null) {
          try {
            let month, day, homeAway, opponent;
            
            if (match.length === 3) {
              // Pattern 2: just vs/at match
              [, homeAway, opponent] = match;
              // We'd need to get the date from somewhere else
              continue;
            } else {
              // Pattern 1 or 3
              [, month, day, homeAway, opponent] = match;
            }
            
            // Clean up opponent name
            const cleanOpponent = opponent.trim()
              .replace(/Event details.*$/, '')
              .replace(/Show Event Info.*$/, '')
              .replace(/Season opener.*$/, '')
              .replace(/\s+/g, ' ')
              .replace(/[^\w\s&().''-]/g, '')
              .trim();
            
            if (!cleanOpponent || cleanOpponent.length < 2 || /^\d+$/.test(cleanOpponent)) {
              continue;
            }
            
            // Skip duplicates
            const isDuplicate = games.some(game => 
              game.opponent === cleanOpponent && 
              game.date.getMonth() === this.getMonthNumber(month) &&
              game.date.getDate() === parseInt(day)
            );
            
            if (isDuplicate) continue;
            
            // Parse date
            const currentYear = new Date().getFullYear();
            const gameYear = ['Jan', 'Feb', 'Mar', 'Apr'].includes(month) ? currentYear + 1 : currentYear;
            const dateString = `${month} ${day}, ${gameYear}`;
            const gameDate = new Date(dateString);
            
            if (isNaN(gameDate.getTime())) {
              continue;
            }
            
            const game: ScheduleGame = {
              id: `game-${gameIndex}`,
              date: gameDate,
              opponent: cleanOpponent,
              isHome: homeAway.includes('vs'),
              conference: this.isConferenceGame(teamName, cleanOpponent),
              exhibition: false,
              status: 'scheduled' as const,
              broadcastInfo: {}
            };
            
            games.push(game);
            gameIndex++;
            
          } catch {
            // Continue processing other matches
          }
        }
        
        // If we found games with this pattern, stop trying other patterns
        if (games.length > 0) break;
      }
    }
    
    return {
      teamName,
      season,
      record,
      games: games.sort((a, b) => a.date.getTime() - b.date.getTime()),
      lastUpdated: new Date(),
    };
  }

  private scrapeFerrisStateSchedule($: cheerio.CheerioAPI, teamName: string): TeamSchedule {
    const games: ScheduleGame[] = [];
    const season = this.extractSeason($);
    
    // If no valid season found or old season detected, return null to indicate offseason
    if (!season) {
      return {
        teamName,
        season: 'offseason',
        record: this.extractRecord($),
        games: [],
        lastUpdated: new Date(),
      };
    }
    
    const record = this.extractRecord($);

    // Parse Ferris State's specific schedule format
    // The structure has dates and opponents in separate but related elements
    
    // Find all date elements first
    const datePattern = /^([A-Z][a-z]{2})\s+(\d{1,2})\s+\(([A-Z][a-z]{2})\)$/;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dateElements: Array<{element: any, date: string, month: string, day: string, dow: string}> = [];
    
    $('*').each((i, elem) => {
      const text = $(elem).text().trim();
      const match = text.match(datePattern);
      if (match && text.length < 30) { // Ensure it's just a date, not mixed content
        dateElements.push({
          element: elem,
          date: text,
          month: match[1],
          day: match[2],
          dow: match[3]
        });
      }
    });
    
    // Now find all AT/VS elements and try to pair them with dates
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opponentElements: Array<{element: any, text: string, homeAway: string, opponent: string}> = [];
    
    $('*').each((i, elem) => {
      const text = $(elem).text().trim();
      // Match AT or VS patterns with flexible whitespace
      const match = text.match(/^(AT|VS)[\s\t\n]+(.+?)(?:[\s\t\n]*[#*%].*)?$/);
      if (match) {
        const homeAway = match[1];
        let opponent = match[2].trim();
        
        // Clean up opponent name - remove extra whitespace and tabs
        opponent = opponent.replace(/[\s\t\n]+/g, ' ').trim();
        
        // Skip tournament entries that are too generic
        if (opponent.length > 2 && !opponent.match(/^(TBA|TBD)$/)) {
          opponentElements.push({
            element: elem,
            text: text,
            homeAway: homeAway,
            opponent: opponent
          });
        }
      }
    });
    
    // Try to pair dates with opponents based on document order and proximity
    let gameIndex = 0;
    const usedOpponents = new Set<number>();
    
    for (const dateEl of dateElements) {
      let bestOpponent = null;
      let bestDistance = Infinity;
      let bestOpponentIndex = -1;
      
      // Find the closest unused opponent element after this date
      for (let i = 0; i < opponentElements.length; i++) {
        if (usedOpponents.has(i)) continue;
        
        const opponentEl = opponentElements[i];
        
        // Calculate DOM distance (rough approximation)
        const dateIndex = $(dateEl.element).index();
        const opponentIndex = $(opponentEl.element).index();
        const distance = Math.abs(opponentIndex - dateIndex);
        
        // Prefer opponents that come after the date
        if (opponentIndex > dateIndex && distance < bestDistance) {
          bestDistance = distance;
          bestOpponent = opponentEl;
          bestOpponentIndex = i;
        }
      }
      
      if (bestOpponent && bestOpponentIndex !== -1) {
        try {
          // Parse the date
          const month = this.getMonthNumber(dateEl.month);
          const day = parseInt(dateEl.day);
          const year = month >= 8 ? 2025 : 2026; // Hockey season spans two calendar years
          const gameDate = new Date(year, month, day);
          
          if (!isNaN(gameDate.getTime())) {
            const game: ScheduleGame = {
              id: `ferris-${gameIndex}`,
              date: gameDate,
              opponent: bestOpponent.opponent,
              isHome: bestOpponent.homeAway === 'VS',
              conference: this.isConferenceGame(teamName, bestOpponent.opponent) || 
                         bestOpponent.text.includes('*') || 
                         bestOpponent.text.includes('CCHA'),
              exhibition: bestOpponent.text.includes('#'),
              status: 'scheduled' as const,
              broadcastInfo: {}
            };
            
            games.push(game);
            usedOpponents.add(bestOpponentIndex);
            gameIndex++;
            
          }
        } catch {
          // Continue processing other games
        }
      }
    }

    return {
      teamName,
      season,
      record,
      games: games.sort((a, b) => a.date.getTime() - b.date.getTime()),
      lastUpdated: new Date(),
    };
  }

  private scrapeAirForceSchedule($: cheerio.CheerioAPI, teamName: string): TeamSchedule {
    const games: ScheduleGame[] = [];
    const season = this.extractSeason($);
    
    // If no valid season found or old season detected, return null to indicate offseason
    if (!season) {
      return {
        teamName,
        season: 'offseason',
        record: this.extractRecord($),
        games: [],
        lastUpdated: new Date(),
      };
    }
    
    const record = this.extractRecord($);

    // Air Force uses .s-game-card elements with a specific format
    // Pattern: "atUniversity of Nebraska at OmahaOmaha, NEOct 3 (Fri) TBA"
    const gameCards = $('.s-game-card');
    
    gameCards.each((index, element) => {
      try {
        const $element = $(element);
        const fullText = $element.text().trim();
        
        // Air Force format has date at the end: "...Oct 3 (Fri) TBA"
        // Look for the date pattern at the end: Month Day (DayOfWeek) [Time]
        const dateMatch = fullText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s*\(([A-Z][a-z]{2})\)\s*(.*)$/i);
        
        if (!dateMatch) {
          return;
        }
        
        const [, month, day, , timeInfo] = dateMatch;
        
        // Extract the text before the date to get opponent info
        const beforeDate = fullText.substring(0, fullText.lastIndexOf(month)).trim();
        
        // Look for "at" or "vs" pattern to determine home/away and opponent
        let homeAway = '';
        let opponent = '';
        const venue = '';
        let city = '';
        let state = '';
        
        if (beforeDate.startsWith('at')) {
          homeAway = 'at';
          const afterAt = beforeDate.substring(2).trim();
          
          // The format appears to be: "atTeamNameCityName, StateDate"
          // We need to find where the team name ends and the city begins
          // Look for the last occurrence of a pattern like "City, ST"
          const cityStatePattern = /(.+?)([A-Z][a-z\s]*(?:\s+[A-Z][a-z]*)*),\s*([A-Z]{2})$/;
          const match = afterAt.match(cityStatePattern);
          
          if (match) {
            const [, teamAndCity, cityPart, statePart] = match;
            state = statePart;
            city = cityPart.trim();
            
            // Handle special cases where city name might appear in team name
            let teamName = teamAndCity;
            
            // For teams like "University of Nebraska at Omaha" + "Omaha, NE"
            // The team name contains the city name, so we need to be more careful
            
            // If the city appears multiple times, we want to keep it in the team name
            // but remove only the last occurrence that's part of the location
            
            // Simple heuristic: if team name ends with city name and there's no space,
            // it's likely concatenated (like "TeamNameCityName")
            if (teamName.endsWith(city) && !teamName.endsWith(' ' + city)) {
              // This suggests concatenation like "RITRochester" -> "RIT"
              teamName = teamName.substring(0, teamName.length - city.length).trim();
            }
            // If it ends with " " + city, it might be part of the team name, so keep it
            
            opponent = teamName;
          } else {
            // Fallback - just use everything as opponent name
            opponent = afterAt;
          }
        } else if (beforeDate.startsWith('vs')) {
          homeAway = 'vs';
          const afterVs = beforeDate.substring(2).trim();
          
          // For home games, the pattern might be "vsOpponentUSAFA, CO"
          // Remove USAFA and any location info since it's a home game
          opponent = afterVs
            .replace(/USAFA,?\s*[A-Z]{2}$/i, '') // Remove "USAFA, CO" or "USAFA"
            .replace(/,\s*[A-Z]{2}$/, '') // Remove any remaining state
            .trim();
        } else {
          return;
        }
        
        // Clean up opponent name further
        opponent = opponent
          .replace(/,\s*[A-Z]{2}$/, '') // Remove trailing state
          .replace(/USAFA$/, '') // Remove trailing USAFA
          .replace(/USAFA,?\s*[A-Z]{2}$/, '') // Remove USAFA with state
          .trim();
        
        if (!opponent || opponent.length < 2) {
          return;
        }
        
        // Parse date
        const currentYear = new Date().getFullYear();
        const gameYear = ['Jan', 'Feb', 'Mar', 'Apr'].includes(month) ? currentYear + 1 : currentYear;
        const dateString = `${month} ${day}, ${gameYear}`;
        const gameDate = new Date(dateString);
        
        if (isNaN(gameDate.getTime())) {
          return;
        }
        
        // Check for duplicates
        const isDuplicate = games.some(game => 
          game.opponent === opponent && 
          game.date.getTime() === gameDate.getTime() &&
          game.isHome === (homeAway === 'vs')
        );
        
        if (isDuplicate) {
          return;
        }
        
        // Extract time if available and clean it up
        let time = undefined;
        if (timeInfo && timeInfo !== 'TBA' && timeInfo.trim() !== '') {
          // Clean up time info - remove "AHA" or other conference abbreviations
          const cleanTime = timeInfo.replace(/AHA$/i, '').replace(/TBA$/i, '').trim();
          if (cleanTime && cleanTime !== 'TBA' && cleanTime !== '') {
            time = cleanTime;
          }
        }
        
        const game: ScheduleGame = {
          id: `game-${index}`,
          date: gameDate,
          opponent: opponent,
          isHome: homeAway === 'vs',
          venue: venue || undefined,
          city: city || undefined,
          state: state || undefined,
          time: time,
          conference: this.isConferenceGame(teamName, opponent),
          exhibition: false,
          status: 'scheduled' as const,
          broadcastInfo: {}
        };
        
        games.push(game);
        
      } catch {
        // Continue processing other games
      }
    });
    
    // Sort games by date
    games.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    return {
      teamName,
      season,
      record,
      games,
      lastUpdated: new Date(),
    };
  }

  private scrapeUMassSchedule($: cheerio.CheerioAPI, teamName: string): TeamSchedule {
    const games: ScheduleGame[] = [];
    
    // For UMass, be more aggressive about finding the season since we know they have 2025-26
    let season = this.extractSeason($);
    
    // If extractSeason fails, manually look for 2025-26 in UMass case
    if (!season) {
      const textContent = $.text();
      const title = $('title').text();
      
      // Check if we can find 2025-26 anywhere in the page
      if (textContent.includes('2025-26') || title.includes('2025-26')) {
        season = '2025-26';
      } else {
        return {
          teamName,
          season: 'offseason',
          record: this.extractRecord($),
          games: [],
          lastUpdated: new Date(),
        };
      }
    }
    
    const record = this.extractRecord($);

    // UMass uses a specific format where games are in the full text content
    const textContent = $.text();
    
    // Find the actual schedule content section (not just the title)
    // Look for a pattern that indicates actual game data
    let relevantText = textContent;
    const gameContentIndex = textContent.indexOf('vsNorthern Michigan');
    if (gameContentIndex !== -1) {
      // Extract from the first game onwards, with plenty of context
      relevantText = textContent.substring(gameContentIndex - 100, gameContentIndex + 10000);
    } else {
      // Fallback: look for any "vs" pattern followed by a team name
      const fallbackIndex = textContent.search(/vs[A-Z][a-z]/);
      if (fallbackIndex !== -1) {
        relevantText = textContent.substring(fallbackIndex - 100, fallbackIndex + 10000);
      }
    }
    
    let gameIndex = 0;
    
    // UMass has very specific patterns like:
    // "vsNorthern MichiganMullins CenterAmherst, Mass.Oct 4 (Sat)HOME OPENER"
    // "atStonehillNorth Easton, Mass.Oct 10 (Fri)"
    // "OmahaOmaha, Neb.Oct 24 (Fri)"
    
    // Pattern 1: vs games with venue - "vs[Team]Mullins Center...Oct 4 (Sat)"
    const homeGamePattern = /vs([A-Z][A-Za-z\s&().''-]+?)Mullins Center.*?([A-Z][a-z]{2})\s+(\d{1,2})\s+\(([A-Z][a-z]{2})\)/g;
    
    let match;
    while ((match = homeGamePattern.exec(relevantText)) !== null) {
      try {
        const [, opponent, month, day] = match;
        
        // Clean up opponent name
        const cleanOpponent = opponent.trim()
          .replace(/\s+$/, '');
        
        if (cleanOpponent.length < 2) continue;
        
        // Parse date
        const monthNum = this.getMonthNumber(month);
        const dayNum = parseInt(day);
        const year = monthNum >= 8 ? 2025 : 2026;
        const gameDate = new Date(year, monthNum, dayNum);
        
        if (!isNaN(gameDate.getTime())) {
          // Check for duplicates
          const isDuplicate = games.some(game => 
            game.opponent === cleanOpponent && 
            game.date.getTime() === gameDate.getTime()
          );
          
          if (!isDuplicate) {
            const game: ScheduleGame = {
              id: `umass-${gameIndex}`,
              date: gameDate,
              opponent: cleanOpponent,
              isHome: true,
              conference: this.isConferenceGame(teamName, cleanOpponent),
              exhibition: false,
              status: 'scheduled' as const,
              broadcastInfo: {}
            };
            
            games.push(game);
            gameIndex++;
          }
        }
      } catch {
        continue;
      }
    }
    
    // Pattern 2: at games - search for "at" followed by team names directly
    // Examples: "atStonehillNorth Easton, Mass.Oct 10 (Fri)"
    //           "atBoston CollegeChestnut Hill, Mass.Nov 14 (Fri)"
    const awayGamePatterns = [
      /atStonehill.*?([A-Z][a-z]{2})\s+(\d{1,2})\s+\(([A-Z][a-z]{2})\)/g,
      /atBoston College.*?([A-Z][a-z]{2})\s+(\d{1,2})\s+\(([A-Z][a-z]{2})\)/g,
      /atProvidence.*?([A-Z][a-z]{2})\s+(\d{1,2})\s+\(([A-Z][a-z]{2})\)/g,
      /atArmy.*?([A-Z][a-z]{2})\s+(\d{1,2})\s+\(([A-Z][a-z]{2})\)/g,
      /atUMass Lowell.*?([A-Z][a-z]{2})\s+(\d{1,2})\s+\(([A-Z][a-z]{2})\)/g,
      /atNew Hampshire.*?([A-Z][a-z]{2})\s+(\d{1,2})\s+\(([A-Z][a-z]{2})\)/g,
      /atUConn.*?([A-Z][a-z]{2})\s+(\d{1,2})\s+\(([A-Z][a-z]{2})\)/g,
      /atVermont.*?([A-Z][a-z]{2})\s+(\d{1,2})\s+\(([A-Z][a-z]{2})\)/g,
    ];
    
    const awayOpponents = [
      'Stonehill', 'Boston College', 'Providence', 'Army', 'UMass Lowell', 
      'New Hampshire', 'UConn', 'Vermont'
    ];
    
    // Try specific patterns
    for (let i = 0; i < awayGamePatterns.length; i++) {
      const pattern = awayGamePatterns[i];
      const opponent = awayOpponents[i];
      
      while ((match = pattern.exec(relevantText)) !== null) {
        try {
          const [, month, day] = match;
          
          // Parse date
          const monthNum = this.getMonthNumber(month);
          const dayNum = parseInt(day);
          const year = monthNum >= 8 ? 2025 : 2026;
          const gameDate = new Date(year, monthNum, dayNum);
          
          if (!isNaN(gameDate.getTime())) {
            // Check for duplicates
            const isDuplicate = games.some(game => 
              game.opponent === opponent && 
              game.date.getTime() === gameDate.getTime()
            );
            
            if (!isDuplicate) {
              const game: ScheduleGame = {
                id: `umass-${gameIndex}`,
                date: gameDate,
                opponent: opponent,
                isHome: false,
                conference: this.isConferenceGame(teamName, opponent),
                exhibition: false,
                status: 'scheduled' as const,
                broadcastInfo: {}
              };
              
              games.push(game);
              gameIndex++;
            }
          }
        } catch {
          continue;
        }
      }
    }
    
    // Pattern 3: neutral site or special format - "[Team][Location]Oct 24 (Fri)" (no "at" or "vs")
    // Handle Omaha specifically since it appears to be neutral site games
    const omahaPattern = /Omaha.*?([A-Z][a-z]{2})\s+(\d{1,2})\s+\(([A-Z][a-z]{2})\)/g;
    
    while ((match = omahaPattern.exec(relevantText)) !== null) {
      try {
        const [, month, day] = match;
        
        // Parse date
        const monthNum = this.getMonthNumber(month);
        const dayNum = parseInt(day);
        const year = monthNum >= 8 ? 2025 : 2026;
        const gameDate = new Date(year, monthNum, dayNum);
        
        if (!isNaN(gameDate.getTime())) {
          // Check for duplicates
          const isDuplicate = games.some(game => 
            game.opponent === 'Omaha' && 
            game.date.getTime() === gameDate.getTime()
          );
          
          if (!isDuplicate) {
            const game: ScheduleGame = {
              id: `umass-${gameIndex}`,
              date: gameDate,
              opponent: 'Omaha',
              isHome: false, // Away or neutral
              conference: this.isConferenceGame(teamName, 'Omaha'),
              exhibition: false,
              status: 'scheduled' as const,
              broadcastInfo: {}
            };
            
            games.push(game);
            gameIndex++;
          }
        }
      } catch {
        continue;
      }
    }

    return {
      teamName,
      season,
      record,
      games: games.sort((a, b) => a.date.getTime() - b.date.getTime()),
      lastUpdated: new Date(),
    };
  }

  private scrapeBigTenSchedule($: cheerio.CheerioAPI, teamName: string): TeamSchedule {
    const games: ScheduleGame[] = [];
    const season = this.extractSeason($);
    
    // If no valid season found or old season detected, return null to indicate offseason
    if (!season) {
      return {
        teamName,
        season: 'offseason',
        record: this.extractRecord($),
        games: [],
        lastUpdated: new Date(),
      };
    }
    
    const record = this.extractRecord($);

    // Big Ten schools often use similar formats - try multiple approaches
    const textContent = $.text();
    
    // Try to find schedule section
    const scheduleKeywords = ['schedule', 'games', 'opponents'];
    let relevantText = textContent;
    
    for (const keyword of scheduleKeywords) {
      const keywordIndex = textContent.toLowerCase().indexOf(keyword);
      if (keywordIndex !== -1) {
        relevantText = textContent.substring(keywordIndex, keywordIndex + 2000);
        break;
      }
    }
    
    // Try multiple patterns common in Big Ten athletics sites
    const patterns = [
      // Pattern 1: Standard format "Oct 4 vs Michigan State"
      /([A-Z][a-z]{2})\s+(\d{1,2})\s+(vs\.?|at|@)\s+(.+?)(?=\s+[A-Z][a-z]{2}\s+\d|\s*$)/g,
      // Pattern 2: Compressed format "Oct4 vs Michigan State"
      /([A-Z][a-z]{2})(\d{1,2})\s+(vs\.?|at|@)\s+(.+?)(?=\s+[A-Z][a-z]{2}\d|\s*$)/g,
      // Pattern 3: With day of week "Sat, Oct 4 vs Michigan State"
      /[A-Z][a-z]{2},?\s+([A-Z][a-z]{2})\s+(\d{1,2})\s+(vs\.?|at|@)\s+(.+?)(?=\s+[A-Z][a-z]{2}|\s*$)/g
    ];
    
    let gameIndex = 0;
    
    for (const pattern of patterns) {
      let match;
      pattern.lastIndex = 0;
      
      while ((match = pattern.exec(relevantText)) !== null) {
        try {
          const [, month, day, homeAway, opponent] = match;
          
          // Clean up opponent name
          const cleanOpponent = opponent.trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s&().''-]/g, '')
            .trim();
          
          if (!cleanOpponent || cleanOpponent.length < 2) continue;
          
          // Skip duplicates
          const isDuplicate = games.some(game => 
            game.opponent === cleanOpponent && 
            game.date.getMonth() === this.getMonthNumber(month) &&
            game.date.getDate() === parseInt(day)
          );
          
          if (isDuplicate) continue;
          
          // Parse date
          const currentYear = new Date().getFullYear();
          const gameYear = ['Jan', 'Feb', 'Mar', 'Apr'].includes(month) ? currentYear + 1 : currentYear;
          const dateString = `${month} ${day}, ${gameYear}`;
          const gameDate = new Date(dateString);
          
          if (isNaN(gameDate.getTime())) continue;
          
          const game: ScheduleGame = {
            id: `game-${gameIndex}`,
            date: gameDate,
            opponent: cleanOpponent,
            isHome: homeAway.toLowerCase().includes('vs'),
            conference: this.isConferenceGame(teamName, cleanOpponent),
            exhibition: false,
            status: 'scheduled' as const,
            broadcastInfo: {}
          };
          
          games.push(game);
          gameIndex++;
          
        } catch {
          // Continue processing other games
        }
      }
      
      if (games.length > 0) break; // Stop if we found games with this pattern
    }

    return {
      teamName,
      season,
      record,
      games: games.sort((a, b) => a.date.getTime() - b.date.getTime()),
      lastUpdated: new Date(),
    };
  }

  private isConferenceGame(teamName: string, opponent: string): boolean {
    // Comprehensive conference mappings for NCAA Division I men's hockey
    const conferences = {
      'Big Ten': [
        'Michigan', 'Michigan State', 'Ohio State', 'Penn State', 
        'Wisconsin', 'Minnesota', 'Notre Dame'
      ],
      'Hockey East': [
        'Boston University', 'Boston College', 'UMass', 'Northeastern', 
        'Providence', 'Maine', 'New Hampshire', 'UConn', 'Vermont', 
        'UMass Lowell', 'Merrimack'
      ],
      'NCHC': [
        'Denver', 'North Dakota', 'Minnesota Duluth', 'Colorado College', 
        'Western Michigan', 'Miami', 'Miami (OH)', 'Omaha', 'St. Cloud State',
        'Arizona State'
      ],
      'ECAC Hockey': [
        'Cornell', 'Clarkson', 'Dartmouth', 'Union (NY)', 'Harvard', 
        'Princeton', 'Brown', 'St. Lawrence', 'Yale', 'Colgate', 
        'Quinnipiac', 'Rensselaer'
      ],
      'CCHA': [
        'Ferris State', 'Bowling Green', 'Michigan Tech', 'Bemidji State', 
        'Lake Superior State', 'Northern Michigan', 'Minnesota State', 
        'St. Thomas', 'Augustana'
      ],
      'Atlantic Hockey': [
        'Bentley', 'Holy Cross', 'Sacred Heart', 'Niagara', 
        'Canisius', 'Robert Morris', 'Rochester Institute of Technology', 
        'Mercyhurst', 'Army', 'Air Force'
      ],
      'Independent': [
        'Alaska Fairbanks', 'Alaska Anchorage', 'Lindenwood', 'LIU', 'Stonehill'
      ]
    };

    // Find which conference the team belongs to
    let teamConference = null;
    for (const [conference, teams] of Object.entries(conferences)) {
      if (teams.includes(teamName)) {
        teamConference = conference;
        break;
      }
    }

    // If team not found in any conference, return false
    if (!teamConference || teamConference === 'Independent') {
      return false;
    }

    // Check if opponent is in the same conference
    const conferenceTeams = conferences[teamConference as keyof typeof conferences];
    return conferenceTeams.some(team => {
      // Handle various opponent name formats
      const normalizedOpponent = opponent.toLowerCase().trim();
      const normalizedTeam = team.toLowerCase();
      
      // Direct match
      if (normalizedOpponent === normalizedTeam) {
        return team !== teamName; // Don't match against self
      }
      
      // Partial match for cases like "UMass" vs "Massachusetts"
      if (normalizedOpponent.includes(normalizedTeam) || normalizedTeam.includes(normalizedOpponent)) {
        return team !== teamName;
      }
      
      // Handle specific naming variations
      const variations: { [key: string]: string[] } = {
        'umass': ['massachusetts'],
        'uconn': ['connecticut'],
        'unh': ['new hampshire'],
        'rit': ['rochester institute of technology', 'rochester tech'],
        'miami': ['miami (oh)', 'miami ohio'],
        'union': ['union (ny)', 'union college'],
        'st.': ['saint'],
        'saint': ['st.']
      };
      
      for (const [key, alts] of Object.entries(variations)) {
        if (normalizedTeam.includes(key) && alts.some(alt => normalizedOpponent.includes(alt))) {
          return team !== teamName;
        }
        if (normalizedOpponent.includes(key) && alts.some(alt => normalizedTeam.includes(alt))) {
          return team !== teamName;
        }
      }
      
      return false;
    });
  }

  private removeDuplicateGames(games: ScheduleGame[]): ScheduleGame[] {
    const uniqueGames: ScheduleGame[] = [];
    const seenGames = new Set<string>();

    for (const game of games) {
      // Create a unique key based on date and opponent
      const key = `${game.date.toDateString()}-${game.opponent.toLowerCase().replace(/\s+/g, '')}`;
      
      if (!seenGames.has(key)) {
        seenGames.add(key);
        uniqueGames.push(game);
      }
    }

    return uniqueGames;
  }

  private parseGameFromMatch(match: RegExpMatchArray, index: number, teamName?: string): ScheduleGame | null {
    try {
      const datePart = match[1]; // "Oct 4 (Sat)"
      const homeAway = match[2]; // "vs" or "at"
      const opponentInfo = match[3]; // Opponent name

      // Extract date
      const dateMatch = datePart.match(/([A-Z][a-z]{2})\s+(\d{1,2})/);
      if (!dateMatch) return null;

      const month = this.monthNameToNumber(dateMatch[1]);
      const day = parseInt(dateMatch[2]);
      const year = month >= 8 ? 2025 : 2026;
      const date = new Date(year, month, day);

      // Clean up opponent name more thoroughly
      let opponent = opponentInfo.trim();
      
      // Remove common suffixes that get captured
      opponent = opponent.replace(/\s+(Box\s+Score|Recap|Gallery|Int|Gameday\s+Information|Watch|Live|Stats|Tickets|Magnet\s+Giveaway|Schedule\s+Magnet\s+Giveaway|Exhibition).*$/i, '');
      opponent = opponent.replace(/\s+(Boston|Storrs|Orono|Cambridge|Durham|Providence|Amherst|North Andover|Hamden|Chestnut Hill|New York|Worcester|Fairfield|USAF Academy|West Point|Erie|Rochester|Minneapolis|Fairbanks|Houghton|Marquette|Mankato|Big Rapids|Potsdam|Canton|Bemidji|St\.\s+Paul|Sault Ste\.\s+Marie).*$/, '');
      
      // Remove Michigan Tech specific patterns
      opponent = opponent.replace(/\s+History(\s+.*)?$/, ''); // Remove "History" or "History vs [Team]" text
      opponent = opponent.replace(/\s+Winter\s+Carnival(\s+.*)?$/, ''); // Remove "Winter Carnival" text
      
      // Remove content that suggests mixed/mangled parsing (signs of old content mixed in)
      opponent = opponent.replace(/\s+(Ice\s+Hockey\s+Highlights|All\s+Videos|Related\s+News|Skip\s+Ad|All\s+News|Highlights|Videos).*$/i, '');
      opponent = opponent.replace(/\([A-Z][a-z]{2}\.\s+\d{1,2}\).*$/i, ''); // Remove date references like "(Feb. 28)"
      opponent = opponent.replace(/\s+(Friday|Saturday|Sunday|Monday|Tuesday|Wednesday|Thursday),.*$/i, ''); // Remove day references
      
      // Handle "Lowell" specifically - remove trailing Lowell (location) but preserve "UMass Lowell" team name
      // Remove duplicated "Lowell" that appears after "UMass Lowell"
      opponent = opponent.replace(/^(.*UMass Lowell)\s+Lowell.*$/, '$1');
      // For other cases, remove trailing Lowell
      if (!opponent.includes('UMass Lowell')) {
        opponent = opponent.replace(/\s+Lowell.*$/, '');
      }
      
      opponent = opponent.replace(/\s*\(exh\.\)/, '');
      opponent = opponent.replace(/\s*Red Hot Hockey.*$/, '');
      opponent = opponent.replace(/^\s*\[|\]\s*$/, ''); // Remove brackets
      opponent = opponent.replace(/\s*\([^)]*\)\s*$/, ''); // Remove parentheses at end
      opponent = opponent.trim();

      // Skip if opponent name is too short, contains invalid characters, or shows signs of mixed content
      if (opponent.length < 2 || 
          opponent.includes('/') || 
          opponent.includes('TBD') || 
          opponent.includes('Men\'s Ice Hockey') ||
          opponent.includes('Highlights') ||
          opponent.includes('Videos') ||
          opponent.includes('News') ||
          opponent.includes('@opponent') // Template variables
          || opponent.includes('@date') 
          || opponent.includes('@del') 
          || opponent.includes('@') // Any @ symbol is suspicious
          || opponent.includes('${') // Template literals
          || opponent.includes('{{') // Template placeholders
          || opponent.startsWith('on ') // Common parsing artifacts
          || opponent.startsWith('at ') 
          || opponent.includes('History') && opponent.includes(',') // Location/history mixed content
          || /(.+)\s+\1/.test(opponent) // Repeated words (like "Niagara ... Niagara")
          || opponent.split(' ').length > 8 // Too many words suggests mixed content
          || opponent.length > 100) { // Suspiciously long names are likely mixed content
        return null;
      }

      // Check if exhibition
      const exhibition = opponentInfo.includes('(exh.)');

      // Determine home/away
      const isHome = homeAway.toLowerCase() === 'vs';

      // Extract broadcast info from the full match
      const broadcastInfo: ScheduleGame['broadcastInfo'] = {};
      if (match[0].includes('ESPN+')) {
        broadcastInfo.network = 'ESPN+';
      }

      // Check if conference game - use enhanced detection if team name provided, otherwise fall back to abbreviations
      let conference = false;
      if (teamName && opponent) {
        conference = this.isConferenceGame(teamName, opponent);
      } else {
        // Fallback to pattern-based detection when team name not available
        conference = match[0].includes('HEA') || // Hockey East
                    match[0].includes('NCHC') || // NCHC
                    match[0].includes('B1G') ||  // Big Ten
                    match[0].includes('ECAC') || // ECAC
                    match[0].includes('CCHA');  // CCHA
      }

      // Set venue info based on team
      let venue, city, state;
      if (isHome) {
        venue = this.getHomeVenue(match[0]);
        const location = this.getHomeLocation(match[0]);
        city = location.city;
        state = location.state;
      }

      return {
        id: `game-${index}`,
        date,
        opponent,
        isHome,
        venue,
        city,
        state,
        conference,
        exhibition,
        status: 'scheduled',
        broadcastInfo,
      };
    } catch {
      return null;
    }
  }

  private parseGameFromHtmlMatch(match: RegExpMatchArray, index: number): ScheduleGame | null {
    try {
      const datePart = match[1]; // "Oct 4 (Sat)"
      const homeAway = match[2]; // "vs" or "at"
      const opponentInfo = match[3]; // Opponent name and additional info

      // Extract date
      const dateMatch = datePart.match(/([A-Z][a-z]{2})\s+(\d{1,2})/);
      if (!dateMatch) return null;

      const month = this.monthNameToNumber(dateMatch[1]);
      const day = parseInt(dateMatch[2]);
      const year = month >= 8 ? 2025 : 2026;
      const date = new Date(year, month, day);

      // Extract opponent name
      let opponent = opponentInfo.split(' on ')[0].trim();
      opponent = opponent.replace(/\s*\(exh\.\)/, '');

      // Check if exhibition
      const exhibition = opponentInfo.includes('(exh.)');

      // Determine home/away
      const isHome = homeAway.toLowerCase() === 'vs';

      // Extract broadcast info from the full match
      const broadcastInfo: ScheduleGame['broadcastInfo'] = {};
      if (match[0].includes('ESPN+')) {
        broadcastInfo.network = 'ESPN+';
      }

      // Check if conference game (look for common conference abbreviations)
      const conference = match[0].includes('HEA') || // Hockey East
                        match[0].includes('NCHC') || // NCHC
                        match[0].includes('B1G') ||  // Big Ten
                        match[0].includes('ECAC') || // ECAC
                        match[0].includes('CCHA');  // CCHA

      // Set venue info based on team (this could be made more dynamic)
      let venue, city, state;
      if (isHome) {
        // For now, we'll use generic venue info - this could be enhanced with team-specific data
        venue = this.getHomeVenue(match[0]);
        const location = this.getHomeLocation(match[0]);
        city = location.city;
        state = location.state;
      }

      return {
        id: `game-${index}`,
        date,
        opponent,
        isHome,
        venue,
        city,
        state,
        conference,
        exhibition,
        status: 'scheduled',
        broadcastInfo,
      };
    } catch {
      return null;
    }
  }

  private parseGameFromTextMatch(match: RegExpMatchArray, index: number): ScheduleGame | null {
    try {
      const datePart = match[1]; // "Oct 4 (Sat)"
      const timePart = match[2]; // "TBD" or time
      const broadcastPart = match[3] || ''; // "ESPN+" or empty
      const homeAway = match[4]; // "vs" or "at"
      const opponentInfo = match[5]; // Opponent name

      // Extract date
      const dateMatch = datePart.match(/([A-Z][a-z]{2})\s+(\d{1,2})/);
      if (!dateMatch) return null;

      const month = this.monthNameToNumber(dateMatch[1]);
      const day = parseInt(dateMatch[2]);
      const year = month >= 8 ? 2025 : 2026;
      const date = new Date(year, month, day);

      // Clean up opponent name
      let opponent = opponentInfo.trim().split(/\s+on\s+/)[0];
      opponent = opponent.replace(/\s*\(exh\.\)/, '');
      opponent = opponent.replace(/\s*Boston,.*$/, '');
      opponent = opponent.trim();

      // Check if exhibition
      const exhibition = opponentInfo.includes('(exh.)');

      // Determine home/away
      const isHome = homeAway.toLowerCase() === 'vs';

      // Extract broadcast info
      const broadcastInfo: ScheduleGame['broadcastInfo'] = {};
      if (broadcastPart.includes('ESPN+')) {
        broadcastInfo.network = 'ESPN+';
      }

      // Check if conference game (look for common conference abbreviations)
      const conference = broadcastPart.includes('HEA') || // Hockey East
                        broadcastPart.includes('NCHC') || // NCHC
                        broadcastPart.includes('B1G') ||  // Big Ten
                        broadcastPart.includes('ECAC') || // ECAC
                        broadcastPart.includes('CCHA');  // CCHA

      // Set venue info based on team
      let venue, city, state;
      if (isHome) {
        venue = this.getHomeVenue(match[0]);
        const location = this.getHomeLocation(match[0]);
        city = location.city;
        state = location.state;
      }

      return {
        id: `game-${index}`,
        date,
        opponent,
        isHome,
        venue,
        city,
        state,
        time: timePart !== 'TBD' ? timePart : undefined,
        conference,
        exhibition,
        status: 'scheduled',
        broadcastInfo,
      };
    } catch {
      return null;
    }
  }

  private scrapeGenericSchedule($: cheerio.CheerioAPI, teamName?: string): TeamSchedule {
    // Generic fallback for other school formats
    // This would need to be expanded based on common patterns
    return {
      teamName: teamName || 'Unknown Team',
      season: '2025-26',
      record: {
        overall: '0-0-0',
        conference: '0-0-0',
        home: '0-0-0',
        away: '0-0-0',
        neutral: '0-0-0',
      },
      games: [],
      lastUpdated: new Date(),
    };
  }

  private extractSeason($: cheerio.CheerioAPI): string | null {
    // Look for season information in title or headings
    const title = $('title').text();
    const textContent = $.text();
    
    const targetSeason = '2025-26';
    
    // Look for season patterns - must be proper hockey season format (YYYY-YY)
    const seasonPatterns = [
      /(\d{4}-\d{2})\s*(?:season|schedule)/gi,  // "2025-26 season" or "2025-26 schedule"
      /(\d{4}\/\d{2})\s*(?:season|schedule)/gi, // "2025/26 season" 
      /(?:season|schedule)\s*(\d{4}-\d{2})/gi,  // "season 2025-26"
      /(?:season|schedule)\s*(\d{4}\/\d{2})/gi, // "season 2025/26"
    ];
    
    const foundSeasons: string[] = [];
    
    // Check title first for explicit season references
    for (const pattern of seasonPatterns) {
      let match;
      while ((match = pattern.exec(title)) !== null) {
        const season = match[1].replace('/', '-');
        foundSeasons.push(season);
      }
    }
    
    // Check headings for explicit season references
    const headings = $('h1, h2, h3').text();
    for (const pattern of seasonPatterns) {
      let match;
      while ((match = pattern.exec(headings)) !== null) {
        const season = match[1].replace('/', '-');
        foundSeasons.push(season);
      }
    }
    
    // If no explicit season found, look for any YYYY-YY pattern but be more careful
    if (foundSeasons.length === 0) {
      // Look for standalone season patterns, but avoid dates
      const standaloneSeasonPattern = /(?:^|\s)(\d{4}-\d{2})(?:\s|$)/g;
      const titleAndHeadingsText = title + ' ' + headings;
      
      let match;
      while ((match = standaloneSeasonPattern.exec(titleAndHeadingsText)) !== null) {
        const season = match[1];
        // Validate it's a proper hockey season format
        const [startYear, endYear] = season.split('-').map(y => parseInt(y));
        if (endYear === (startYear + 1) % 100) {
          foundSeasons.push(season);
        }
      }
    }
    
    // Remove duplicates and filter for valid seasons
    const uniqueSeasons = [...new Set(foundSeasons)];
    const validSeasons = uniqueSeasons.filter(season => {
      const [startYear] = season.split('-');
      const startYearNum = parseInt(startYear);
      const [, endYearStr] = season.split('-');
      const endYearNum = parseInt(endYearStr);
      
      // Must be proper hockey season format and from 2025 onwards
      return startYearNum >= 2025 && endYearNum === (startYearNum + 1) % 100;
    });
    
    // Prefer target season if found
    if (validSeasons.includes(targetSeason)) {
      return targetSeason;
    }
    
    // If we found valid seasons but not our target, pick the earliest valid one
    if (validSeasons.length > 0) {
      validSeasons.sort();
      return validSeasons[0];
    }
    
    // If no valid season found, check if we found any seasons at all (they might be old)
    if (foundSeasons.length > 0) {
      const oldSeasons = foundSeasons.filter(season => {
        const [startYear] = season.split('-');
        const startYearNum = parseInt(startYear);
        return startYearNum < 2025;
      });
      
      if (oldSeasons.length > 0) {
        return null; // Signal that this is likely old data
      }
      
      return null; // Signal that this is likely old data
    }
    
    // If no season information found at all, be more conservative
    // Only default to target season if we have some evidence this is a current page
    const hasCurrentYearContent = textContent.includes('2025') || textContent.includes('2026');
    if (hasCurrentYearContent) {
      return targetSeason;
    }
    
    return null;
  }

  private extractRecord($: cheerio.CheerioAPI): TeamSchedule['record'] {
    // Default record structure
    const defaultRecord = {
      overall: '0-0-0',
      conference: '0-0-0',
      home: '0-0-0',
      away: '0-0-0',
      neutral: '0-0-0',
    };

    try {
      // Look for record information in the page
      const text = $.text();
      const overallMatch = text.match(/Overall(\d+-\d+-\d+)/);
      const confMatch = text.match(/Conf(\d+-\d+-\d+)/);
      const homeMatch = text.match(/Home(\d+-\d+-\d+)/);
      const awayMatch = text.match(/Away(\d+-\d+-\d+)/);

      return {
        overall: overallMatch ? overallMatch[1] : defaultRecord.overall,
        conference: confMatch ? confMatch[1] : defaultRecord.conference,
        home: homeMatch ? homeMatch[1] : defaultRecord.home,
        away: awayMatch ? awayMatch[1] : defaultRecord.away,
        neutral: defaultRecord.neutral,
      };
    } catch {
      return defaultRecord;
    }
  }

  private monthNameToNumber(monthName: string): number {
    const months: Record<string, number> = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    return months[monthName] ?? 0;
  }

  private getMonthNumber(monthAbbr: string): number {
    const months: { [key: string]: number } = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    return months[monthAbbr] || 0;
  }

  private getHomeVenue(matchText: string): string | undefined {
    // Detect venue based on content patterns
    if (matchText.includes('Agganis') || matchText.includes('goterriers.com')) {
      return 'Agganis Arena';
    }
    // Add more venue patterns for other schools as needed
    return undefined;
  }

  private getHomeLocation(matchText: string): { city?: string; state?: string } {
    // Detect location based on content patterns
    if (matchText.includes('Agganis') || matchText.includes('goterriers.com')) {
      return { city: 'Boston', state: 'MA' };
    }
    // Add more location patterns for other schools as needed
    return {};
  }

  private parseGameDate(dateStr: string, timeStr?: string): Date {
    // Parse dates like "Oct 03 (Fri)" or "Nov 01 (Sat)"
    const dateMatch = dateStr.match(/^([A-Z][a-z]{2})\s+(\d{1,2})\s+\([A-Z][a-z]{2}\)$/);
    if (!dateMatch) {
      throw new Error(`Invalid date format: ${dateStr}`);
    }
    
    const monthStr = dateMatch[1];
    const day = parseInt(dateMatch[2]);
    
    // Map month abbreviations to numbers
    const monthMap: { [key: string]: number } = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    
    const month = monthMap[monthStr];
    if (month === undefined) {
      throw new Error(`Unknown month: ${monthStr}`);
    }
    
    // Determine the year (2025 for Oct-Dec, 2026 for Jan-Mar)
    const year = month >= 9 ? 2025 : 2026; // Oct(9), Nov(10), Dec(11) = 2025, others = 2026
    
    let hour = 19; // Default to 7 PM
    let minute = 0;
    
    // Parse time if provided (e.g., "6:07 PM EDT")
    if (timeStr) {
      const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s+(AM|PM)/);
      if (timeMatch) {
        hour = parseInt(timeMatch[1]);
        minute = parseInt(timeMatch[2]);
        if (timeMatch[3] === 'PM' && hour !== 12) {
          hour += 12;
        } else if (timeMatch[3] === 'AM' && hour === 12) {
          hour = 0;
        }
      }
    }
    
    return new Date(year, month, day, hour, minute);
  }
}

// Team URL mappings for supported schools
// Currently supports Sidearm Sports platform and similar athletics websites
// Load team schedule URLs from the mapping file
let TEAM_SCHEDULE_URLS: Record<string, string> = {};

export async function loadTeamScheduleUrls(): Promise<Record<string, string>> {
  if (Object.keys(TEAM_SCHEDULE_URLS).length > 0) {
    return TEAM_SCHEDULE_URLS;
  }

  try {
    // Read the file from the public directory
    const filePath = path.join(process.cwd(), 'public', 'program_schedule_sites.csv');
    const text = fs.readFileSync(filePath, 'utf-8');
    
    const urls: Record<string, string> = {};
    text.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && trimmedLine.includes(',')) {
        const [teamName, url] = trimmedLine.split(',').map(s => s.trim());
        if (teamName && url) {
          urls[teamName] = url;
        }
      }
    });
    
    TEAM_SCHEDULE_URLS = urls;
    return urls;
  } catch {
    return {};
  }
}

export function getTeamScheduleUrl(teamName: string): string | null {
  return TEAM_SCHEDULE_URLS[teamName] || null;
}

export const scheduleScraper = new HockeyScheduleScraper();
