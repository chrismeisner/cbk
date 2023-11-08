
require('dotenv').config();
const axios = require('axios');
const Airtable = require('airtable');

// Load values from .env
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME;
const AIRTABLE_PERSONAL_ACCESS_TOKEN = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN;
const NBA_API_URL = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard';

// Configure Airtable
Airtable.configure({
	endpointUrl: 'https://api.airtable.com',
	apiKey: AIRTABLE_PERSONAL_ACCESS_TOKEN
});
const base = Airtable.base(AIRTABLE_BASE_ID);
const table = base(AIRTABLE_TABLE_NAME);

// Fetch NBA data
async function fetchNBAData() {
	try {
		const response = await axios.get(NBA_API_URL);
		return response.data;
	} catch (error) {
		console.error('Error fetching NBA data:', error);
	}
}

// Extract Data
function extractData(nbaData) {
	const events = nbaData['events'];
	return events.map(event => {
		const homeTeam = event.competitions[0].competitors.find(team => team.homeAway === 'home').team;
		const awayTeam = event.competitions[0].competitors.find(team => team.homeAway === 'away').team;

		const broadcasts = event.competitions[0].broadcasts;
		const broadcastNames = broadcasts.flatMap(b => b.names);

		const odds = event.competitions[0].odds[0] || {};

		return {
			'Event ID': event.id,
			'Event Time': event.date,
			'Home Team Name': homeTeam.displayName,
			'Away Team Name': awayTeam.displayName,
			'Status ID': event.status.type.id,
			'Broadcast': broadcastNames.join(", "),
			'Home Team Logo': homeTeam.logo,
			'Away Team Logo': awayTeam.logo,
			'Home Team Abbreviation': homeTeam.abbreviation,
			'Away Team Abbreviation': awayTeam.abbreviation,
			'Odds': odds.details || ""
		};
	});
}

// Send data to Airtable
function sendDataToAirtable(data) {
	const airtableData = data.map(record => ({ "fields": record }));
	table.create(airtableData, (err, records) => {
		if (err) {
			console.error(err);
			return;
		}
		console.log(records.length + ' records created in Airtable.');
	});
}

// Main function
async function main() {
	const nbaData = await fetchNBAData();
	const formattedData = extractData(nbaData);
	sendDataToAirtable(formattedData);
}

main();
