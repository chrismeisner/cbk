require('dotenv').config();
const axios = require('axios');
const Airtable = require('airtable');

// Airtable configuration
const {
	AIRTABLE_BASE_ID,
	AIRTABLE_PERSONAL_ACCESS_TOKEN,
	AIRTABLE_TABLE_NAME = "DefaultTableName",
	DAY_OFFSET = "0"
} = process.env;

const NBA_API_URL = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard';

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
	const headlines = event.competitions[0].headlines;
	const homeRecord = homeTeam && homeTeam.records ? homeTeam.records.find(r => r.type === 'home')?.summary : "";
	const awayRecord = awayTeam && awayTeam.records ? awayTeam.records.find(r => r.type === 'road')?.summary : "";
	const shortLinkText = headlines && headlines.length > 0 ? headlines[0].shortLinkText : "";

	// Extract city and state from the venue's address
	const eventVenue = event.competitions[0].venue;
	const eventCity = eventVenue && eventVenue.address ? eventVenue.address.city : "";
	const eventState = eventVenue && eventVenue.address ? eventVenue.address.state : "";

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
		'Home Record': homeTeam.homeAway === 'home' ? homeRecord : awayRecord,
		'Clock': clock,
		'Event City': eventCity,
		'Headline': shortLinkText, // Add the shortLinkText as the Headline		
		'Event State': eventState
		
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
		'Away Record': awayTeam.homeAway === 'away' ? awayRecord : homeRecord,
		'Clock': clock,
		'Event City': eventCity,
		'Headline': shortLinkText, // Add the shortLinkText as the Headline
		'Event State': eventState
	  });
	}
  });

  return records;
}

async function findMostRecentRecordForTeam(teamName, currentEventID, currentEventTime) {
	try {
		const records = await table.select({
			maxRecords: 1,
			sort: [{field: "Event Time", direction: "desc"}],
			filterByFormula: `AND({Team Name} = "${teamName}", {Event Time} < "${currentEventTime}", NOT({Event ID} = "${currentEventID}"))`
		}).firstPage();

		return records.length > 0 ? records[0].id : null;
	} catch (err) {
		console.error(`Error finding most recent record for team ${teamName}:`, err);
		return null;
	}
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
		// Fetch team record ID and event record ID (or create it if doesn't exist)
		const teamRecordID = await getTeamRecordID(record['Team Name']);
		const eventRecordID = await getOrCreateEventRecordID(record['Event ID']);

		if (teamRecordID) {
			record['Team'] = [teamRecordID]; // Linking to the "Teams" table
		}
		if (eventRecordID) {
			record['Event'] = [eventRecordID]; // Linking to the "Events" table

			// Determine whether the team is home or away and update the corresponding link in the Events table
			let updateFields = {};
			if (record['Home Away'] === 'Home') {
				updateFields['Home Team Link'] = [teamRecordID];
			} else if (record['Home Away'] === 'Away') {
				updateFields['Away Team Link'] = [teamRecordID];
			}

			// Update the Events table
			if (Object.keys(updateFields).length > 0) {
				await base('Events').update([{ "id": eventRecordID, "fields": updateFields }]);
			}
		}

		const currentEventID = record['Event ID']; 
		const currentEventTime = record['Event Time']; // Ensure this is the correct format
		const mostRecentRecordID = await findMostRecentRecordForTeam(record['Team Name'], currentEventID, currentEventTime);
		
		if (mostRecentRecordID) {
			record['Previous'] = [mostRecentRecordID]; // Linking to the most recent record
		}

		// Check if the event already exists in the Airtable
		const existingRecordID = await getExistingRecordID(record['Event ID'], record['Home Away']);
		let fieldsToUpdate = { ...record };

		// Remove fields that are undefined or empty strings
		Object.keys(fieldsToUpdate).forEach(key => {
			if (fieldsToUpdate[key] === "" || fieldsToUpdate[key] === undefined) {
				delete fieldsToUpdate[key];
			}
		});

		// Update or create the record in the Airtable
		if (existingRecordID) {
			await table.update([{ "id": existingRecordID, "fields": fieldsToUpdate }]);
		} else {
			await table.create([{ "fields": fieldsToUpdate }]);
		}
	} catch (error) {
		console.error(`Error in upsertRecord: ${error}`);
		// Handle the error as needed
	}
}

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

async function getOrCreateEventRecordID(eventID) {
	try {
		const records = await base('Events').select({
			maxRecords: 1,
			filterByFormula: `{Event ID} = "${eventID}"`
		}).firstPage();

		// If the event already exists, return its ID
		if (records.length > 0) {
			return records[0].id;
		} else {
			// If the event does not exist, create it
			const createdRecord = await base('Events').create([{ fields: { 'Event ID': eventID } }]);
			return createdRecord[0].id;
		}
	} catch (err) {
		console.error(`Error handling Event record for Event ID: ${eventID}`, err);
		return null;
	}
}

async function getTeamRecordID(teamName) {
	try {
		const records = await base('Teams').select({
			maxRecords: 1,
			filterByFormula: `{Team Name} = "${teamName}"`
		}).firstPage();

		return records.length > 0 ? records[0].id : null;
	} catch (err) {
		console.error(`Error fetching Team record ID for Team Name: ${teamName}`, err);
		return null;
	}
}

function getDateForKey(key, days = -10) {
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

async function updateRank() {
	const table = base('Teams');
	try {
		// Step 1: Copy current Rank to Rank Yesterday
		let updatePromises = [];
		const recordsToUpdate = await table.select({
			filterByFormula: `{League} = 'NBA'`,
			fields: ["Rank"] // Fetch only the Rank field
		}).all();

		recordsToUpdate.forEach(record => {
			updatePromises.push(
				table.update(record.id, {
					"Rank Yesterday": record.get("Rank")
				})
			);
		});

		// Wait for all updates to finish
		await Promise.all(updatePromises);
		console.log('Rank to Rank Yesterday copy completed.');

		// Step 2: Fetch records sorted by ATS AVG where League is NBA and update Rank
		const records = await table.select({
			filterByFormula: `{League} = 'NBA'`,
			sort: [{ field: "ATS AVG", direction: "desc" }],
			fields: ["ATS AVG"] // Include only necessary fields
		}).all();

		// Update each record with its new rank
		for (let i = 0; i < records.length; i++) {
			const record = records[i];
			const rank = i + 1;
			console.log(`Updating record ${record.id}, ATS AVG: ${record.get("ATS AVG")}, Rank: ${rank}`);

			await table.update(record.id, {
				"Rank": rank
			});
		}

		console.log('Ranks updated successfully.');
	} catch (error) {
		console.error('Error updating ranks:', error);
	}
}


async function main() {
	console.log('🚀 Starting NBA Airtable Update...');

	try {
		// Process NBA data
		const dayOffset = parseInt(DAY_OFFSET, 10);
		const targetDate = new Date();
		targetDate.setDate(targetDate.getDate() + dayOffset);
		const formattedTargetDate = formatDate(targetDate);

		console.log(`Processing NBA data for date: ${formattedTargetDate}`);
		const nbaData = await fetchNBAData(formattedTargetDate);
		if (nbaData) {
			const records = extractData(nbaData);
			for (const record of records) {
				await upsertRecord(record);
			}
		} else {
			console.log(`No NBA data fetched for date: ${formattedTargetDate}`);
		}

		// Update Ranks in Airtable
		console.log('Updating Team Ranks...');
		await updateRank();
		console.log('Team Ranks updated successfully.');

		console.log('✨ NBA Airtable Update completed successfully!');
	} catch (error) {
		console.error('⚠️ An error occurred during the NBA Airtable Update:', error);
		process.exit(1);
	}
}

main();

