require('dotenv').config();
const axios = require('axios');
const Airtable = require('airtable');

const {
  AIRTABLE_BASE_ID,
  AIRTABLE_PERSONAL_ACCESS_TOKEN,
  AIRTABLE_TABLE_NAME = "DefaultTableName"
} = process.env;

const NBA_API_URL = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard';

// Configure Airtable
Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: AIRTABLE_PERSONAL_ACCESS_TOKEN
});
const base = Airtable.base(AIRTABLE_BASE_ID);
const table = base(AIRTABLE_TABLE_NAME);
const eventsTable = base('Events'); // Add reference to the "Events" table
const teamsTable = base('Teams'); // Reference to the "Teams" table


async function fetchNBAData(date) {
  try {
	console.log(`🔍 Fetching NBA data for date: ${date}...`);
	const response = await axios.get(`${NBA_API_URL}?dates=${date}`);
	console.log(`🏀 NBA data for ${date} fetched successfully!`);
	return response.data;
  } catch (error) {
	console.error(`❌ Error fetching NBA data for ${date}:`, error);
	throw error;
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

async function updateEventsFromBetaTable() {
  try {
	const betaRecords = await table.select({
	  fields: ['Event ID', 'Team Name', 'Home Away']
	}).all();

	for (const record of betaRecords) {
	  const { 'Event ID': eventId, 'Team Name': teamName, 'Home Away': homeAway } = record.fields;
	  if (!eventId || !teamName || !homeAway) continue;

	  // Find the team record in the "Teams" table based on the team name
	  const [teamRecord] = await teamsTable.select({
		maxRecords: 1,
		filterByFormula: `{Team Name} = "${teamName}"`
	  }).firstPage();

	  if (teamRecord) {
		const teamRecordId = teamRecord.id;
		const fieldToUpdate = homeAway === 'Home' ? 'Home Team Link' : 'Away Team Link';

		// Find the matching event record in the "Events" table
		const [eventRecord] = await eventsTable.select({
		  maxRecords: 1,
		  filterByFormula: `{Event ID} = "${eventId}"`
		}).firstPage();

		if (eventRecord) {
		  const updateFields = {};
		  updateFields[fieldToUpdate] = [teamRecordId]; // Link to the team record

		  await eventsTable.update([{ id: eventRecord.id, fields: updateFields }]);
		  console.log(`Updated Event ID: ${eventId} with ${fieldToUpdate}: ${teamName} (Link)`);
		}
	  } else {
		console.log(`Team "${teamName}" not found in the "Teams" table.`);
	  }
	}
  } catch (error) {
	console.error(`Error updating the "Events" table with team links:`, error);
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

async function upsertRecord(record, eventRecordIds) {
  try {
	const existingRecordID = await getExistingRecordID(record['Event ID'], record['Home Away']);
	let fieldsToUpdate = { ...record };

	// Check each field for undefined or empty string before updating
	Object.keys(fieldsToUpdate).forEach(key => {
	  if (fieldsToUpdate[key] === "" || fieldsToUpdate[key] === undefined) {
		delete fieldsToUpdate[key];
	  }
	});


	// Link to the "Events" table using Event ID
	const eventId = record['Event ID'];
	if (eventId && eventRecordIds[eventId]) {
	  fieldsToUpdate['Event'] = [eventRecordIds[eventId]]; // Link to the corresponding event record
	}

	// Update or create record in the "01 Beta" table
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

function formatDate(date) {
  return date.toISOString().split('T')[0].replace(/-/g, '');
}

async function createEventsRecordIfNotExists(eventsData) {
  try {
	const eventIds = eventsData.map(event => event.id);
	const existingEventIds = await fetchEventRecordIds(eventIds);

	const newEvents = eventsData.filter(event => !existingEventIds[event.id]);

	if (newEvents.length === 0) {
	  console.log('✅ No new events to create in the "Events" table.');
	  return;
	}

	let eventRecords = newEvents.map(event => {
	  return {
		'fields': {
		  'Event ID': event.id,
		  'Event Time': event.date,
		  'Status ID': event.status && event.status.type && event.status.type.id ? event.status.type.id : "", // Add the Status ID field
		}
	  };
	});

	console.log(`➕ Creating new records in the "Events" table...`);
	await eventsTable.create(eventRecords);
	console.log(`🎉 New records in the "Events" table created successfully.`);
  } catch (error) {
	console.error(`❌ Error creating records in the "Events" table:`, error);
  }
}

async function fetchEventRecordIds(eventIds) {
  try {
	let recordIds = {};
	const records = await eventsTable.select({
	  filterByFormula: `OR(${eventIds.map(id => `{Event ID} = "${id}"`).join(", ")})`
	}).all();

	records.forEach(record => {
	  recordIds[record.fields['Event ID']] = record.id;
	});

	return recordIds;
  } catch (error) {
	console.error(`❌ Error fetching records from the "Events" table:`, error);
  }
}

async function updateTeamNextLastEvents(teamName, eventRecordIdNext, eventRecordIdLast) {
  try {
	// Fetch the record in the "Teams" table with the given teamName
	const teamRecords = await teamsTable.select({
	  filterByFormula: `{Team Name} = "${teamName}"`
	}).firstPage();

	if (teamRecords.length > 0) {
	  // Update the "Next Event" and "Last Event" fields if you have valid record IDs
	  const teamRecord = teamRecords[0];
	  const updateFields = {};

	  if (eventRecordIdNext) {
		updateFields["Next Event"] = [eventRecordIdNext];
	  }

	  if (eventRecordIdLast) {
		updateFields["Last Event"] = [eventRecordIdLast];
	  }

	  // Update the record in the "Teams" table
	  await teamsTable.update([{ id: teamRecord.id, fields: updateFields }]);
	  console.log(`✅ "Next Event" and "Last Event" updated for Team: ${teamName}`);
	} else {
	  console.log(`❌ Team "${teamName}" not found in the "Teams" table.`);
	}
  } catch (error) {
	console.error(`❌ Error updating "Next Event" and "Last Event" for Team: ${teamName}:`, error);
  }
}

async function main() {
  console.log('🚀 Starting NBA Airtable Update...');

  try {
	// Fetch NBA data for the current date
	const nbaData = await fetchNBAData(formatDate(new Date()));

	if (nbaData && nbaData.events) {
	  // Create new records in the "Events" table if they don't exist
	  await createEventsRecordIfNotExists(nbaData.events);

	  // Fetch the event record IDs from the "Events" table
	  const eventIds = nbaData.events.map(event => event.id);
	  const eventRecordIds = await fetchEventRecordIds(eventIds);

	  // Extract data from the NBA data and process each record
	  const records = extractData(nbaData);
	  for (const record of records) {
		const eventID = record['Event ID'];
		if (!eventRecordIds[eventID]) {
		  console.log(`❌ Event ID ${eventID} does not exist in the "Events" table.`);
		  continue;
		}

		try {
		  // Update "Status ID" in the "Events" table
		  const eventStatusID = record['Status ID'];
		  if (eventStatusID) {
			await eventsTable.update([{ "id": eventRecordIds[eventID], "fields": { "Status ID": eventStatusID } }]);
		  }

		  // Upsert record in "01 Beta" table
		  await upsertRecord(record, eventRecordIds);
		  console.log(`✅ Record for Event ID: ${eventID} updated successfully.`);
		} catch (upsertError) {
		  console.error(`❌ Error updating record for Event ID: ${eventID}:`, upsertError);
		}
	  }
	}

	// Update the "Events" table based on "Home Away" data from the "01 Beta" table
	await updateEventsFromBetaTable();

	console.log('✨ NBA Airtable Update including "Events" table completed successfully!');
  } catch (error) {
	console.error('⚠️ An error occurred during the NBA Airtable Update:', error);
	process.exit(1);
  }
}

main();
