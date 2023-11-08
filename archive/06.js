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

// The rest of the code remains unchanged...

// Main function updated for NFL data fetching
async function main() {
	console.log('🚀 Starting NFL Airtable Update...');
	try {
		const daysBack = process.env.DAYS_BACK || 0; // Fetching the daysBack value from the environment variables

		if (daysBack > 0) {
			console.log(`🔄 Fetching data for ${daysBack} days back...`);
			const dateDaysBack = getDateForKey('daysBack', daysBack);
			const nflDataDaysBack = await fetchNFLData(dateDaysBack);
			if (!nflDataDaysBack) throw new Error(`No NFL data fetched for ${daysBack} days back.`);

			const recordsDaysBack = extractData(nflDataDaysBack);
			await sendDataToAirtable(recordsDaysBack);
		} else {
			// Fetching data for yesterday
			const dateYesterday = getDateForKey('yesterday');
			const nflDataYesterday = await fetchNFLData(dateYesterday);
			if (!nflDataYesterday) throw new Error('No NFL data fetched for yesterday.');

			// Fetching data for today
			const dateToday = getDateForKey('today');
			const nflDataToday = await fetchNFLData(dateToday);
			if (!nflDataToday) throw new Error('No NFL data fetched for today.');

			// Fetching data for tomorrow
			const dateTomorrow = getDateForKey('tomorrow');
			const nflDataTomorrow = await fetchNFLData(dateTomorrow);
			if (!nflDataTomorrow) throw new Error('No NFL data fetched for tomorrow.');

			// Extracting and combining records
			const recordsYesterday = extractData(nflDataYesterday);
			const recordsToday = extractData(nflDataToday);
			const recordsTomorrow = extractData(nflDataTomorrow);

			const combinedRecords = [
				...recordsYesterday, 
				...recordsToday, 
				...recordsTomorrow
			];

			// Sending all combined data to Airtable
			await sendDataToAirtable(combinedRecords);
		}
		console.log('✨ NFL Airtable Update completed successfully!');
	} catch (error) {
		console.error('⚠️ An error occurred during the NFL Airtable Update:', error);
	}
}

main();
