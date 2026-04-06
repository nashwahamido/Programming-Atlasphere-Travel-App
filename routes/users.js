const express = require('express');
const router = express.Router();

router.post('/delete', (req, res) => {
  var user = req.session.user;

  if (!user || !user.id) {
    return res.redirect('/');
  }

  var db = req.app.get('db');

  db.query(
    "DELETE FROM tbl_users WHERE IDuser = ?",
    [user.id],
    function(err) {
      if (err) {
        console.error("Delete user error:", err.message);
      } else {
        console.log("User deleted from DB:", user.username, "(ID:", user.id, ")");
      }

      req.session.destroy(function() {
        res.render('account-deleted', { user: null });
      });
    }
  );
});

module.exports = router;