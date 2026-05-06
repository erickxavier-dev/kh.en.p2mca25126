const { Log } = require('logging-middleware');

// In-memory data for now
const placementsData = [
    { id: 101, company: "Tech Solutions", role: "SDE", date: "June 2026" },
    { id: 102, company: "DataCorp", role: "Analyst", date: "July 2026" }
];

const eventsData = [
    { id: 201, name: "Spring Fest 26", location: "Main Ground", time: "10 AM" },
    { id: 202, name: "Coding Hackathon", location: "Lab 3", time: "9 AM" }
];

const resultsData = [
    { id: 301, sem: "Sem 5 Regular", status: "Published", url: "/res/sem5" }
];

const fetchPlacements = async (req, res) => {
    try {
        await Log('backend', 'info', 'controller', 'Requested placement data');
        res.json(placementsData);
    } catch (e) {
        await Log('backend', 'error', 'handler', e.message);
        res.status(500).send('Error loading placements');
    }
};

const fetchEvents = async (req, res) => {
    try {
        await Log('backend', 'info', 'controller', 'Requested event data');
        res.json(eventsData);
    } catch (e) {
        await Log('backend', 'error', 'handler', e.message);
        res.status(500).send('Error loading events');
    }
};

const fetchResults = async (req, res) => {
    try {
        await Log('backend', 'info', 'controller', 'Requested result data');
        res.json(resultsData);
    } catch (e) {
        await Log('backend', 'error', 'handler', e.message);
        res.status(500).send('Error loading results');
    }
};

module.exports = {
    fetchPlacements,
    fetchEvents,
    fetchResults
};
