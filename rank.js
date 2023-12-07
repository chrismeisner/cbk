require('dotenv').config();
const Airtable = require('airtable');

// Airtable credentials
const base = new Airtable({ apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(process.env.AIRTABLE_BASE_ID);

// Function to update the Rank field
async function updateRank() {
	const table = base('Teams');
	try {
		// Fetch records sorted by ATS AVG where League is NBA and update Rank
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

// Run the function
updateRank();
