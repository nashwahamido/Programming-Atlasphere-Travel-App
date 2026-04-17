const express = require('express');
const router = express.Router();

// ── Update user info ───────────────────────────────────────────────────
router.post('/update', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  const connection = req.app.get('db');
  const { name, email, phone, gender } = req.body;
  const genderMap = { 'm': 1, 'f': 2, 'd': 3 };
  const genderId = genderMap[gender] || null;

  connection.query(
    'UPDATE tbl_users SET username = ?, email = ?, phonenumber = ?, FIDgender = ? WHERE IDuser = ?',
    [name, email, phone || '', genderId, req.session.user.id],
    function(err) {
      if (err) {
        console.error('Update error:', err.message);
        return res.redirect('/settings#visitedLocations');
      }
      req.session.user.username = name;
      req.session.user.email = email;
      req.session.save(() => res.redirect('/settings'));
    }
  );
});

// ── Delete account ─────────────────────────────────────────────────────
router.post('/delete', (req, res) => {
  console.log('Delete route hit');
  console.log('Session user:', req.session.user);

  if (!req.session.user) {
    console.log('No session user - redirecting to login');
    return res.redirect('/auth/login');
  }

  const connection = req.app.get('db');
  const userId = req.session.user.id || req.session.user.IDuser;

  console.log('Deleting user ID:', userId);

  if (!userId) {
    console.error('No user ID found in session');
    return res.redirect('/settings');
  }

  connection.query(
    'DELETE FROM tbl_users WHERE IDuser = ?',
    [userId],
    function(err, result) {
      if (err) {
        console.error('Delete error:', err.message);
        return res.redirect('/settings');
      }
      console.log('Deleted rows:', result.affectedRows);
      req.session.destroy(() => {
        res.render('account-deleted', { user: null });
      });
    }
  );
});

// ── Update locations ───────────────────────────────────────────────────
router.post('/update-locations', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  const connection = req.app.get('db');

  const selectedCountries = req.body['countries[]'] || req.body['countries'] || [];
  const selectedCities = req.body['cities[]'] || req.body['cities'] || [];

  const countriesStr = Array.isArray(selectedCountries) ? selectedCountries.join(',') : selectedCountries;
  const citiesStr = Array.isArray(selectedCities) ? selectedCities.join(',') : selectedCities;

  connection.query(
    'UPDATE tbl_users SET visitedCountries = ?, visitedCities = ? WHERE IDuser = ?',
    [countriesStr, citiesStr, req.session.user.id],
    function(err) {
      if (err) {
        console.error('Update locations error:', err.message);
      } else {
        console.log('Saved countries:', countriesStr);
        req.session.user.visitedCountries = countriesStr.split(',').filter(Boolean);
        req.session.user.visitedCities = citiesStr.split(',').filter(Boolean);
      }
      req.session.save(function() {
        res.redirect('/settings#visitedLocations');
      });
    }
  );
});

module.exports = router;