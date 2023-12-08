require('dotenv').config();
const Airtable = require('airtable');

// Airtable configuration
const {
	AIRTABLE_BASE_ID,
	AIRTABLE_PERSONAL_ACCESS_TOKEN
	// Removed the AIRTABLE_TABLE_NAME environment variable
} = process.env;

Airtable.configure({
	endpointUrl: 'https://api.airtable.com',
	apiKey: AIRTABLE_PERSONAL_ACCESS_TOKEN
});

const base = Airtable.base(AIRTABLE_BASE_ID);
const table = base('Teams'); // Hard-coded table name

async function duplicateATSAVGField() {
	try {
		const records = await table.select({
			filterByFormula: `{League} = 'NBA'`,
			fields: ["ATS AVG"] // Fetch the calculated value of the ATS AVG formula field
		}).all();

		let updatePromises = records.map(record => {
			return table.update(record.id, {
				"ATS AVG LAST": record.get("ATS AVG") // Update the ATS AVG LAST field with the value from ATS AVG
			});
		});

		// Wait for all updates to complete
		await Promise.all(updatePromises);
		console.log('ATS AVG field values duplicated successfully to ATS AVG LAST.');
	} catch (error) {
		console.error('Error in duplicating ATS AVG field values:', error);
	}
}

async function main() {
	console.log('🚀 Starting field duplication process...');
	await duplicateATSAVGField();
	console.log('✨ Field duplication completed successfully!');
}

main();
