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

// Fetch NBA data
async function fetchNBAData() {
    try {
        const response = await axios.get(NFL_API_URL);
        return response.data;
    } catch (error) {
        console.error('Error fetching NBA data:', error);
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
            'Home Team Score': homeTeamCompetitor.score || "0",  // Adjusted this line
            'Away Team Score': awayTeamCompetitor.score || "0",  // Adjusted this line
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


// Send data to Airtable in chunks
function sendDataToAirtable(data) {
    const chunkSize = 10;
    for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        const airtableData = chunk.map(record => ({ "fields": record }));
        table.create(airtableData, (err, records) => {
            if (err) {
                console.error(err);
                return;
            }
            console.log(records.length + ' records created in Airtable.');
        });
    }
}

// Main function
async function main() {
    const nbaData = await fetchNBAData();
    const formattedData = extractData(nbaData);
    sendDataToAirtable(formattedData);
}

main();
