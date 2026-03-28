require("dotenv").config();
const express = require('express');
const path = require('path');
const session = require('express-session');

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration
const sessionConfig = require('./config/session');
app.use(session(sessionConfig));

// Static assets
app.use(express.static("assets"));

// variable to upload files such as images
const fileUpload = require("express-fileupload"); // this line imports the express-fileupload middleware into our application. The fileUpload variable now contains the functionality provided by this middleware
app.use(fileUpload()); // this line tells our Express application to use the express-fileupload middleware for all routes. 

app.use('/uploads', express.static(path.join(__dirname, 'assets/uploads'))); // path to assets/uploads > to make the image in the uploads folder accessible



// ── Password hashing ────────────────────────────────────────────────────
const bcrypt = require('bcrypt');

// ── Email verification with Nodemailer ──────────────────────────────────
const nodemailer = require('nodemailer');

// Auto-create Ethereal test account on startup (no config needed!)
let transporter = null;

async function setupEmail() {
  if (process.env.MAIL_HOST && process.env.MAIL_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT) || 587,
      auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
    });
    console.log('Email: using configured SMTP (' + process.env.MAIL_HOST + ')');
  } else {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log('Email: using Ethereal test account');
    console.log('  View sent emails at: https://ethereal.email');
    console.log('  Login:', testAccount.user, '/', testAccount.pass);
  }
  // Share transporter with routes (used by groups.js for invite emails)
  app.locals.transporter = transporter;
}
setupEmail();

// Generate random 6-digit code
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send verification email
async function sendVerificationEmail(toEmail, code) {
  if (!transporter) {
    console.log('Email not ready yet — code is:', code);
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || '"Atlasphere" <noreply@atlasphere.com>',
      to: toEmail,
      subject: 'Atlasphere — Verify your email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h1 style="color: #0B3856; font-size: 24px;">Welcome to Atlasphere!</h1>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">Your verification code is:</p>
          <div style="background: #f0f4f8; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #0B3856;">${code}</span>
          </div>
          <p style="color: #888; font-size: 14px;">This code expires in 10 minutes.</p>
        </div>
      `,
    });

    console.log('Email sent:', info.messageId);
    // Show Ethereal preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) console.log('Preview email at:', previewUrl);
    return true;
  } catch (err) {
    console.error('Email error:', err.message);
    return false;
  }
}

// ── In-memory user store (replaces MySQL for now) ───────────────────────
// When you reconnect MySQL, swap these back to database queries
const users = [];

// ── DATABASE (optional — uncomment when MySQL is available) ─────────────
// const mysql = require("mysql2");
// const connection = mysql.createConnection({
//   host: "localhost",
//   user: process.env.DB_USERNAME,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_DATABASE
// });
// connection.connect((err) => {
//   if (err) console.error('DB connection failed:', err.message);
//   else console.log('DB connected');
// });


// ═════════════════════════════════════════════════════════════════════════
// ROUTES
// ═════════════════════════════════════════════════════════════════════════

// Homepage
app.get('/', (req, res) => {
  res.render('index', { user: req.session.user || null });
});

// ── LOGIN ────────────────────────────────────────────────────────────────
app.get('/auth/login', (req, res) => {
  res.render('login', { title: 'Sign In', error: null });
});

app.post('/auth/login', (req, res) => {
  console.log(
    "Successfully inside handler for POST new-user-session",
    req.body
  );

  connection.query(
    "SELECT * FROM tbl_users WHERE username = ?",
    [req.body.loginuser],
    async (dbErr, results) => {
      if (dbErr) {
        console.log(dbErr);
        return res.status(500).send("Database error");
      }

      if (results.length === 0) {
        return res.render("loginuser", {
          type: "error",
          message: "Invalid username or password. Try again."
        });
      }

      const user = results[0];

      // we compare the password typed into the login form with the hashed password in the database
      const match = await bcrypt.compare(req.body.loginpsw, user.password);

      if (!match) {
        return res.render("loginuser", {
          type: "error",
          message: "Invalid username or password. Try again."
        });
      }

      req.session.user = {
        id: user.IDuser,
        username: user.username,
        email: user.email
      };

      req.session.save((err) => {
        if (err) {
          console.log("Session save error:", err);
          return res.status(500).send("Session error");
        }

        res.redirect("/profile");
      });
    }
  );
});


// ── REGISTER ─────────────────────────────────────────────────────────────
app.get('/auth/register', (req, res) => {
  res.render('register', { title: 'Register', user: null });
});

app.post('/auth/register', async (req, res) => {
  console.log('New registration:', req.body);

  try {
    const { username, useremail, userphone, gender, psw } = req.body;

    // Basic validation
    if (!username || !useremail || !psw) {
      return res.status(400).send('Missing required fields');
    }

    // Check if email already exists
    if (users.find(u => u.email === useremail)) {
      return res.status(400).send('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(psw, 10);

    // Store user in memory (replace with DB insert when MySQL is available)
    const newUser = {
      id: Date.now(),
      username,
      email: useremail,
      phone: userphone,
      gender,
      password: hashedPassword,
      verified: false,
    };
    users.push(newUser);
    console.log('User stored in memory:', newUser.email);

    // Generate verification code
    const code = generateCode();
    req.session.pendingVerification = {
      userId: newUser.id,
      email: useremail,
      code: code,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    };

    // Send verification email
    const sent = await sendVerificationEmail(useremail, code);
    if (sent) {
      console.log('Verification code sent to:', useremail);
    } else {
      console.log('Email failed — code is:', code);
    }

    // ALWAYS log the code to terminal (as fallback)
    console.log('=================================');
    console.log('VERIFICATION CODE:', code);
    console.log('=================================');

    req.session.save(() => {
      res.redirect('/auth/verify');
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).send('Server error');
  }
});

// ── VERIFY ───────────────────────────────────────────────────────────────
app.get('/auth/verify', (req, res) => {
  if (!req.session.pendingVerification) {
    return res.redirect('/auth/register');
  }
  res.render('register-step2', {
    title: 'Verify',
    user: null,
    email: req.session.pendingVerification.email,
    error: null,
    success: null,
  });
});

app.post('/auth/verify', (req, res) => {
  const pending = req.session.pendingVerification;

  if (!pending) {
    return res.redirect('/auth/register');
  }

  // Combine 6 code inputs
  const enteredCode = [
    req.body.code1, req.body.code2, req.body.code3,
    req.body.code4, req.body.code5, req.body.code6,
  ].join('');

  // Check expiry
  if (Date.now() > pending.expiresAt) {
    return res.render('register-step2', {
      title: 'Verify', user: null, email: pending.email,
      error: 'Code has expired. Click "Send code again" below.',
      success: null,
    });
  }

  // Check code
  if (enteredCode !== pending.code) {
    return res.render('register-step2', {
      title: 'Verify', user: null, email: pending.email,
      error: 'Invalid code. Please try again.',
      success: null,
    });
  }

  // Code correct — mark user as verified
  const user = users.find(u => u.id === pending.userId);
  if (user) user.verified = true;

  // Auto-login
  req.session.user = {
    id: pending.userId,
    username: user ? user.username : pending.email.split('@')[0],
    email: pending.email,
  };

  // Clear pending
  delete req.session.pendingVerification;

  req.session.save(() => {
    res.redirect('/setup');
  });
});

// ── RESEND CODE ──────────────────────────────────────────────────────────
app.get('/auth/resend-code', async (req, res) => {
  const pending = req.session.pendingVerification;
  if (!pending) return res.redirect('/auth/register');

  const newCode = generateCode();
  req.session.pendingVerification.code = newCode;
  req.session.pendingVerification.expiresAt = Date.now() + 10 * 60 * 1000;

  const sent = await sendVerificationEmail(pending.email, newCode);
  console.log(sent ? 'Resend OK' : 'Resend failed — code: ' + newCode);
  console.log('=================================');
  console.log('NEW VERIFICATION CODE:', newCode);
  console.log('=================================');

  req.session.save(() => {
    res.render('register-step2', {
      title: 'Verify', user: null, email: pending.email,
      error: null, success: 'A new code has been sent to your email.',
    });
  });
});

// ── LOGOUT ───────────────────────────────────────────────────────────────
app.get('/auth/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// ── PROFILE SETUP ────────────────────────────────────────────────────────
app.get('/setup', (req, res) => {
  res.render('setup', { title: 'Profile Setup', user: req.session.user || null });
});

app.get('/setup/countries', (req, res) => {
  res.render('groups/profile/countries', { title: 'Countries Visited', user: req.session.user || null });
});

app.get('/setup/cities', (req, res) => {
  res.render('groups/profile/cities', { title: 'Cities Visited', user: req.session.user || null });
});

// ── PROFILE ──────────────────────────────────────────────────────────────
app.get('/profile', (req, res) => {
  const user = req.session.user || {
    name: 'TestUser', username: 'TestUser', profile_image: null,
    countries_visited: 5, cities_visited: 12, groups_created: 3
  };
  res.render('profile', { user });
});

app.get('/profile/confirmed', (req, res) => {
  res.render('profile/confirmed', { user: req.session.user || null });
});

app.get('/upload', (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  
  const userId = req.session.user.id;
  
  connection.query(
    "SELECT profilePictureUrl FROM tbl_users WHERE IDuser = ?",
    [userId],
    (err, results) => {
      if (err) {
        console.log(err);
        return res.status(500).send("Database error");
      }
  
      const userData = results[0];
  
      res.render("profile", {
        user: req.session.user,
        message: null,
        type: null,
        image: userData?.profilePictureUrl || null
      });
    }
  );
});




// ── SETTINGS ─────────────────────────────────────────────────────────────
app.get('/settings', (req, res) => {
  res.render('settings', { user: req.session.user || null });
});

// ── GROUPS ───────────────────────────────────────────────────────────────
app.use('/groups', require('./routes/groups'));
app.use('/users', require('./routes/users'));

// ── ERROR HANDLING ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('error', {
    status: 404, message: 'Page not found', user: req.session.user || null
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    status: 500, message: 'Something went wrong', user: req.session.user || null
  });
});

// ── START SERVER ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Users are stored in memory (no MySQL needed)');
});

module.exports = app;