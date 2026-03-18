const groupController = {

  list: (req, res) => {
    res.render('groups/groupsList', { user: req.session.user || null, groups: [] });
  },

  getById: (req, res) => {
    const groupId = req.params.id;
    res.render('groups/individualProfileGroupPage', {
      user: req.session.user || null,
      group: { id: groupId, name: 'Group ' + groupId }
    });
  }

};

module.exports = groupController;
