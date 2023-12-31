const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const Airtable = require('airtable');
const crypto = require('crypto'); // Include the crypto module for signature verification

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
  // Retrieve the X-Slicktext-Signature header
  const signature = req.headers['x-slicktext-signature'];

  // Compute the HMAC digest
  const expectedSignature = crypto
    .createHmac('md5', process.env.SLICKTEXT_WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  // Validate the request
  if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }

  // If signature matches, process the webhook data
  const ChatMessage = req.body.ChatMessage;

  // Check if ChatMessage and necessary fields exist
  if (!ChatMessage || !ChatMessage.FromNumber || !ChatMessage.Body) {
    console.error('Webhook received with incomplete or missing ChatMessage data:', req.body);
    res.status(400).send('Incomplete or missing ChatMessage data');
    return;
  }

  // Prepare the data for Airtable
  const airtableData = {
    'FromNumber': ChatMessage.FromNumber,
    'Body': ChatMessage.Body,
  };

  // Add the data to Airtable
  base(process.env.AIRTABLE_TABLE_NAME).create([{ "fields": airtableData }], function(err, records) {
    if (err) {
      console.error('Error adding to Airtable:', err);
      res.status(500).send('Error processing webhook');
      return;
    }
    console.log('Added to Airtable:', records[0].getId());
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
