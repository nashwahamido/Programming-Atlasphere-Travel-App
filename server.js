require("dotenv").config();
var express = require("express");
var path = require("path");
var session = require("express-session");
var bcrypt = require("bcrypt");
var nodemailer = require("nodemailer");

var app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

var sessionConfig = require("./config/session");
app.use(session(sessionConfig));

app.use(express.static("assets"));

// ── Email setup ─────────────────────────────────────────────────────────
var transporter = null;

async function setupEmail() {
  if (process.env.MAIL_HOST && process.env.MAIL_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT) || 587,
      auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
    });
    console.log("Email: using configured SMTP");
  } else {
    var testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      auth: { user: testAccount.user, pass: testAccount.pass }
    });
    console.log("Email: using Ethereal test account");
    console.log("  View emails at: https://ethereal.email");
    console.log("  Login: " + testAccount.user + " / " + testAccount.pass);
  }
}

setupEmail();

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(toEmail, code) {
  if (!transporter) {
    console.log("Email not ready. Code is: " + code);
    return false;
  }
  try {
    var info = await transporter.sendMail({
      from: "Atlasphere <noreply@atlasphere.com>",
      to: toEmail,
      subject: "Atlasphere - Verify your email",
      html: "<div style=\"font-family:Arial;max-width:480px;margin:0 auto;padding:32px\">" +
            "<h1 style=\"color:#0B3856\">Welcome to Atlasphere!</h1>" +
            "<p>Your verification code is:</p>" +
            "<div style=\"background:#f0f4f8;border-radius:12px;padding:24px;text-align:center;margin:24px 0\">" +
            "<span style=\"font-size:36px;font-weight:700;letter-spacing:8px;color:#0B3856\">" + code + "</span>" +
            "</div>" +
            "<p style=\"color:#888;font-size:14px\">This code expires in 10 minutes.</p>" +
            "</div>"
    });
    console.log("Email sent: " + info.messageId);
    var url = nodemailer.getTestMessageUrl(info);
    if (url) console.log("Preview: " + url);
    return true;
  } catch (err) {
    console.error("Email error: " + err.message);
    return false;
  }
}

// ── In-memory user storage (no MySQL needed) ────────────────────────────
var users = [];

// ── Routes ──────────────────────────────────────────────────────────────

// Homepage
app.get("/", function (req, res) {
  res.render("index", { user: req.session.user || null });
});

// Login
app.get("/auth/login", function (req, res) {
  res.render("login", { title: "Sign In", error: null });
});

app.post("/auth/login", async function (req, res) {
  var user = users.find(function (u) { return u.email === req.body.loginemail; });
  if (!user) {
    return res.render("login", { error: "Invalid email or password" });
  }
  var match = await bcrypt.compare(req.body.loginpsw, user.password);
  if (!match) {
    return res.render("login", { error: "Invalid email or password" });
  }
  req.session.user = { id: user.id, username: user.username, email: user.email };
  req.session.save(function () {
    res.redirect("/profile");
  });
});

// Register
app.get("/auth/register", function (req, res) {
  res.render("register", { title: "Register", user: null });
});

app.post("/auth/register", async function (req, res) {
  console.log("New registration:", req.body);
  try {
    var username = req.body.username;
    var useremail = req.body.useremail;
    var userphone = req.body.userphone;
    var gender = req.body.gender;
    var psw = req.body.psw;

    if (!username || !useremail || !psw) {
      return res.status(400).send("Missing required fields");
    }

    var existing = users.find(function (u) { return u.email === useremail; });
    if (existing) {
      return res.status(400).send("Email already registered");
    }

    var hashedPassword = await bcrypt.hash(psw, 10);

    var newUser = {
      id: Date.now(),
      username: username,
      email: useremail,
      phone: userphone,
      gender: gender,
      password: hashedPassword,
      verified: false
    };
    users.push(newUser);
    console.log("User stored in memory: " + useremail);

    var code = generateCode();
    req.session.pendingVerification = {
      userId: newUser.id,
      email: useremail,
      code: code,
      expiresAt: Date.now() + 10 * 60 * 1000
    };

    await sendVerificationEmail(useremail, code);
    console.log("=================================");
    console.log("VERIFICATION CODE: " + code);
    console.log("=================================");

    req.session.save(function () {
      res.redirect("/auth/verify");
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).send("Server error");
  }
});

// Verify
app.get("/auth/verify", function (req, res) {
  if (!req.session.pendingVerification) {
    return res.redirect("/auth/register");
  }
  res.render("register-step2", {
    title: "Verify",
    user: null,
    email: req.session.pendingVerification.email,
    error: null,
    success: null
  });
});

app.post("/auth/verify", function (req, res) {
  var pending = req.session.pendingVerification;
  if (!pending) {
    return res.redirect("/auth/register");
  }

  var enteredCode = (req.body.code1 || "") + (req.body.code2 || "") +
                    (req.body.code3 || "") + (req.body.code4 || "") +
                    (req.body.code5 || "") + (req.body.code6 || "");

  if (Date.now() > pending.expiresAt) {
    return res.render("register-step2", {
      title: "Verify", user: null, email: pending.email,
      error: "Code expired. Click resend below.", success: null
    });
  }

  if (enteredCode !== pending.code) {
    return res.render("register-step2", {
      title: "Verify", user: null, email: pending.email,
      error: "Invalid code. Try again.", success: null
    });
  }

  var user = users.find(function (u) { return u.id === pending.userId; });
  if (user) user.verified = true;

  req.session.user = {
    id: pending.userId,
    username: user ? user.username : pending.email.split("@")[0],
    email: pending.email
  };
  delete req.session.pendingVerification;

  req.session.save(function () {
    res.redirect("/groups/create/country");
  });
});

// Resend code
app.get("/auth/resend-code", async function (req, res) {
  var pending = req.session.pendingVerification;
  if (!pending) {
    return res.redirect("/auth/register");
  }

  var newCode = generateCode();
  pending.code = newCode;
  pending.expiresAt = Date.now() + 10 * 60 * 1000;

  await sendVerificationEmail(pending.email, newCode);
  console.log("=================================");
  console.log("NEW CODE: " + newCode);
  console.log("=================================");

  req.session.save(function () {
    res.render("register-step2", {
      title: "Verify", user: null, email: pending.email,
      error: null, success: "New code sent!"
    });
  });
});

// Logout
app.get("/auth/logout", function (req, res) {
  req.session.destroy();
  res.redirect("/");
});

// Setup
app.get("/setup", function (req, res) {
  res.render("setup", { title: "Profile Setup", user: req.session.user || null });
});

app.get("/setup/countries", function (req, res) {
  res.render("groups/profile/countries", { title: "Countries Visited", user: req.session.user || null });
});

app.get("/setup/cities", function (req, res) {
  res.render("groups/profile/cities", { title: "Cities Visited", user: req.session.user || null });
});

// Profile
app.get("/profile", function (req, res) {
  var user = req.session.user || {
    name: "TestUser", username: "TestUser", profile_image: null,
    countries_visited: 5, cities_visited: 12, groups_created: 3
  };
  res.render("profile", { user: user });
});

app.get("/profile/confirmed", function (req, res) {
  res.render("profile/confirmed", { user: req.session.user || null });
});

// Settings
app.get("/settings", function (req, res) {
  res.render("settings", { user: req.session.user || null });
});

// Groups
app.use("/groups", require("./routes/groups"));

// 404
app.use(function (req, res) {
  res.status(404).render("error", {
    status: 404, message: "Page not found", user: req.session.user || null
  });
});

// 500
app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(500).render("error", {
    status: 500, message: "Something went wrong", user: req.session.user || null
  });
});

// Start
var PORT = process.env.PORT || 3000;
app.listen(PORT, function () {
  console.log("Server running on http://localhost:" + PORT);
  console.log("No MySQL needed - users stored in memory");
});

module.exports = app;
