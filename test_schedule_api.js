#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load team names from CSV file
function loadTeamsFromCSV() {
  try {
    const csvPath = path.join(__dirname, 'public', 'program_schedule_sites.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    const teams = csvContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && line.includes(','))
      .map(line => {
        const [teamName] = line.split(',').map(s => s.trim());
        return teamName;
      })
      .filter(name => name.length > 0);
    
    console.log(`📋 Loaded ${teams.length} teams from CSV file`);
    return teams;
  } catch (error) {
    console.error('Error loading teams from CSV:', error.message);
    // Fallback to a few test teams if CSV loading fails
    return [
      'Boston University',
      'Boston College', 
      'Michigan',
      'Maine',
      'Denver'
    ];
  }
}

const testTeams = loadTeamsFromCSV();

async function testTeam(teamName) {
  try {
    const response = await axios.get(`http://localhost:3000/api/scrape-schedule?team=${encodeURIComponent(teamName)}`);
    const data = response.data;
    
    console.log(`✅ ${teamName}: ${data.games.length} games found`);
    console.log(`   Season: ${data.season}`);
    console.log(`   Record: ${data.record.overall}`);
    
    if (data.games.length > 0) {
      console.log(`   First game: ${data.games[0].date} vs ${data.games[0].opponent}`);
    } else {
      console.log(`   📅 No games scheduled yet (common for 2025-26 season)`);
    }
    
    return { team: teamName, games: data.games.length, status: 'success' };
  } catch (error) {
    console.log(`❌ ${teamName}: Error - ${error.response?.data?.error || error.message}`);
    return { team: teamName, games: 0, status: 'error', error: error.response?.data?.error || error.message };
  }
}

async function runTests() {
  console.log('🚀 Testing NCAA Hockey Schedule Scraper');
  console.log('='.repeat(50));
  
  const results = [];
  
  for (let i = 0; i < testTeams.length; i++) {
    const team = testTeams[i];
    console.log(`\n[${i + 1}/${testTeams.length}] Testing ${team}...`);
    const result = await testTeam(team);
    results.push(result);
    // Small delay to avoid overwhelming the server - reduced for faster testing
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📊 Summary');
  console.log('='.repeat(50));
  
  const successful = results.filter(r => r.status === 'success');
  const withGames = results.filter(r => r.games > 0);
  const totalGames = results.reduce((sum, r) => sum + r.games, 0);
  
  console.log(`Teams tested: ${results.length}`);
  console.log(`Successful API calls: ${successful.length}`);
  console.log(`Teams with games: ${withGames.length}`);
  console.log(`Total games found: ${totalGames}`);
  
  if (withGames.length > 0) {
    console.log('\n🎯 Teams with schedules:');
    withGames.forEach(team => {
      console.log(`   ${team.team}: ${team.games} games`);
    });
  }
  
  const errors = results.filter(r => r.status === 'error');
  if (errors.length > 0) {
    console.log('\n⚠️  Errors:');
    errors.forEach(team => {
      console.log(`   ${team.team}: ${team.error}`);
    });
  }
  
  console.log('\n✨ Test complete!');
}

runTests().catch(console.error);
