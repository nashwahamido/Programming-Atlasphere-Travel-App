const express = require('express');
const path = require('path');
const session = require('express-session');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Session configuration
const sessionConfig = require('./config/session');
app.use(session(sessionConfig));

// Routes
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/users', require('./routes/users'));
app.use('/groups', require('./routes/groups'));
app.use('/activities', require('./routes/activities'));
app.use('/recommendations', require('./routes/recommendations'));
app.use('/itinerary', require('./routes/itinerary'));
app.use('/chat', require('./routes/chat'));

// Error handling middleware
const errorMiddleware = require('./middleware/errorMiddleware');
app.use(errorMiddleware);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;

// Show homepage
app.get('/', (req, res) => {
 // Check if user is logged in
 const user = req.session.user || null;
 // Render the template with user data
 res.render('index', {
 title: 'Homepage',
 user: user
 });
});
// Handle sign in
app.get('/auth/login', (req, res) => {
 res.render('auth/login', { title: 'Sign In' });
});
// Handle sign up
app.get('/auth/register', (req, res) => {
 res.render('auth/register', { title: 'Sign Up' });
});
// Handle logout
app.get('/auth/logout', (req, res) => {
 req.session.destroy();
 res.redirect('/');
});
// Handle create group
app.get('/groups/create', (req, res) => {
 if (!req.session.user) {
 return res.redirect('/auth/login');
 }
 res.render('groups/create-country', { title: 'Create Trip' });
});
