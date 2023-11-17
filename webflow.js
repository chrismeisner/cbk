const express = require('express');
const app = express();

// Use dynamic import for fetch
let fetch;

(async () => {
	fetch = (await import('node-fetch')).default;

	app.get('/data', async (req, res) => {
		try {
			const response = await fetch('https://api.airtable.com/v0/app0Pp04ow3Il2JDV/tblnMJSkwR5yWVsoD', {
				headers: { 'Authorization': 'Bearer pat7wkR2FSNimd7sj.eeffd53707629599219086619a348600505e6bb8a7a228578e442df926bc8366' }
			});
			const data = await response.json();
			res.json(data.records); // Send back the data
		} catch (error) {
			res.status(500).json({ error: error.message });
		}
	});

	const PORT = process.env.PORT || 3000;
	app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})();
