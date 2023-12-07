require('dotenv').config();
const Airtable = require('airtable');

// Airtable credentials
const base = new Airtable({ apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(process.env.AIRTABLE_BASE_ID);

// Function to update the Rank field
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

		// Step 2: Fetch records sorted by ATS TOT where League is NBA and update Rank
		const records = await table.select({
			filterByFormula: `{League} = 'NBA'`,
			sort: [{ field: "ATS TOT", direction: "desc" }],
			fields: ["ATS TOT"] // Include only necessary fields
		}).all();

		// Update each record with its new rank
		for (let i = 0; i < records.length; i++) {
			const record = records[i];
			const rank = i + 1;
			console.log(`Updating record ${record.id}, ATS TOT: ${record.get("ATS TOT")}, Rank: ${rank}`);

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
