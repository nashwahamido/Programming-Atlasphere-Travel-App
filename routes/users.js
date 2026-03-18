const express = require('express');
const router = express.Router();

router.get('/profile', (req, res) => {
  res.render('profile/setup', { user: req.session.user || null });
});

module.exports = router;
