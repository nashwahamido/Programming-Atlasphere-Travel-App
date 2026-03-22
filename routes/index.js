const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('index', { user: req.session.user || null });
});

router.get('/profile', (req, res) => {
  res.render('profile', { 
    user: {
      name: 'TestUser',
      username: 'TestUser',
      profile_image: null,
      avatar: null,
      countries_visited: 5,
      cities_visited: 12,
      groups_created: 3
    }
  });
});

module.exports = router;