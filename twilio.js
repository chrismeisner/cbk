exports.handler = async function(context, event, callback) {
	const Airtable = require('airtable');
	const base = new Airtable({apiKey: context.AIRTABLE_API_KEY}).base(context.AIRTABLE_BASE_ID);
	const twilioClient = context.getTwilioClient();

	const fromNumber = event.From;
	const response = event.Body.trim().toUpperCase();

	try {
		// Fetch user record from Airtable
		let userRecord = await base('Users').select({
			filterByFormula: `{Phone Number} = '${fromNumber}'`
		}).firstPage();

		if (userRecord.length === 0) {
			// Handle new user or send an error message
			callback(null, 'User not found.');
			return;
		}

		let user = userRecord[0];
		let currentIndex = user.get('Current Event Index') || 0;

		// Fetch the current event based on the index
		let events = await base('Events').select({
			filterByFormula: `{Event Order} = ${currentIndex}`
		}).firstPage();

		if (events.length === 0) {
			// Handle the end of events or an error
			callback(null, 'No more events.');
			return;
		}

		let currentEvent = events[0];

		// Record user response and update user record
		await base('Responses').create([{
			fields: {
				'User Phone Number': [user.id],
				'Event': [currentEvent.id],
				'User Response': response
			}
		}]);

		// Update user's current event index
		await base('Users').update([{
			id: user.id,
			fields: {
				'Current Event Index': currentIndex + 1
			}
		}]);

		// Send response for the next event or closing message
		let replyMessage = 'Next event info...'; // Replace with actual next event info or closing message

		twilioClient.messages.create({
			body: replyMessage,
			to: fromNumber,
			from: context.TWILIO_NUMBER
		});

		callback(null, 'Success');
	} catch (error) {
		console.error(error);
		callback(error);
	}
};
