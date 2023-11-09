const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const Airtable = require('airtable');

// Initialize express app
const app = express();

// Use body-parser to parse JSON bodies into JS objects
app.use(bodyParser.json());

// Set up Airtable configuration
Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
});
const base = Airtable.base(process.env.AIRTABLE_BASE_ID);

// Axios instance for SlickText API with authentication
const slickTextAxios = axios.create({
  baseURL: 'https://api.slicktext.com/v1/',
  auth: {
    username: process.env.SLICKTEXT_PUBLIC_KEY,
    password: process.env.SLICKTEXT_PRIVATE_KEY
  }
});

// Endpoint to send an SMS message
app.post('/send-sms', (req, res) => {
  const { number, message } = req.body;

  slickTextAxios.post('/text', {
    number, // The recipient's phone number
    message // The SMS message content
  })
  .then(response => {
    console.log('Message sent:', response.data);
    res.status(200).send('Message sent');
  })
  .catch(error => {
    console.error('Error sending message:', error);
    res.status(500).send('Error sending message');
  });
});

// Webhook endpoint to handle incoming messages from SlickText
app.post('/webhook/sms', (req, res) => {
  console.log('Full request body:', req.body); // Log the full request body for debugging
  const { Event, Timestamp, attemptNumber, ChatThread, ChatMessage, Textwords } = req.body;

  // Log the incoming webhook data
  console.log('Webhook received:', req.body);

  // Map the incoming webhook data to Airtable fields
  const airtableData = {
    'Event': Event,
    'Timestamp': Timestamp,
    'AttemptNumber': attemptNumber,
    'ChatThreadId': ChatThread?.ChatThreadId,
    'WithNumber': ChatThread?.WithNumber,
    'ChatThreadDateCreated': ChatThread?.DateCreated,
    'ChatMessageId': ChatMessage?.ChatMessageId,
    'FromNumber': ChatMessage?.FromNumber,
    'ToNumber': ChatMessage?.ToNumber,
    'Body': ChatMessage?.Body,
    'MessageRead': ChatMessage?.MessageRead.toString(), // Convert boolean to string if necessary
    'Received': ChatMessage?.Received,
    'TextwordId': Textwords?.[0]?.TextwordId, // Assuming Textwords is an array and we're interested in the first item
    'Textword': Textwords?.[0]?.Textword,
    'Description': Textwords?.[0]?.Description,
    'AutoReply': Textwords?.[0]?.AutoReply,
  };

  // Add the mapped data to Airtable
  base(process.env.AIRTABLE_TABLE_NAME).create([{ "fields": airtableData }], function(err, records) {
    if (err) {
      console.error('Error adding to Airtable:', err);
      res.status(500).send('Error processing webhook');
      return;
    }
    records.forEach(function(record) {
      console.log('Added to Airtable:', record.getId());
    });
    res.status(200).send('Webhook received and processed');
  });
});

// Define a route for the index page
app.get('/', (req, res) => {
  res.send('Hello, Sports Betting Fans!');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
