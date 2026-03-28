const express = require('express');
const router = express.Router();

router.post('/delete', (req, res) => {
  req.session.destroy(function(err) {
    res.render('account-deleted', { user: null });
  });
});

module.exports = router;