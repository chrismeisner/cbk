require('dotenv').config();
const axios = require('axios');
const Airtable = require('airtable');

// Load values from .env
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_PERSONAL_ACCESS_TOKEN = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN;
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || "DefaultTableName"; // Use a default table name if not specified in .env
const NFL_API_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

// Configure Airtable
Airtable.configure({
	endpointUrl: 'https://api.airtable.com',
	apiKey: AIRTABLE_PERSONAL_ACCESS_TOKEN
});
const base = Airtable.base(AIRTABLE_BASE_ID);
const table = base(AIRTABLE_TABLE_NAME); // Use the table name from the .env file

// Fetch NFL data for a specific date
async function fetchNFLData(date) {
	try {
		console.log(`🔍 Fetching NFL data for date: ${date}...`);
		const response = await axios.get(`${NFL_API_URL}?dates=${date}`);
		console.log(`🏈 NFL data for ${date} fetched successfully!`);
		return response.data;
	} catch (error) {
		console.error(`❌ Error fetching NFL data for ${date}:`, error);
	}
}

// Extract relevant event data from the NFL data
// Extract relevant event data from the NFL data
function extractData(nflData) {
  console.log('🔧 Extracting relevant event data...');
  const events = nflData['events'];
  console.log(`📋 Found ${events.length} events!`);
  let records = [];

  events.forEach(event => {
	const competitors = event.competitions[0].competitors;
	const homeTeam = competitors.find(team => team.homeAway === 'home');
	const awayTeam = competitors.find(team => team.homeAway === 'away');
	const odds = event.competitions[0].odds && event.competitions[0].odds.length > 0 ? event.competitions[0].odds[0].details : "";
	
	// Extracting broadcast names
	const broadcastText = event.competitions[0].broadcasts ? 
	  event.competitions[0].broadcasts.flatMap(broadcast => broadcast.names).join(", ") : "";

	const homeTeamRecord = homeTeam.records.find(record => record.name === 'overall').summary;
	const awayTeamRecord = awayTeam.records.find(record => record.name === 'overall').summary;

	// For home team
	if (homeTeam) {
	  records.push({
		'Event ID': event.id,
		'Team Name': homeTeam.team.displayName,
		'Opponent Team Name': awayTeam.team.displayName,
		'Team Score NFL': homeTeam.score,
		'Team Abbreviation': homeTeam.team.abbreviation,
		'Team Logo': homeTeam.team.logo,
		'Team Logo PNG': [{ url: homeTeam.team.logo }],
		'Home Away': 'Home',
		'Odds': odds,
		'Broadcast': broadcastText,
		'Status ID': event.status.type.id,
		'League': 'NFL',
		'Event Time': event.date,
		'Opponent Score NFL': awayTeam.score,
		'Team Record': homeTeamRecord
	  });
	}

	// For away team
	if (awayTeam) {
	  records.push({
		'Event ID': event.id,
		'Team Name': awayTeam.team.displayName,
		'Opponent Team Name': homeTeam.team.displayName,
		'Team Score NFL': awayTeam.score,
		'Team Abbreviation': awayTeam.team.abbreviation,
		'Team Logo': awayTeam.team.logo,
		'Team Logo PNG': [{ url: awayTeam.team.logo }],
		'Home Away': 'Away',
		'Odds': odds,
		'Broadcast': broadcastText,
		'Status ID': event.status.type.id,
		'League': 'NFL',
		'Event Time': event.date,
		'Opponent Score NFL': homeTeam.score,
		'Team Record': awayTeamRecord
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
function getDateForKey(key, daysBack = 0) {
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

// Helper function to get the date for a number of days in the future
function getDateForFutureDays(daysIntoFuture = 0) {
  const now = new Date();
  now.setDate(now.getDate() + daysIntoFuture);
  return now.toISOString().split('T')[0].replace(/-/g, '');
}

// Main function updated for NFL data fetching to include past days
async function main() {
  console.log('🚀 Starting NFL Airtable Update...');
  try {
	const futureDays = parseInt(process.env.FUTURE_DAYS) || 0; // Number of days in the future
	const pastDays = parseInt(process.env.PAST_DAYS) || 60; // Number of days in the past

	// Fetching data for the specified number of days in the past
	for (let i = 1; i <= pastDays; i++) {
	  const pastDate = getDateForKey('daysBack', i);
	  const nflDataPast = await fetchNFLData(pastDate);
	  if (nflDataPast) {
		const recordsPast = extractData(nflDataPast);
		await sendDataToAirtable(recordsPast);
	  } else {
		console.log(`No NFL data fetched for ${i} days in the past.`);
	  }
	}

	// Fetching data for the specified number of days into the future
	for (let i = 0; i < futureDays; i++) {
	  const futureDate = getDateForFutureDays(i);
	  const nflDataFuture = await fetchNFLData(futureDate);
	  if (nflDataFuture) {
		const recordsFuture = extractData(nflDataFuture);
		await sendDataToAirtable(recordsFuture);
	  } else {
		console.log(`No NFL data fetched for ${i} days into the future.`);
	  }
	}

	console.log('✨ NFL Airtable Update completed successfully!');
  } catch (error) {
	console.error('⚠️ An error occurred during the NFL Airtable Update:', error);
  }
}

main();