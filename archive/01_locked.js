require('dotenv').config();
const axios = require('axios');
const Airtable = require('airtable');

const {
  AIRTABLE_BASE_ID,
  AIRTABLE_TABLE_NAME,
  AIRTABLE_PERSONAL_ACCESS_TOKEN,
} = process.env;

const API_ENDPOINT = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: AIRTABLE_PERSONAL_ACCESS_TOKEN
});

const base = Airtable.base(AIRTABLE_BASE_ID);

async function fetchGameData() {
	console.log("🔄 Fetching game data...");

	try {
		const response = await axios.get(API_ENDPOINT);
		const data = response.data;

		if (!data.events) {
			console.log("🤷 No game events found!");
			return;
		}

		console.log(`🔍 Found ${data.events.length} game events.`);
		const events = data.events;
		let recordsToCreate = [];

		for (const event of events) {
			if (event.status.type.id === '1' || event.status.type.id === '3') continue;

			const competition = event.competitions && event.competitions[0];
			if (!competition) continue;

			const competitors = competition.competitors;
			const homeTeam = competitors.find(comp => comp.homeAway === 'home');
			const awayTeam = competitors.find(comp => comp.homeAway === 'away');

			if (!homeTeam || !awayTeam) {
				console.log(`⚠️ Missing home or away team data for event ${event.id}`);
				continue;
			}

			const probabilityData = competition.situation && competition.situation.lastPlay && competition.situation.lastPlay.probability;

			if (!probabilityData) {
				console.log(`⚠️ Missing probability data for event ${event.id}`);
			}

			const homeWinPercentage = probabilityData ? probabilityData.homeWinPercentage : null;
			const awayWinPercentage = probabilityData ? probabilityData.awayWinPercentage : null;

			if (homeWinPercentage === null) {
				console.log(`🔍 Event ${event.id} - Home Win Percentage is missing. Raw probability data:`, probabilityData);
			}

			if (awayWinPercentage === null) {
				console.log(`🔍 Event ${event.id} - Away Win Percentage is missing. Raw probability data:`, probabilityData);
			}

			let recordData = {
				"Event ID": event.id,
				"Away Team Name": awayTeam.team.displayName,
				"Home Team Name": homeTeam.team.displayName,
				"Away Team Score": awayTeam.score,
				"Home Team Score": homeTeam.score,
				"Status ID": event.status.type.id,
				"Period Value": event.status.period,
				"Clock Value": event.status.displayClock,
				"Home Win Percentage": homeWinPercentage,
				"Away Win Percentage": awayWinPercentage
			};

			recordsToCreate.push({ "fields": recordData });
		}

		if (recordsToCreate.length > 0) {
			try {
				console.log(`🖊️ Saving ${recordsToCreate.length} records to Airtable...`);
				const records = await base(AIRTABLE_TABLE_NAME).create(recordsToCreate);
				console.log(`✅ Saved ${records.length} records to Airtable.`);
			} catch (err) {
				console.error('❌ Error saving to Airtable:', err);
			}
		} else {
			console.log("🚫 No records to save to Airtable.");
		}

		console.log("🏁 Finished processing game data.");
	} catch (error) {
		console.error('❌ Error fetching game data:', error);
	}
}

// Fetch game data every 10 minutes
setInterval(fetchGameData, 10 * 60 * 1000);

// Fetch immediately on startup
console.log("🚀 Script started. Fetching game data...");
fetchGameData();
