require('dotenv').config();
const axios = require('axios');
const Airtable = require('airtable');

// Load values from .env
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_PERSONAL_ACCESS_TOKEN = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN;
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || "DefaultTableName"; // Use a default table name if not specified in .env
const NBA_API_URL = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard';

// Configure Airtable
Airtable.configure({
	endpointUrl: 'https://api.airtable.com',
	apiKey: AIRTABLE_PERSONAL_ACCESS_TOKEN
});
const base = Airtable.base(AIRTABLE_BASE_ID);
const table = base(AIRTABLE_TABLE_NAME); // Use the table name from the .env file

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

function extractData(nbaData) {
	console.log('🔧 Extracting relevant event data...');
	const events = nbaData['events'];
	console.log(`📋 Found ${events.length} events!`);
	let records = [];

	events.forEach(event => {
		const competitors = event.competitions[0].competitors;
		const homeTeam = competitors.find(team => team.homeAway === 'home');
		const awayTeam = competitors.find(team => team.homeAway === 'away');
		const odds = (event.competitions[0].odds && event.competitions[0].odds.length > 0) ? event.competitions[0].odds[0] : null;
		const broadcasts = event.competitions[0].broadcasts;
		const broadcastText = broadcasts && broadcasts.length > 0 ? broadcasts.flatMap(b => b.names).join(", ") : "";

		// Parse scores as numbers
		const homeTeamScore = parseInt(homeTeam.score, 10);
		const parsedHomeTeamScore = !isNaN(homeTeamScore) ? homeTeamScore : "";

		const awayTeamScore = parseInt(awayTeam.score, 10);
		const parsedAwayTeamScore = !isNaN(awayTeamScore) ? awayTeamScore : "";

		// Extract team record
		const homeTeamRecord = homeTeam && homeTeam.records && homeTeam.records.length > 0 ? homeTeam.records[0].summary : "";
		const awayTeamRecord = awayTeam && awayTeam.records && awayTeam.records.length > 0 ? awayTeam.records[0].summary : "";

		// For home team
		if (homeTeam) {
			records.push({
				'Event ID': event.id,
				'Team Name': homeTeam.team.displayName,
				'Opponent Team Name': awayTeam ? awayTeam.team.displayName : "",
				'Team Score NBA': parsedHomeTeamScore,
				'Team Abbreviation': homeTeam.team.abbreviation,
				'Team Logo': homeTeam.team.logo,
				'Team Logo PNG': [{ url: homeTeam.team.logo }],
				'Home Away': 'Home',
				'Odds': odds ? odds.details : "",
				'Broadcast': broadcastText,
				'Status ID': event.status && event.status.type && event.status.type.id ? event.status.type.id : "",
				'League': 'NBA',
				'Event Time': event.date,
				'Opponent Score NBA': parsedAwayTeamScore,
				'Team Record': homeTeamRecord // Added Team Record
			});
		}

		// For away team
		if (awayTeam) {
			records.push({
				'Event ID': event.id,
				'Team Name': awayTeam.team.displayName,
				'Opponent Team Name': homeTeam ? homeTeam.team.displayName : "",
				'Team Score NBA': parsedAwayTeamScore,
				'Team Abbreviation': awayTeam.team.abbreviation,
				'Team Logo': awayTeam.team.logo,
				'Team Logo PNG': [{ url: awayTeam.team.logo }],
				'Home Away': 'Away',
				'Odds': odds ? odds.details : "",
				'Broadcast': broadcastText,
				'Status ID': event.status && event.status.type && event.status.type.id ? event.status.type.id : "",
				'League': 'NBA',
				'Event Time': event.date,
				'Opponent Score NBA': parsedHomeTeamScore,
				'Team Record': awayTeamRecord // Added Team Record
			});
		}
	});

	return records;
}


// Check if Event ID with Home/Away already exists
async function getExistingRecordID(eventID, homeAway) {
	console.log(`🔎 Checking if Event ID: ${eventID} (${homeAway}) exists in Airtable...`);
	return new Promise((resolve, reject) => {
		table.select({
			maxRecords: 1,
			filterByFormula: `AND({Event ID} = "${eventID}", {Home Away} = "${homeAway}")`
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
		const existingRecordID = await getExistingRecordID(record['Event ID'], record['Home Away']);
		let fieldsToUpdate = { ...record };

		// Skip updating the Odds field if Status ID is 3
		if (record['Status ID'] === "3") {
			const { Odds, ...rest } = fieldsToUpdate;
			fieldsToUpdate = rest;
		}

		if (existingRecordID) {
			console.log(`🔄 Updating record with Event ID: ${record['Event ID']} for ${record['Home Away']} in Airtable...`);
			table.update([{
				"id": existingRecordID,
				"fields": fieldsToUpdate
			}], (err, records) => {
				if (err) {
					console.error(err);
					return;
				}
				console.log(`✅ Record with Event ID: ${record['Event ID']} for ${record['Home Away']} updated successfully!`);
			});
		} else {
			console.log(`➕ Creating new record with Event ID: ${record['Event ID']} for ${record['Home Away']} in Airtable...`);
			table.create([{ "fields": fieldsToUpdate }], (err, records) => {
				if (err) {
					console.error(err);
					return;
				}
				console.log(`🎉 New record with Event ID: ${record['Event ID']} for ${record['Home Away']} created successfully!`);
			});
		}
	}
}

// Helper function to get the date key (yesterday, today, tomorrow, or days back)
function getDateForKey(key, daysBack = 7) {
	const now = new Date();
	switch (key) {
		case 'yesterday':
			now.setDate(now.getDate() - 1);
			break;
		case 'tomorrow':
			now.setDate(now.getDate() + 1);
			break;
		case 'daysBack':
			now.setDate(now.getDate() - daysBack);
			break;
		case 'today':
		default:
			break;
	}
	return now.toISOString().split('T')[0].replace(/-/g, '');
}

async function main() {
	console.log('🚀 Starting NBA Airtable Update...');
	try {
		const daysBack = process.env.DAYS_BACK || 0; // Fetching the daysBack value from the environment variables

		if (daysBack > 0) {
			console.log(`🔄 Fetching data for ${daysBack} days back...`);
			const dateDaysBack = getDateForKey('daysBack', daysBack);
			const nbaDataDaysBack = await fetchNBAData(dateDaysBack);
			if (!nbaDataDaysBack) throw new Error(`No NBA data fetched for ${daysBack} days back.`);

			const recordsDaysBack = extractData(nbaDataDaysBack);
			await sendDataToAirtable(recordsDaysBack);
		} else {
			// Fetching data for yesterday
			const dateYesterday = getDateForKey('yesterday');
			const nbaDataYesterday = await fetchNBAData(dateYesterday);
			if (!nbaDataYesterday) throw new Error('No NBA data fetched for yesterday.');

			// Fetching data for today
			const dateToday = getDateForKey('today');
			const nbaDataToday = await fetchNBAData(dateToday);
			if (!nbaDataToday) throw new Error('No NBA data fetched for today.');

			// Fetching data for tomorrow
			const dateTomorrow = getDateForKey('tomorrow');
			const nbaDataTomorrow = await fetchNBAData(dateTomorrow);
			if (!nbaDataTomorrow) throw new Error('No NBA data fetched for tomorrow.');

			// Extracting and combining records
			const recordsYesterday = extractData(nbaDataYesterday);
			const recordsToday = extractData(nbaDataToday);
			const recordsTomorrow = extractData(nbaDataTomorrow);

			const combinedRecords = [
				...recordsYesterday, 
				...recordsToday, 
				...recordsTomorrow
			];

			// Sending all combined data to Airtable
			await sendDataToAirtable(combinedRecords);
		}
		console.log('✨ NBA Airtable Update completed successfully!');
	} catch (error) {
		console.error('⚠️ An error occurred during the NBA Airtable Update:', error);
	}
}

main();
