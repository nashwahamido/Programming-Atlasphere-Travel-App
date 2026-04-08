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
        return res.redirect('/settings');
      }
      req.session.user.username = name;
      req.session.user.email = email;
      req.session.save(() => res.redirect('/settings'));
    }
  );
});

// ── Delete account ─────────────────────────────────────────────────────
router.post('/delete', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  const connection = req.app.get('db');

  connection.query(
    'DELETE FROM tbl_users WHERE IDuser = ?',
    [req.session.user.id],
    function(err) {
      if (err) {
        console.error('Delete error:', err.message);
        return res.redirect('/settings');
      }
      req.session.destroy(() => {
        res.render('account-deleted', { user: null });
      });
    }
  );
});

module.exports = router;