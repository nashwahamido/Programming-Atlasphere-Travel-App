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
