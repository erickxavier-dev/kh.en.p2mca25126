const { Router } = require('express');
const ctrl = require('../controllers/notificationController');

const router = Router();

router.get('/placements', ctrl.fetchPlacements);
router.get('/events', ctrl.fetchEvents);
router.get('/results', ctrl.fetchResults);

module.exports = router;
