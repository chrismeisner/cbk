require('dotenv').config();
const axios = require('axios');
const Airtable = require('airtable');

// Load values from .env and set defaults
const {
	AIRTABLE_BASE_ID,
	AIRTABLE_PERSONAL_ACCESS_TOKEN,
	AIRTABLE_TABLE_NAME = "DefaultTableName",
	DAY_OFFSET = "-2" // This will be the new environment variable to set the day offset
} = process.env;


const NBA_API_URL = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard';

// Configure Airtable
Airtable.configure({
	endpointUrl: 'https://api.airtable.com',
	apiKey: AIRTABLE_PERSONAL_ACCESS_TOKEN
});
const base = Airtable.base(AIRTABLE_BASE_ID);
const table = base(AIRTABLE_TABLE_NAME);

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
	const period = event.status.period;
	const clock = event.status.displayClock;

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
		'Opponent Logo': awayTeam ? [{ url: awayTeam.team.logo }] : [],
		'Odds': odds ? odds.details : "",
		'Broadcast': broadcastText,
		'Status ID': event.status && event.status.type && event.status.type.id ? event.status.type.id : "",
		'League': 'NBA',
		'Event Time': event.date,
		'Opponent Score NBA': parsedAwayTeamScore,
		'Team Record': homeTeamRecord,
		'Period': period,
		'Clock': clock
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
		'Opponent Logo': homeTeam ? [{ url: homeTeam.team.logo }] : [],
		'Odds': odds ? odds.details : "",
		'Broadcast': broadcastText,
		'Status ID': event.status && event.status.type && event.status.type.id ? event.status.type.id : "",
		'League': 'NBA',
		'Event Time': event.date,
		'Opponent Score NBA': parsedHomeTeamScore,
		'Team Record': awayTeamRecord,
		'Period': period,
		'Clock': clock
	  });
	}
  });

  return records;
}

async function getExistingRecordID(eventID, homeAway) {
  console.log(`🔎 Checking if Event ID: ${eventID} (${homeAway}) exists in Airtable...`);
  try {
	const records = await table.select({
	  maxRecords: 1,
	  filterByFormula: `AND({Event ID} = "${eventID}", {Home Away} = "${homeAway}")`
	}).firstPage();

	if (records.length > 0) {
	  return records[0].id;
	} else {
	  return null;
	}
  } catch (err) {
	console.error(`❌ Error checking for existing record:`, err);
	throw err; // Rethrow the error to be handled by the caller
  }
}

async function upsertRecord(record) {
  try {
	const existingRecordID = await getExistingRecordID(record['Event ID'], record['Home Away']);
	let fieldsToUpdate = { ...record };

	// Check each field for undefined or empty string before updating
	Object.keys(fieldsToUpdate).forEach(key => {
	  if (fieldsToUpdate[key] === "" || fieldsToUpdate[key] === undefined) {
		delete fieldsToUpdate[key];
	  }
	});

	if (record['Status ID'] === "3") {
	  delete fieldsToUpdate.Odds; // Remove Odds if the event status is "3"
	}

	if (existingRecordID) {
	  console.log(`🔄 Updating record for Event: ${record['Event ID']} | Teams: ${record['Team Name']} vs ${record['Opponent Team Name']}`);
	  await table.update([{ "id": existingRecordID, "fields": fieldsToUpdate }]);
	  console.log(`✅ Record for Event ID: ${record['Event ID']} updated successfully.`);
	} else {
	  console.log(`➕ Creating new record for Event: ${record['Event ID']} | Teams: ${record['Team Name']} vs ${record['Opponent Team Name']} | Event Time: ${record['Event Time']}`);
	  await table.create([{ "fields": fieldsToUpdate }]);
	  console.log(`🎉 New record for Event ID: ${record['Event ID']} created successfully.`);
	}
  } catch (error) {
	console.error(`❌ Error in upsertRecord for Event ID: ${record['Event ID']} | Teams: ${record['Team Name']} vs ${record['Opponent Team Name']}:`, error);
	// Handle the error, e.g., retry the operation, log it, etc.
  }
}

// The rest of your script remains unchanged.


async function processDateRange(fetchDates) {
	for (const date of fetchDates) {
		const nbaData = await fetchNBAData(date);
		if (nbaData) {
			const records = extractData(nbaData);
			for (const record of records) {
				await upsertRecord(record);
			}
		} else {
			console.log(`No NBA data fetched for date: ${date}`);
		}
	}
}

function getDateForKey(key, days = 0) {
	const now = new Date();
	switch (key) {
		case 'yesterday':
			now.setDate(now.getDate() - 1);
			break;
		case 'tomorrow':
			now.setDate(now.getDate() + 1);
			break;
		case 'daysBack':
			now.setDate(now.getDate() - days);
			break;
		case 'daysAhead':
			now.setDate(now.getDate() + days); // New case for days ahead
			break;
		case 'today':
		default:
			break;
	}
	return now.toISOString().split('T')[0].replace(/-/g, '');
}

function formatDate(date) {
	return date.toISOString().split('T')[0].replace(/-/g, '');
}

async function main() {
	console.log('🚀 Starting NBA Airtable Update...');

	try {
		// Convert DAY_OFFSET to an integer
		const dayOffset = parseInt(DAY_OFFSET, 10);

		// Initialize the datesToProcess array
		const datesToProcess = [];

		// If DAY_OFFSET is 0, process today's date
		if (dayOffset === 0) {
			const todayDate = new Date();
			datesToProcess.push(formatDate(todayDate));
		} else {
			// For negative DAY_OFFSET, process dates going back
			for (let i = 0; i < Math.abs(dayOffset); i++) {
				const targetDate = new Date();
				targetDate.setDate(targetDate.getDate() - i);
				datesToProcess.push(formatDate(targetDate));
			}
		}

		// Process the calculated dates
		await processDateRange(datesToProcess);

		console.log('✨ NBA Airtable Update completed successfully!');
	} catch (error) {
		console.error('⚠️ An error occurred during the NBA Airtable Update:', error);
		process.exit(1); // Exit with a non-zero status code to indicate an error
	}
}

main();
