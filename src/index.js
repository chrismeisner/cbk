// src/index.js

const express = require('express');
const bodyParser = require('body-parser');

// Initialize express app
const app = express();

// Use body-parser to parse JSON bodies into JS objects
app.use(bodyParser.json());

// Define a route for the index page
app.get('/', (req, res) => {
  res.send('Hello, Sports Betting Fans!');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
