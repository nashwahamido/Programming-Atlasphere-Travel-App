router.get('/settings', (req, res) => {
  const groups = req.app.locals.groups || [];
  res.render('settings', {
    user: req.session.user || null,
    groups: groups,
    countries: [],
    cities: []
  });
});