router.get('/settings', async (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  try {
    const User = require('../models/User');
    const user = await User.findById(req.session.user.IDuser);
    const groups = req.app.locals.groups || [];
    res.render('settings', {
      user: user,
      groups: groups,
      countries: [],
      cities: []
    });
  } catch (err) {
    console.error(err.message);
    res.redirect('/');
  }
});