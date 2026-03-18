const express = require('express');
const router = express.Router();

router.get('/', (req, res) => res.redirect('/itinerary/weekly'));

router.get('/weekly', (req, res) => {
  res.render('itinerary/weekly', { user: req.session.user || null });
});

router.get('/monthly', (req, res) => {
  res.render('itinerary/monthly', { user: req.session.user || null });
});

module.exports = router;
