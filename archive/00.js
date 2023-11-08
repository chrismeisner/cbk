require('dotenv').config();
const axios = require('axios');
const Airtable = require('airtable');

// Load values from .env
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME;
const AIRTABLE_PERSONAL_ACCESS_TOKEN = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN;
const NBA_API_URL = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard';
const NFL_API_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

// Configure Airtable
Airtable.configure({
	endpointUrl: 'https://api.airtable.com',
	apiKey: AIRTABLE_PERSONAL_ACCESS_TOKEN
});
const base = Airtable.base(AIRTABLE_BASE_ID);
const table = base(AIRTABLE_TABLE_NAME);

// Function to get date string for 'yesterday', 'today', 'tomorrow'
function getDateForKey(key) {
	const date = new Date();
	if (key === 'yesterday') date.setDate(date.getDate() - 1);
	else if (key === 'tomorrow') date.setDate(date.getDate() + 1);

	console.log(`📆 Calculated date for ${key}: ${date.toISOString().split('T')[0]}`);
	return date.toISOString().split('T')[0].replace(/-/g, '');
}

// Fetch NBA data for a specific date
async function fetchNBAData(date) {
	try {
		console.log(`🔍 Fetching NBA data for date: ${date}...`);
		const response = await axios.get(`${NBA_API_URL}?dates=${date}`);
		console.log(`🏀 NBA data for ${date} fetched successfully with ${response.data.events.length} events.`);
		return response.data;
	} catch (error) {
		console.error(`❌ Error fetching NBA data for ${date}:`, error);
		throw error; // Re-throw the error to be caught in the calling function
	}
}

// Extract NBA Data
function extractData(nbaData) {
	console.log('🔧 Extracting relevant NBA event data...');
	const events = nbaData['events'];
	console.log(`📋 Found ${events.length} NBA events! Processing...`);
	
	return events.map(event => {
		let eventObj = {
			'Event ID': event.id,
			'Event Time': event.date,
			'League': 'NBA'
		};
		console.log(`🏀 Processing NBA Event: ${event.id}`);
		// Example: Logging team names
		if (event.competitions && event.competitions.length > 0) {
			const competition = event.competitions[0];
			const homeTeam = competition.competitors.find(team => team.homeAway === 'home');
			const awayTeam = competition.competitors.find(team => team.homeAway === 'away');
			if (homeTeam && awayTeam) {
				console.log(`🏀 NBA Event ${event.id}: ${homeTeam.team.displayName} vs ${awayTeam.team.displayName}`);
			}
		}
		// Add other NBA-specific data extraction logic here...
		return eventObj;
	});
}

// Fetch NFL data for a specific date
async function fetchNFLData(date) {
	try {
		console.log(`🔍 Fetching NFL data for date: ${date}...`);
		const response = await axios.get(`${NFL_API_URL}?dates=${date}`);
		console.log(`🏈 NFL data for ${date} fetched successfully with ${response.data.events.length} events.`);
		return response.data;
	} catch (error) {
		console.error(`❌ Error fetching NFL data for ${date}:`, error);
		throw error; // Re-throw the error to be caught in the calling function
	}
}

// Extract NFL Data
function extractNFLData(nflData) {
	console.log('🔧 Extracting relevant NFL event data...');
	const events = nflData['events'];
	console.log(`📋 Found ${events.length} NFL events! Processing...`);
	
	return events.map(event => {
		let eventObj = {
			'Event ID': event.id,
			'Event Time': event.date,
			'League': 'NFL'
		};
		console.log(`🏈 Processing NFL Event: ${event.id}`);
		// Example: Logging team names
		if (event.competitions && event.competitions.length > 0) {
			const competition = event.competitions[0];
			const homeTeam = competition.competitors.find(team => team.homeAway === 'home');
			const awayTeam = competition.competitors.find(team => team.homeAway === 'away');
			if (homeTeam && awayTeam) {
				console.log(`🏈 NFL Event ${event.id}: ${homeTeam.team.displayName} vs ${awayTeam.team.displayName}`);
			}
		}
		// Add other NFL-specific data extraction logic here...
		return eventObj;
	});
}

// Example usage
async function main() {
	try {
		let date = getDateForKey('today');
		console.log(`🔍 Starting data fetch for date: ${date}`);

		try {
			let nbaData = await fetchNBAData(date);
			if (nbaData) {
				let extractedNBAData = extractData(nbaData);
				console.log(`🏀 Total NBA events processed: ${extractedNBAData.length}`);
				// Process or save extracted NBA data...
			}
		} catch (nbaError) {
			console.error(`❌ Failed to process NBA data:`, nbaError);
		}

		try {
			let nflData = await fetchNFLData(date);
			if (nflData) {
				let extractedNFLData = extractNFLData(nflData);
				console.log(`🏈 Total NFL events processed: ${extractedNFLData.length}`);
				// Process or save extracted NFL data...
			}
		} catch (nflError) {
			console.error(`❌ Failed to process NFL data:`, nflError);
		}
	} catch (error) {
		console.error(`❌ An error occurred in main function:`, error);
	}
}

main().catch(console.error);
