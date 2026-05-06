const { Log } = require('logging-middleware');

// mock data — would come from DB in production
const placements = [
    { id: 101, company: 'Tech Solutions', role: 'SDE', date: 'June 2026' },
    { id: 102, company: 'DataCorp', role: 'Data Analyst', date: 'July 2026' }
];

const events = [
    { id: 201, name: 'Spring Fest 26', location: 'Main Ground', time: '10 AM' },
    { id: 202, name: 'Coding Hackathon', location: 'Lab 3', time: '9 AM' }
];

const results = [
    { id: 301, sem: 'Sem 5 Regular', status: 'Published', url: '/res/sem5' }
];

async function fetchPlacements(req, res) {
    await Log('backend', 'info', 'controller', 'placements requested');
    res.json(placements);
}

async function fetchEvents(req, res) {
    await Log('backend', 'info', 'controller', 'events requested');
    res.json(events);
}

async function fetchResults(req, res) {
    await Log('backend', 'info', 'controller', 'results requested');
    res.json(results);
}

module.exports = { fetchPlacements, fetchEvents, fetchResults };
