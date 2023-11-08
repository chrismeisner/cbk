require('dotenv').config();
const axios = require('axios');
const Airtable = require('airtable');

// Load values from .env
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME;
const AIRTABLE_PERSONAL_ACCESS_TOKEN = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN;
const NFL_API_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

// Configure Airtable
Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: AIRTABLE_PERSONAL_ACCESS_TOKEN
});
const base = Airtable.base(AIRTABLE_BASE_ID);
const table = base(AIRTABLE_TABLE_NAME);

// Fetch NFL data
async function fetchNFLData() {
    try {
        const response = await axios.get(NFL_API_URL);
        return response.data;
    } catch (error) {
        console.error('Error fetching NFL data:', error);
    }
}

// Extract Data for NFL
function extractData(data) {
    const events = data['events'];
    return events.map(event => {
        const homeTeamCompetitor = event.competitions[0].competitors.find(team => team.homeAway === 'home');
        const awayTeamCompetitor = event.competitions[0].competitors.find(team => team.homeAway === 'away');
        
        const homeTeam = homeTeamCompetitor.team;
        const awayTeam = awayTeamCompetitor.team;

        const broadcasts = event.competitions[0].broadcasts;
        const broadcastNames = broadcasts.flatMap(b => b.names);

        const oddsArray = event.competitions[0].odds || [];
        const odds = oddsArray.length > 0 ? oddsArray[0] : {};

        return {
            'Event ID': event.id,
            'Event Time': event.date,
            'Home Team Name': homeTeam.displayName,
            'Away Team Name': awayTeam.displayName,
            'Home Team Score': homeTeamCompetitor.score || "0",
            'Away Team Score': awayTeamCompetitor.score || "0",
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

// Fetch Existing Event IDs
async function fetchExistingEventIDs(eventIDs) {
    let existingRecords = {};
    try {
        const records = await table.select({
            filterByFormula: `OR(${eventIDs.map(id => `{Event ID} = '${id}'`).join(',')})`
        }).firstPage();

        records.forEach(record => {
            existingRecords[record.get('Event ID')] = record.getId();
        });
    } catch (err) {
        console.error('Error fetching existing records:', err);
    }
    return existingRecords;
}

// Send data to Airtable
async function sendDataToAirtable(data) {
    const eventIDs = data.map(record => record['Event ID']);
    const existingRecords = await fetchExistingEventIDs(eventIDs);

    for (const record of data) {
        const airtableRecord = { fields: record };
        if (existingRecords[record['Event ID']]) {
            // Update existing record
            try {
                await table.update(existingRecords[record['Event ID']], airtableRecord);
                console.log(`Updated record for Event ID: ${record['Event ID']}`);
            } catch (err) {
                console.error(`Error updating record for Event ID ${record['Event ID']}:`, err);
            }
        } else {
            // Create new record
            try {
                await table.create([airtableRecord]); // Pass an array for creation
                console.log(`Created new record for Event ID: ${record['Event ID']}`);
            } catch (err) {
                console.error(`Error creating new record for Event ID ${record['Event ID']}:`, err);
            }
        }
    }
}

// Main function
async function main() {
    const nflData = await fetchNFLData();
    const formattedData = extractData(nflData);
    await sendDataToAirtable(formattedData);
}

main();
