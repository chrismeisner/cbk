// Helper function to get the date key (yesterday, today, tomorrow, daysBack, or daysAhead)
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

// Main function with added flexibility for fetching data for days ahead
async function main(daysAhead = 0) {
	console.log('🚀 Starting NBA Airtable Update...');
	try {
		const daysBack = process.env.DAYS_BACK || 0; // Fetching the daysBack value from the environment variables
		daysAhead = process.env.DAYS_AHEAD || daysAhead; // Fetching the daysAhead value from the environment variables or function argument

		// Fetching data for the past days if specified
		if (daysBack > 0) {
			console.log(`🔄 Fetching data for ${daysBack} days back...`);
			const dateDaysBack = getDateForKey('daysBack', daysBack);
			const nbaDataDaysBack = await fetchNBAData(dateDaysBack);
			if (!nbaDataDaysBack) throw new Error(`No NBA data fetched for ${daysBack} days back.`);

			const recordsDaysBack = extractData(nbaDataDaysBack);
			await sendDataToAirtable(recordsDaysBack);
		}

		// Fetching data for the specified number of days ahead
		if (daysAhead > 0) {
			console.log(`🔄 Fetching data for ${daysAhead} days ahead...`);
			for (let i = 1; i <= daysAhead; i++) {
				const dateFuture = getDateForKey('daysAhead', i);
				const nbaDataFuture = await fetchNBAData(dateFuture);
				if (!nbaDataFuture) {
					console.log(`No NBA data fetched for ${i} days ahead.`);
					continue;
				}

				const recordsFuture = extractData(nbaDataFuture);
				await sendDataToAirtable(recordsFuture);
			}
		}

		console.log('✨ NBA Airtable Update completed successfully!');
	} catch (error) {
		console.error('⚠️ An error occurred during the NBA Airtable Update:', error);
	}
}

// You can now call main with a parameter for days ahead or set the DAYS_AHEAD environment variable
main(3); // For example, this would fetch data for 3 days into the future
