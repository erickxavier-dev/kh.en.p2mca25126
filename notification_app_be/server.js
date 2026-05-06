require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logger = require('logging-middleware');

// Init logger using env
logger.setAuthToken(process.env.EVALUATION_AUTH_TOKEN);

const app = express();
app.use(cors());
app.use(express.json());

// Track all incoming API requests
app.use(async (req, res, next) => {
    await logger.Log('backend', 'info', 'route', `Hit: ${req.method} ${req.url}`);
    next();
});

// Load feature routes
const apiRoutes = require('./routes/notifications');
app.use('/api/notifications', apiRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
    console.log(`Backend is up on port ${PORT}`);
    await logger.Log('backend', 'info', 'config', `App started on port ${PORT}`);
});
