export interface USCHOPollTeam {
  rank: number;
  team: string;
  firstPlaceVotes: number;
  record: string;
  points: number;
  lastWeekRank: number | null;
}

export interface USCHOPoll {
  date: string;
  teams: USCHOPollTeam[];
  othersReceivingVotes: string;
}

export class USCHOPollScraper {
  private static readonly USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  private static readonly MENS_URL = 'https://www.uscho.com/rankings/d-i-mens-poll';
  private static readonly WOMENS_URL = 'https://www.uscho.com/rankings/d-i-womens-poll';

  static async scrapePoll(gender: 'men' | 'women'): Promise<USCHOPoll> {
    const url = gender === 'men' ? this.MENS_URL : this.WOMENS_URL;
    
    const response = await fetch(url);
    const html = await response.text();
    
    const teams = await this.scrapeTeams(html);
    const othersReceivingVotes = this.scrapeOthersReceivingVotes(html);
    
    // Extract date from first team's PollDate if available
    const date = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    return {
      date,
      teams,
      othersReceivingVotes
    };
  }

  private static scrapeOthersReceivingVotes(html: string): string {
    // The "others receiving votes" data is in the JSON as &quot;other&quot;:&quot;...&quot;
    const otherMatch = html.match(/&quot;other&quot;:&quot;([^&]+)&quot;/);
    
    if (otherMatch) {
      // Decode HTML entities
      return otherMatch[1].replace(/&#039;/g, "'");
    }
    
    return '';
  }

  private static async scrapeTeams(html: string): Promise<USCHOPollTeam[]> {
    try {
      // The poll data is embedded in the HTML as HTML-encoded JSON
      // Look for the pattern: &quot;data&quot;:[{...}]
      // Match the pattern more flexibly - look for data array with poll information
      const dataArrayMatch = html.match(/&quot;data&quot;:\[(\{&quot;[^&]*&quot;[^\]]+)\]/);
      
      if (!dataArrayMatch) {
        throw new Error('Could not find poll data in page HTML');
      }
      
      // Decode HTML entities
      const encoded = dataArrayMatch[1];
      const decoded = encoded
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
      
      // Parse individual team objects from the array
      const teams: USCHOPollTeam[] = [];
      let depth = 0;
      let current = '';
      
      for (let i = 0; i < decoded.length; i++) {
        const char = decoded[i];
        if (char === '{') depth++;
        if (char === '}') {
          depth--;
          current += char;
          if (depth === 0 && current.trim()) {
            try {
              const team = JSON.parse(current);
              teams.push({
                rank: team.rnk,
                team: team.shortname,
                record: team.record || '',
                points: team.pts || 0,
                firstPlaceVotes: team.first_pv || 0,
                lastWeekRank: team.prev_rnk || null
              });
            } catch (parseError) {
              console.error('Failed to parse team object:', parseError);
            }
            current = '';
            continue;
          }
        }
        if (depth > 0) current += char;
      }
      
      if (teams.length === 0) {
        throw new Error('No teams found in poll data');
      }
      
      return teams;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to scrape teams from USCHO: ${error.message}`);
      }
      throw error;
    }
  }
}