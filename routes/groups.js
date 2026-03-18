const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');

// List all groups
router.get('/', groupController.list);

// Individual group page
router.get('/:id', groupController.getById);

// 1: show country selection page
router.get('/create/country', (req, res) => {
  res.render('groups/create-country', { title: 'Create Country', user: req.session.user || null });
});

// 2: show city selection page
router.get('/create/city', (req, res) => {
  res.render('groups/create-city', { title: 'Create City', user: req.session.user || null });
});

// 3: show days selection page
router.get('/create/days', (req, res) => {
  res.render('groups/create-days', { title: 'Create Days', user: req.session.user || null });
});

// 4: show confirmation page
router.get('/create/confirm', (req, res) => {
  res.render('groups/create-confirm', { title: 'Confirm Group', user: req.session.user || null });
});

module.exports = router;
