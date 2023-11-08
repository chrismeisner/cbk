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

// Fetch NBA data for a specific date
async function fetchNBAData(date) {
	try {
		console.log(`🔍 Fetching NBA data for date: ${date}...`);
		const response = await axios.get(`${NBA_API_URL}?dates=${date}`);
		console.log(`🏀 NBA data for ${date} fetched successfully!`);
		return response.data;
	} catch (error) {
		console.error(`❌ Error fetching NBA data for ${date}:`, error);
	}
}

// Extract Data
function extractData(nbaData) {
	console.log('🔧 Extracting relevant event data...');
	const events = nbaData['events'];
	console.log(`📋 Found ${events.length} events!`);
	return events.map(event => {
		let eventObj = {
			'Event ID': event.id,
			'Event Time': event.date,
			'League': 'NBA', // Manually adding the League field
		};

		const homeTeam = event.competitions[0].competitors.find(team => team.homeAway === 'home');
		const awayTeam = event.competitions[0].competitors.find(team => team.homeAway === 'away');
		const odds = (event.competitions[0].odds && event.competitions[0].odds.length > 0) ? event.competitions[0].odds[0] : null;

		if (homeTeam) {
			eventObj['Home Team Name'] = homeTeam.team.displayName;
			eventObj['Home Team Logo'] = homeTeam.team.logo;
			eventObj['Home Team Abbreviation'] = homeTeam.team.abbreviation;
			eventObj['Home Team Score'] = homeTeam.score || "";
		}

		if (awayTeam) {
			eventObj['Away Team Name'] = awayTeam.team.displayName;
			eventObj['Away Team Logo'] = awayTeam.team.logo;
			eventObj['Away Team Abbreviation'] = awayTeam.team.abbreviation;
			eventObj['Away Team Score'] = awayTeam.score || "";
		}

		if (odds && odds.details) {
			eventObj['Odds'] = odds.details;
		}

		if (event.status && event.status.type && event.status.type.id) {
			eventObj['Status ID'] = event.status.type.id;
		}

		const broadcasts = event.competitions[0].broadcasts;
		if (broadcasts && broadcasts.length > 0) {
			const broadcastNames = broadcasts.flatMap(b => b.names);
			eventObj['Broadcast'] = broadcastNames.join(", ");
		}

		return eventObj;
	});
}


// Check if Event ID already exists
async function getExistingRecordID(eventID) {
	console.log(`🔎 Checking if Event ID: ${eventID} exists in Airtable...`);
	return new Promise((resolve, reject) => {
		table.select({
			maxRecords: 1,
			filterByFormula: `{Event ID} = "${eventID}"`
		}).firstPage((err, records) => {
			if (err) {
				reject(err);
				return;
			}
			if (records.length > 0) {
				resolve(records[0].id);
			} else {
				resolve(null);
			}
		});
	});
}

// Send data to Airtable
async function sendDataToAirtable(data) {
	for (const record of data) {
		const existingRecordID = await getExistingRecordID(record['Event ID']);
		if (existingRecordID) {
			console.log(`🔄 Updating record with Event ID: ${record['Event ID']} in Airtable...`);
			table.update([{
				"id": existingRecordID,
				"fields": record
			}], (err, records) => {
				if (err) {
					console.error(err);
					return;
				}
				console.log(`✅ Record with Event ID: ${record['Event ID']} updated successfully!`);
			});
		} else {
			console.log(`➕ Creating new record with Event ID: ${record['Event ID']} in Airtable...`);
			table.create([{ "fields": record }], (err, records) => {
				if (err) {
					console.error(err);
					return;
				}
				console.log(`🎉 New record with Event ID: ${record['Event ID']} created successfully!`);
			});
		}
	}
}

// Helper function to get the date key (yesterday, today, tomorrow)
function getDateForKey(key) {
	const now = new Date();
	switch (key) {
		case 'yesterday':
			now.setDate(now.getDate() - 1);
			break;
		case 'tomorrow':
			now.setDate(now.getDate() + 1);
			break;
		case 'today':
		default:
			break;
	}
	return now.toISOString().split('T')[0].replace(/-/g, '');
}

// Main function
async function main() {
	console.log('🚀 Starting the NBA data fetch and update process...');

	const NUM_DAYS_BACK = 2; // Number of days back you want to go
	let datesToCheck = [];

	for (let i = NUM_DAYS_BACK; i >= 0; i--) {
		let d = new Date();
		d.setDate(d.getDate() - i);
		datesToCheck.push(d.toISOString().split('T')[0].replace(/-/g, ''));
	}

	for (const date of datesToCheck) {
		const nbaData = await fetchNBAData(date);
		if (nbaData && nbaData.events) {
			const formattedData = extractData(nbaData);
			await sendDataToAirtable(formattedData);
		}
	}

	console.log('🎊 All done! Process completed. 🥳');
}

main();
