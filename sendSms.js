const axios = require('axios');

// Axios instance for SlickText API
const slickTextAxios = axios.create({
  baseURL: 'https://api.slicktext.com/v1/',
  auth: {
	username: process.env.SLICKTEXT_PUBLIC_KEY,
	password: process.env.SLICKTEXT_PRIVATE_KEY
  }
});

