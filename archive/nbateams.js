require('dotenv').config();
const Airtable = require('airtable');
const axios = require('axios');

const base = new Airtable({ apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(process.env.AIRTABLE_BASE_ID);

async function fetchNBATeams() {
	try {
		const response = await axios.get('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams');
		const teams = response.data.sports[0].leagues[0].teams;
		return teams;
	} catch (error) {
		console.error("Error fetching NBA team data:", error);
		return [];
	}
}

async function uploadToAirtable(teams) {
	for (const team of teams) {
		const teamName = team.team.displayName;
		const teamCity = team.team.location;
		const teamAbbreviation = team.team.abbreviation;
		const primaryColor = `#${team.team.color}`;
		let teamLogo = '';
		let rosterLink = '';
		let clubhouseLink = '';

		// Finding the logo URL
		const logos = team.team.logos || [];
		const pngLogo = logos.find(logo => logo.href.endsWith('.png'));
		if (pngLogo) {
			teamLogo = pngLogo.href;
		}

		// Finding the roster link and clubhouse link
		const links = team.team.links || [];
		const rosterLinkObj = links.find(link => link.rel.includes('roster') && link.rel.includes('team'));
		if (rosterLinkObj) {
			rosterLink = rosterLinkObj.href;
		}
		const clubhouseLinkObj = links.find(link => link.rel.includes('clubhouse') && link.rel.includes('team'));
		if (clubhouseLinkObj) {
			clubhouseLink = clubhouseLinkObj.href;
		}

		try {
			await base('Teams').create([
				{
					fields: {
						'Team Name': teamName,
						'Team City': teamCity,
						'Team Logo': teamLogo,
						'Abbreviation': teamAbbreviation,
						'Primary Color': primaryColor,
						'Roster Link': rosterLink,
						'Clubhouse Link': clubhouseLink
					}
				}
			]);
			console.log(`Added ${teamName} to Airtable.`);
		} catch (err) {
			console.error(`Error adding ${teamName} to Airtable:`, err);
		}
	}
}

async function main() {
	const teams = await fetchNBATeams();
	if (teams.length > 0) {
		await uploadToAirtable(teams);
	}
}

main();
