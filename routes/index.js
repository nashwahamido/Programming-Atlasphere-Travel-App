const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('index', { user: req.session.user || null });
});

module.exports = router;

router.get('/settings', (req, res) => {
  res.render('settings', { user: req.session.user || null });
});