require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logger = require('logging-middleware');

logger.setAuthToken(process.env.EVALUATION_AUTH_TOKEN);

const app = express();
app.use(cors());
app.use(express.json());

// log every request that comes through
app.use((req, res, next) => {
    logger.Log('backend', 'info', 'route', req.method + ' ' + req.url);
    next();
});

app.use('/api/notifications', require('./routes/notifications'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    logger.Log('backend', 'info', 'service', 'Server running on port ' + PORT);
    logger.Log('backend', 'info', 'config', 'Server started on port ' + PORT);
});
