import * as cheerio from 'cheerio';
import axios from 'axios';

export interface CHNScheduleGame {
  id: string;
  date: Date;
  opponent: string;
  isHome: boolean;
  venue?: string;
  time?: string;
  conference: boolean;
  exhibition: boolean;
  status: 'scheduled' | 'completed' | 'postponed' | 'cancelled';
  result?: {
    score: string;
    won: boolean;
  };
  tournamentInfo?: string;
}

export interface CHNTeamSchedule {
  teamName: string;
  season: string;
  record: {
    overall: string;
    conference: string;
  };
  games: CHNScheduleGame[];
  lastUpdated: Date;
}

// Men's team name to CHN URL mapping (verified IDs)
const CHN_MEN_TEAM_MAPPING = new Map<string, { url: string; conference: string }>([
  // Atlantic Hockey
  ['Air Force', { url: 'https://www.collegehockeynews.com/schedules/team/Air-Force/1', conference: 'Atlantic Hockey' }],
  ['Army', { url: 'https://www.collegehockeynews.com/schedules/team/Army/6', conference: 'Atlantic Hockey' }],
  ['Army West Point', { url: 'https://www.collegehockeynews.com/schedules/team/Army/6', conference: 'Atlantic Hockey' }],
  ['Bentley', { url: 'https://www.collegehockeynews.com/schedules/team/Bentley/8', conference: 'Atlantic Hockey' }],
  ['Canisius', { url: 'https://www.collegehockeynews.com/schedules/team/Canisius/13', conference: 'Atlantic Hockey' }],
  ['Holy Cross', { url: 'https://www.collegehockeynews.com/schedules/team/Holy-Cross/23', conference: 'Atlantic Hockey' }],
  ['Mercyhurst', { url: 'https://www.collegehockeynews.com/schedules/team/Mercyhurst/28', conference: 'Atlantic Hockey' }],
  ['Niagara', { url: 'https://www.collegehockeynews.com/schedules/team/Niagara/39', conference: 'Atlantic Hockey' }],
  ['RIT', { url: 'https://www.collegehockeynews.com/schedules/team/RIT/49', conference: 'Atlantic Hockey' }],
  ['Rochester Institute of Technology', { url: 'https://www.collegehockeynews.com/schedules/team/RIT/49', conference: 'Atlantic Hockey' }],
  ['Robert Morris', { url: 'https://www.collegehockeynews.com/schedules/team/Robert-Morris/50', conference: 'Atlantic Hockey' }],
  ['Sacred Heart', { url: 'https://www.collegehockeynews.com/schedules/team/Sacred-Heart/51', conference: 'Atlantic Hockey' }],

  // Big Ten
  ['Michigan', { url: 'https://www.collegehockeynews.com/schedules/team/Michigan/31', conference: 'Big Ten' }],
  ['Michigan State', { url: 'https://www.collegehockeynews.com/schedules/team/Michigan-State/32', conference: 'Big Ten' }],
  ['Minnesota', { url: 'https://www.collegehockeynews.com/schedules/team/Minnesota/34', conference: 'Big Ten' }],
  ['Notre Dame', { url: 'https://www.collegehockeynews.com/schedules/team/Notre-Dame/43', conference: 'Big Ten' }],
  ['Ohio State', { url: 'https://www.collegehockeynews.com/schedules/team/Ohio-State/44', conference: 'Big Ten' }],
  ['Penn State', { url: 'https://www.collegehockeynews.com/schedules/team/Penn-State/60', conference: 'Big Ten' }],
  ['Wisconsin', { url: 'https://www.collegehockeynews.com/schedules/team/Wisconsin/58', conference: 'Big Ten' }],

  // CCHA
  ['Augustana', { url: 'https://www.collegehockeynews.com/schedules/team/Augustana/64', conference: 'CCHA' }],
  ['Bemidji State', { url: 'https://www.collegehockeynews.com/schedules/team/Bemidji-State/7', conference: 'CCHA' }],
  ['Bowling Green', { url: 'https://www.collegehockeynews.com/schedules/team/Bowling-Green/11', conference: 'CCHA' }],
  ['Ferris State', { url: 'https://www.collegehockeynews.com/schedules/team/Ferris-State/21', conference: 'CCHA' }],
  ['Lake Superior State', { url: 'https://www.collegehockeynews.com/schedules/team/Lake-Superior/24', conference: 'CCHA' }],
  ['Michigan Tech', { url: 'https://www.collegehockeynews.com/schedules/team/Michigan-Tech/33', conference: 'CCHA' }],
  ['Minnesota State', { url: 'https://www.collegehockeynews.com/schedules/team/Minnesota-State/35', conference: 'CCHA' }],
  ['Northern Michigan', { url: 'https://www.collegehockeynews.com/schedules/team/Northern-Michigan/42', conference: 'CCHA' }],
  ['St. Thomas', { url: 'https://www.collegehockeynews.com/schedules/team/St-Thomas/63', conference: 'CCHA' }],

  // ECAC
  ['Brown', { url: 'https://www.collegehockeynews.com/schedules/team/Brown/12', conference: 'ECAC' }],
  ['Clarkson', { url: 'https://www.collegehockeynews.com/schedules/team/Clarkson/14', conference: 'ECAC' }],
  ['Colgate', { url: 'https://www.collegehockeynews.com/schedules/team/Colgate/15', conference: 'ECAC' }],
  ['Cornell', { url: 'https://www.collegehockeynews.com/schedules/team/Cornell/18', conference: 'ECAC' }],
  ['Dartmouth', { url: 'https://www.collegehockeynews.com/schedules/team/Dartmouth/19', conference: 'ECAC' }],
  ['Harvard', { url: 'https://www.collegehockeynews.com/schedules/team/Harvard/22', conference: 'ECAC' }],
  ['Princeton', { url: 'https://www.collegehockeynews.com/schedules/team/Princeton/45', conference: 'ECAC' }],
  ['Quinnipiac', { url: 'https://www.collegehockeynews.com/schedules/team/Quinnipiac/47', conference: 'ECAC' }],
  ['Rensselaer', { url: 'https://www.collegehockeynews.com/schedules/team/Rensselaer/48', conference: 'ECAC' }],
  ['St. Lawrence', { url: 'https://www.collegehockeynews.com/schedules/team/St-Lawrence/53', conference: 'ECAC' }],
  ['Union (NY)', { url: 'https://www.collegehockeynews.com/schedules/team/Union/54', conference: 'ECAC' }],
  ['Union', { url: 'https://www.collegehockeynews.com/schedules/team/Union/54', conference: 'ECAC' }],
  ['Yale', { url: 'https://www.collegehockeynews.com/schedules/team/Yale/59', conference: 'ECAC' }],

  // Hockey East
  ['Boston College', { url: 'https://www.collegehockeynews.com/schedules/team/Boston-College/9', conference: 'Hockey East' }],
  ['Boston University', { url: 'https://www.collegehockeynews.com/schedules/team/Boston-University/10', conference: 'Hockey East' }],
  ['Connecticut', { url: 'https://www.collegehockeynews.com/schedules/team/Connecticut/17', conference: 'Hockey East' }],
  ['UConn', { url: 'https://www.collegehockeynews.com/schedules/team/Connecticut/17', conference: 'Hockey East' }],
  ['Maine', { url: 'https://www.collegehockeynews.com/schedules/team/Maine/25', conference: 'Hockey East' }],
  ['Mass.-Lowell', { url: 'https://www.collegehockeynews.com/schedules/team/Mass-Lowell/26', conference: 'Hockey East' }],
  ['UMass Lowell', { url: 'https://www.collegehockeynews.com/schedules/team/Mass-Lowell/26', conference: 'Hockey East' }],
  ['Massachusetts', { url: 'https://www.collegehockeynews.com/schedules/team/Massachusetts/27', conference: 'Hockey East' }],
  ['UMass', { url: 'https://www.collegehockeynews.com/schedules/team/Massachusetts/27', conference: 'Hockey East' }],
  ['Merrimack', { url: 'https://www.collegehockeynews.com/schedules/team/Merrimack/29', conference: 'Hockey East' }],
  ['New Hampshire', { url: 'https://www.collegehockeynews.com/schedules/team/New-Hampshire/38', conference: 'Hockey East' }],
  ['Northeastern', { url: 'https://www.collegehockeynews.com/schedules/team/Northeastern/41', conference: 'Hockey East' }],
  ['Providence', { url: 'https://www.collegehockeynews.com/schedules/team/Providence/46', conference: 'Hockey East' }],
  ['Vermont', { url: 'https://www.collegehockeynews.com/schedules/team/Vermont/55', conference: 'Hockey East' }],

  // NCHC
  ['Arizona State', { url: 'https://www.collegehockeynews.com/schedules/team/Arizona-State/61', conference: 'NCHC' }],
  ['Colorado College', { url: 'https://www.collegehockeynews.com/schedules/team/Colorado-College/16', conference: 'NCHC' }],
  ['Denver', { url: 'https://www.collegehockeynews.com/schedules/team/Denver/20', conference: 'NCHC' }],
  ['Miami', { url: 'https://www.collegehockeynews.com/schedules/team/Miami/30', conference: 'NCHC' }],
  ['Miami (OH)', { url: 'https://www.collegehockeynews.com/schedules/team/Miami/30', conference: 'NCHC' }],
  ['Minnesota-Duluth', { url: 'https://www.collegehockeynews.com/schedules/team/Minnesota-Duluth/36', conference: 'NCHC' }],
  ['Minnesota Duluth', { url: 'https://www.collegehockeynews.com/schedules/team/Minnesota-Duluth/36', conference: 'NCHC' }],
  ['Omaha', { url: 'https://www.collegehockeynews.com/schedules/team/Omaha/37', conference: 'NCHC' }],
  ['North Dakota', { url: 'https://www.collegehockeynews.com/schedules/team/North-Dakota/40', conference: 'NCHC' }],
  ['St. Cloud State', { url: 'https://www.collegehockeynews.com/schedules/team/St-Cloud-State/52', conference: 'NCHC' }],
  ['Western Michigan', { url: 'https://www.collegehockeynews.com/schedules/team/Western-Michigan/57', conference: 'NCHC' }],

  // Independents
  ['Alaska-Anchorage', { url: 'https://www.collegehockeynews.com/schedules/team/Alaska-Anchorage/3', conference: 'Independent' }],
  ['Alaska Anchorage', { url: 'https://www.collegehockeynews.com/schedules/team/Alaska-Anchorage/3', conference: 'Independent' }],
  ['Alaska', { url: 'https://www.collegehockeynews.com/schedules/team/Alaska/4', conference: 'Independent' }],
  ['Alaska Fairbanks', { url: 'https://www.collegehockeynews.com/schedules/team/Alaska/4', conference: 'Independent' }],
  ['Lindenwood', { url: 'https://www.collegehockeynews.com/schedules/team/Lindenwood/433', conference: 'Independent' }],
  ['Long Island', { url: 'https://www.collegehockeynews.com/schedules/team/Long-Island/62', conference: 'Independent' }],
  ['LIU', { url: 'https://www.collegehockeynews.com/schedules/team/Long-Island/62', conference: 'Independent' }],
  ['Stonehill', { url: 'https://www.collegehockeynews.com/schedules/team/Stonehill/422', conference: 'Independent' }],
]);

// Women's team name to CHN URL mapping (verified IDs)
const CHN_WOMEN_TEAM_MAPPING = new Map<string, { url: string; conference: string }>([
  // ECAC
  ['Brown', { url: 'https://www.collegehockeynews.com/women/schedules/team/Brown/12', conference: 'ECAC' }],
  ['Clarkson', { url: 'https://www.collegehockeynews.com/women/schedules/team/Clarkson/14', conference: 'ECAC' }],
  ['Colgate', { url: 'https://www.collegehockeynews.com/women/schedules/team/Colgate/15', conference: 'ECAC' }],
  ['Cornell', { url: 'https://www.collegehockeynews.com/women/schedules/team/Cornell/18', conference: 'ECAC' }],
  ['Dartmouth', { url: 'https://www.collegehockeynews.com/women/schedules/team/Dartmouth/19', conference: 'ECAC' }],
  ['Harvard', { url: 'https://www.collegehockeynews.com/women/schedules/team/Harvard/22', conference: 'ECAC' }],
  ['Princeton', { url: 'https://www.collegehockeynews.com/women/schedules/team/Princeton/45', conference: 'ECAC' }],
  ['Quinnipiac', { url: 'https://www.collegehockeynews.com/women/schedules/team/Quinnipiac/47', conference: 'ECAC' }],
  ['Rensselaer', { url: 'https://www.collegehockeynews.com/women/schedules/team/Rensselaer/48', conference: 'ECAC' }],
  ['St. Lawrence', { url: 'https://www.collegehockeynews.com/women/schedules/team/St-Lawrence/53', conference: 'ECAC' }],
  ['Union', { url: 'https://www.collegehockeynews.com/women/schedules/team/Union/54', conference: 'ECAC' }],
  ['Union (NY)', { url: 'https://www.collegehockeynews.com/women/schedules/team/Union/54', conference: 'ECAC' }],
  ['Yale', { url: 'https://www.collegehockeynews.com/women/schedules/team/Yale/59', conference: 'ECAC' }],

  // Hockey East
  ['Boston College', { url: 'https://www.collegehockeynews.com/women/schedules/team/Boston-College/9', conference: 'Hockey East' }],
  ['Boston University', { url: 'https://www.collegehockeynews.com/women/schedules/team/Boston-University/10', conference: 'Hockey East' }],
  ['Connecticut', { url: 'https://www.collegehockeynews.com/women/schedules/team/Connecticut/17', conference: 'Hockey East' }],
  ['UConn', { url: 'https://www.collegehockeynews.com/women/schedules/team/Connecticut/17', conference: 'Hockey East' }],
  ['Maine', { url: 'https://www.collegehockeynews.com/women/schedules/team/Maine/25', conference: 'Hockey East' }],
  ['Holy Cross', { url: 'https://www.collegehockeynews.com/women/schedules/team/Holy-Cross/23', conference: 'Hockey East' }],
  ['Merrimack', { url: 'https://www.collegehockeynews.com/women/schedules/team/Merrimack/29', conference: 'Hockey East' }],
  ['New Hampshire', { url: 'https://www.collegehockeynews.com/women/schedules/team/New-Hampshire/38', conference: 'Hockey East' }],
  ['Northeastern', { url: 'https://www.collegehockeynews.com/women/schedules/team/Northeastern/41', conference: 'Hockey East' }],
  ['Providence', { url: 'https://www.collegehockeynews.com/women/schedules/team/Providence/46', conference: 'Hockey East' }],
  ['Vermont', { url: 'https://www.collegehockeynews.com/women/schedules/team/Vermont/55', conference: 'Hockey East' }],

  // WCHA
  ['Bemidji State', { url: 'https://www.collegehockeynews.com/women/schedules/team/Bemidji-State/7', conference: 'WCHA' }],
  ['Minnesota', { url: 'https://www.collegehockeynews.com/women/schedules/team/Minnesota/34', conference: 'WCHA' }],
  ['Minnesota State', { url: 'https://www.collegehockeynews.com/women/schedules/team/Minnesota-State/35', conference: 'WCHA' }],
  ['Ohio State', { url: 'https://www.collegehockeynews.com/women/schedules/team/Ohio-State/44', conference: 'WCHA' }],
  ['St. Cloud State', { url: 'https://www.collegehockeynews.com/women/schedules/team/St-Cloud-State/52', conference: 'WCHA' }],
  ['St. Thomas', { url: 'https://www.collegehockeynews.com/women/schedules/team/St-Thomas/63', conference: 'WCHA' }],
  ['Wisconsin', { url: 'https://www.collegehockeynews.com/women/schedules/team/Wisconsin/58', conference: 'WCHA' }],

  // AHA (Atlantic Hockey America - Women's)
  ['Delaware', { url: 'https://www.collegehockeynews.com/women/schedules/team/Delaware/447', conference: 'AHA' }],
  ['Lindenwood', { url: 'https://www.collegehockeynews.com/women/schedules/team/Lindenwood/433', conference: 'AHA' }],
  ['Mercyhurst', { url: 'https://www.collegehockeynews.com/women/schedules/team/Mercyhurst/28', conference: 'AHA' }],
  ['Penn State', { url: 'https://www.collegehockeynews.com/women/schedules/team/Penn-State/60', conference: 'AHA' }],
  ['RIT', { url: 'https://www.collegehockeynews.com/women/schedules/team/RIT/49', conference: 'AHA' }],
  ['Rochester Institute of Technology', { url: 'https://www.collegehockeynews.com/women/schedules/team/RIT/49', conference: 'AHA' }],
  ['Robert Morris', { url: 'https://www.collegehockeynews.com/women/schedules/team/Robert-Morris/50', conference: 'AHA' }],
  ['Syracuse', { url: 'https://www.collegehockeynews.com/women/schedules/team/Syracuse/423', conference: 'AHA' }],

  // NEWHA (New England Women's Hockey Alliance)
  ['Assumption', { url: 'https://www.collegehockeynews.com/women/schedules/team/Assumption/401', conference: 'NEWHA' }],
  ['Franklin Pierce', { url: 'https://www.collegehockeynews.com/women/schedules/team/Franklin-Pierce/406', conference: 'NEWHA' }],
  ['Long Island', { url: 'https://www.collegehockeynews.com/women/schedules/team/Long-Island/62', conference: 'NEWHA' }],
  ['LIU', { url: 'https://www.collegehockeynews.com/women/schedules/team/Long-Island/62', conference: 'NEWHA' }],
  ['Post', { url: 'https://www.collegehockeynews.com/women/schedules/team/Post/434', conference: 'NEWHA' }],
  ['Sacred Heart', { url: 'https://www.collegehockeynews.com/women/schedules/team/Sacred-Heart/51', conference: 'NEWHA' }],
  ['Saint Anselm', { url: 'https://www.collegehockeynews.com/women/schedules/team/Saint-Anselm/419', conference: 'NEWHA' }],
  ['Saint Michael\'s', { url: 'https://www.collegehockeynews.com/women/schedules/team/Saint-Michaels/421', conference: 'NEWHA' }],
  ['Stonehill', { url: 'https://www.collegehockeynews.com/women/schedules/team/Stonehill/422', conference: 'NEWHA' }],
]);

export class CollegeHockeyNewsScraper {
  private static readonly USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  
  /**
   * Get team mapping info by name and gender
   */
  static getTeamInfo(teamName: string, gender: 'men' | 'women' = 'men'): { url: string; conference: string; gender: 'men' | 'women' } | null {
    const mapping = gender === 'women' ? CHN_WOMEN_TEAM_MAPPING : CHN_MEN_TEAM_MAPPING;
    const info = mapping.get(teamName);
    return info ? { ...info, gender } : null;
  }

  /**
   * Get all available teams (unique teams only, no aliases)
   */
  static getAllTeams(gender: 'men' | 'women' = 'men'): { name: string; conference: string; gender: 'men' | 'women' }[] {
    const mapping = gender === 'women' ? CHN_WOMEN_TEAM_MAPPING : CHN_MEN_TEAM_MAPPING;
    const uniqueTeams = new Map<string, { name: string; conference: string; gender: 'men' | 'women' }>();
    
    // Iterate through all teams and keep only one entry per unique URL
    for (const [name, info] of mapping.entries()) {
      const key = info.url;
      if (!uniqueTeams.has(key)) {
        uniqueTeams.set(key, { name, conference: info.conference, gender });
      }
    }
    
    return Array.from(uniqueTeams.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Scrape team schedule from College Hockey News
   */
  static async scrapeTeamSchedule(teamName: string, gender: 'men' | 'women' = 'men'): Promise<CHNTeamSchedule> {
    const teamInfo = this.getTeamInfo(teamName, gender);
    if (!teamInfo) {
      throw new Error(`Team "${teamName}" not found in CHN ${gender}'s mapping`);
    }

    try {
      const response = await axios.get(teamInfo.url, {
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      
      // Extract team info from the page
      const teamDisplayName = $('h1').first().text().trim();
      const scheduleHeader = $('h2').first().text();
      
      // Extract record information
      let overallRecord = '0-0-0';
      let conferenceRecord = '0-0-0';
      
      const recordMatch = scheduleHeader.match(/Record: ([\d-]+).*?\(([\d-\s]+)\s+([A-Z]+)\)/);
      if (recordMatch) {
        overallRecord = recordMatch[1];
        conferenceRecord = recordMatch[2].trim();
      }

      // Extract season from URL or header
      const season = '2025-26'; // This could be dynamic based on current date

      const games: CHNScheduleGame[] = [];
      let currentMonth = '';
      let currentYear = '';

      // Process the schedule table
      $('table tr').each((_, row) => {
        const $row = $(row);
        const cells = $row.find('td');
        
        if (cells.length === 0) return;

        // Check if this is a month header row
        const monthHeader = $row.text().trim();
        const monthMatch = monthHeader.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/);
        if (monthMatch) {
          currentMonth = monthMatch[1];
          currentYear = monthMatch[2];
          console.log(`Found month header: ${currentMonth} ${currentYear}`);
          return;
        }

        // Skip if we don't have enough cells for a game row
        if (cells.length < 9) return;

        try {
          const dayText = $(cells[0]).text().trim();
          const dayMatch = dayText.match(/(\d{1,2})\s+\w+/);
          
          if (!dayMatch) return;

          const day = parseInt(dayMatch[1]);
          
          // Validate that we have current month and year
          if (!currentMonth || !currentYear) {
            console.warn(`Missing month/year context for date parsing: month=${currentMonth}, year=${currentYear}`);
            return;
          }
          
          const gameDate = new Date(`${currentMonth} ${day}, ${currentYear}`);
          
          // Validate the parsed date
          if (isNaN(gameDate.getTime())) {
            console.warn(`Invalid date parsed: ${currentMonth} ${day}, ${currentYear}`);
            return;
          }
          
          // Check if this is a completed game by looking for W/L in column 2
          const resultCell = $(cells[2]).text().trim();
          const teamScoreCell = $(cells[3]).text().trim();
          const separatorCell = $(cells[4]).text().trim();
          
          let isCompleted = false;
          let gameResult: { score: string; won: boolean } | undefined;
          
          // Parse completed game results
          if ((resultCell === 'W' || resultCell === 'L') && teamScoreCell) {
            // The separator and opponent score are combined in cell 4 like "- 7"
            const separatorAndOpponentScore = separatorCell;
            const opponentScoreMatch = separatorAndOpponentScore.match(/^-\s*(\d+)$/);
            
            if (opponentScoreMatch) {
              isCompleted = true;
              const teamScore = parseInt(teamScoreCell);
              const opponentScore = parseInt(opponentScoreMatch[1]);
              
              if (!isNaN(teamScore) && !isNaN(opponentScore)) {
                gameResult = {
                  score: `${teamScore}-${opponentScore}`,
                  won: resultCell === 'W'
                };
              }
            }
          }
          
          // Extract home/away info from the location column
          const locationCell = $(cells[6]).text().trim();
          let isHome = true;
          
          // Check location indicators
          if (locationCell === 'at') {
            isHome = false;
          } else if (locationCell === 'vs.') {
            isHome = false; // neutral site
          }
          
          // Extract opponent from the correct column (column 7)
          const opponentCell = $(cells[7]);
          let opponent = opponentCell.text().trim();
          
          // Remove non-conference and exhibition markers
          const isConference = !opponent.includes('(nc)');
          const isExhibition = opponent.includes('(ex)');
          
          // Clean up opponent name
          opponent = opponent
            .replace(/\s*\(nc\)\s*/g, '')
            .replace(/\s*\(ex\)\s*/g, '')
            .trim();

          // Skip if no opponent found
          if (!opponent) return;

          // Extract time from the correct column (column 10)
          const timeCell = $(cells[10]);
          const time = timeCell.text().trim();

          // Generate unique ID for the game (safe now that we validated the date)
          const gameId = `${teamDisplayName}-${gameDate.toISOString().split('T')[0]}-${opponent}`.replace(/\s+/g, '-');

          const game: CHNScheduleGame = {
            id: gameId,
            date: gameDate,
            opponent,
            isHome,
            time: time || undefined,
            conference: isConference,
            exhibition: isExhibition,
            status: isCompleted ? 'completed' : 'scheduled',
            result: gameResult,
          };

          // Check for tournament information (footnote numbers)
          const tournamentMatch = $(cells[1]).text().match(/(\d+)/);
          if (tournamentMatch) {
            // Look for tournament info in footnotes at bottom of page
            const footnoteText = $(`*:contains("${tournamentMatch[1]} ")`).text();
            if (footnoteText) {
              game.tournamentInfo = footnoteText.trim();
            }
          }

          games.push(game);
        } catch (error) {
          console.warn('Error parsing game row:', error);
          // Continue processing other rows
        }
      });

      return {
        teamName: teamDisplayName || teamName,
        season,
        record: {
          overall: overallRecord,
          conference: conferenceRecord,
        },
        games: games.sort((a, b) => a.date.getTime() - b.date.getTime()),
        lastUpdated: new Date(),
      };

    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to scrape schedule for ${teamName}: ${error.message}`);
      }
      throw new Error(`Failed to scrape schedule for ${teamName}: Unknown error`);
    }
  }
}