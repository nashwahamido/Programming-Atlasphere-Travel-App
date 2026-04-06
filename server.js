require("dotenv").config();
const express = require("express");
const path = require("path");
const countries = require("./data/countries");
const session = require("express-session");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const fileUpload = require("express-fileupload");
const fs = require("fs");

const app = express();

// ── VIEW ENGINE SETUP ────────────────────────────────────────────────────
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ── MIDDLEWARE ───────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("assets"));
app.use(fileUpload());
app.use("/uploads", express.static(path.join(__dirname, "assets/uploads")));

// ── SESSION CONFIGURATION ────────────────────────────────────────────────
const sessionConfig = require("./config/session");
app.use(session(sessionConfig));

// ── DATABASE ─────────────────────────────────────────────────────────────
const connection = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

connection.getConnection((err, conn) => {
  if (err) {
    console.error("DB connection failed:", err.message);
  } else {
    console.log("DB connected to Aiven");
    conn.release();
  }
});

// Make DB connection accessible to route files
app.set('db', connection);

// ── EMAIL SETUP ──────────────────────────────────────────────────────────
let transporter = null;

async function setupEmail() {
  try {
    if (process.env.MAIL_HOST && process.env.MAIL_USER) {
      transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: parseInt(process.env.MAIL_PORT, 10) || 587,
        secure: false,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
      });
      console.log("Email: using configured SMTP (" + process.env.MAIL_HOST + ")");
    } else {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log("Email: using Ethereal test account");
      console.log("View sent emails at: https://ethereal.email");
      console.log("Login:", testAccount.user, "/", testAccount.pass);
    }

    app.locals.transporter = transporter;
  } catch (err) {
    console.error("Email setup failed:", err.message);
  }
}
setupEmail();

// ── HELPERS ──────────────────────────────────────────────────────────────
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(toEmail, code) {
  if (!transporter) {
    console.log("Email not ready yet — code is:", code);
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || '"Atlasphere" <noreply@atlasphere.com>',
      to: toEmail,
      subject: "Atlasphere — Verify your email",
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

    console.log("Email sent:", info.messageId);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) console.log("Preview email at:", previewUrl);

    return true;
  } catch (err) {
    console.error("Email error:", err.message);
    return false;
  }
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/auth/login");
  }
  next();
}

// ── ROUTES ───────────────────────────────────────────────────────────────

// Homepage
app.get("/", (req, res) => {
  res.render("index", { user: req.session.user || null });
});

// ── LOGIN ────────────────────────────────────────────────────────────────
app.get("/auth/login", (req, res) => {
  res.render("login", { title: "Sign In", error: null, user: null });
});

app.post("/auth/login", (req, res) => {
  const username = req.body.loginuser || req.body.loginemail;
  const password = req.body.loginpsw;

  if (!username || !password) {
    return res.render("login", {
      title: "Sign In",
      error: "Please enter both username and password.",
      user: null,
    });
  }

  connection.query(
    "SELECT * FROM tbl_users WHERE (username = ? OR email = ?) LIMIT 1",
    [username, username],
    async (dbErr, results) => {
      if (dbErr) {
        console.error(dbErr);
        return res.status(500).send("Database error");
      }

      if (results.length === 0) {
        return res.render("login", {
          title: "Sign In",
          error: "Invalid username or password. Try again.",
          user: null,
        });
      }

      const user = results[0];
      let match = false;

      try {
        match = await bcrypt.compare(password, user.password);
      } catch (err) {
        match = false;
      }

      // Fallback for old plaintext test users already in your SQL dump
      if (!match && password === user.password) {
        match = true;
      }

      if (!match) {
        return res.render("login", {
          title: "Sign In",
          error: "Invalid username or password. Try again.",
          user: null,
        });
      }

      req.session.user = {
        id: user.IDuser,
        username: user.username,
        email: user.email,
      };

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).send("Session error");
        }

        res.redirect("/profile");
      });
    }
  );
});

// ── REGISTER ─────────────────────────────────────────────────────────────
app.get("/auth/register", (req, res) => {
  res.render("register", { title: "Register", user: null });
});

app.post("/auth/register", async (req, res) => {
  console.log("New registration:", req.body);

  try {
    const { username, useremail, userphone, gender, psw } = req.body;

    if (!username || !useremail || !psw) {
      return res.status(400).send("Missing required fields");
    }

    connection.query(
      "SELECT IDuser FROM tbl_users WHERE email = ? LIMIT 1",
      [useremail],
      async (checkErr, existingUsers) => {
        if (checkErr) {
          console.error("Email lookup error:", checkErr);
          return res.status(500).send("Database error");
        }

        if (existingUsers.length > 0) {
          return res.status(400).send("Email already registered");
        }

        const hashedPassword = await bcrypt.hash(psw, 10);
        const code = generateCode();

        const genderId =
          gender && !isNaN(Number(gender)) ? Number(gender) : null;

        const insertSql = `
          INSERT INTO tbl_users
          (username, email, phonenumber, password, FIDgender, verificationCode, verificationExpiry, isConfirmed, GroupAdmin)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const insertValues = [
          username,
          useremail,
          userphone || "",
          hashedPassword,
          genderId,
          Number(code),
          "00:00:00",
          0,
          null,
        ];

        connection.query(insertSql, insertValues, async (insertErr, result) => {
          if (insertErr) {
            console.error("User insert error:", insertErr);
            return res.status(500).send("Registration failed");
          }

          const newUserId = result.insertId;

          req.session.pendingVerification = {
            userId: newUserId,
            username,
            email: useremail,
            code,
            expiresAt: Date.now() + 10 * 60 * 1000,
          };

          const sent = await sendVerificationEmail(useremail, code);
          if (sent) {
            console.log("Verification code sent to:", useremail);
          } else {
            console.log("Email failed — code is:", code);
          }

          console.log("=================================");
          console.log("VERIFICATION CODE:", code);
          console.log("=================================");

          req.session.save(() => {
            res.redirect("/auth/verify");
          });
        });
      }
    );
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).send("Server error");
  }
});

// ── VERIFY ───────────────────────────────────────────────────────────────
app.get("/auth/verify", (req, res) => {
  if (!req.session.pendingVerification) {
    return res.redirect("/auth/register");
  }

  res.render("register-step2", {
    title: "Verify",
    user: null,
    email: req.session.pendingVerification.email,
    error: null,
    success: null,
  });
});

app.post("/auth/verify", (req, res) => {
  const pending = req.session.pendingVerification;

  if (!pending) {
    return res.redirect("/auth/register");
  }

  const enteredCode = [
    req.body.code1,
    req.body.code2,
    req.body.code3,
    req.body.code4,
    req.body.code5,
    req.body.code6,
  ].join("");

  if (Date.now() > pending.expiresAt) {
    return res.render("register-step2", {
      title: "Verify",
      user: null,
      email: pending.email,
      error: 'Code has expired. Click "Send code again" below.',
      success: null,
    });
  }

  if (enteredCode !== pending.code) {
    return res.render("register-step2", {
      title: "Verify",
      user: null,
      email: pending.email,
      error: "Invalid code. Please try again.",
      success: null,
    });
  }

  connection.query(
    "UPDATE tbl_users SET isConfirmed = ?, verificationCode = ? WHERE IDuser = ?",
    [1, Number(enteredCode), pending.userId],
    (err) => {
      if (err) {
        console.error("Verification update error:", err);
        return res.status(500).send("Verification failed");
      }

      req.session.user = {
        id: pending.userId,
        username: pending.username,
        email: pending.email,
      };

      delete req.session.pendingVerification;

      req.session.save(() => {
        res.redirect("/setup");
      });
    }
  );
});

// ── RESEND CODE ──────────────────────────────────────────────────────────
app.get("/auth/resend-code", async (req, res) => {
  const pending = req.session.pendingVerification;
  if (!pending) return res.redirect("/auth/register");

  const newCode = generateCode();
  req.session.pendingVerification.code = newCode;
  req.session.pendingVerification.expiresAt = Date.now() + 10 * 60 * 1000;

  connection.query(
    "UPDATE tbl_users SET verificationCode = ? WHERE IDuser = ?",
    [Number(newCode), pending.userId],
    async (err) => {
      if (err) {
        console.error("Resend code DB update error:", err);
      }

      const sent = await sendVerificationEmail(pending.email, newCode);
      console.log(sent ? "Resend OK" : "Resend failed — code: " + newCode);
      console.log("=================================");
      console.log("NEW VERIFICATION CODE:", newCode);
      console.log("=================================");

      req.session.save(() => {
        res.render("register-step2", {
          title: "Verify",
          user: null,
          email: pending.email,
          error: null,
          success: "A new code has been sent to your email.",
        });
      });
    }
  );
});

// ── LOGOUT ───────────────────────────────────────────────────────────────
app.get("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// ── PROFILE SETUP ────────────────────────────────────────────────────────
app.get("/setup", requireAuth, (req, res) => {
  res.render("setup", {
    title: "Profile Setup",
    user: req.session.user || null,
  });
});

app.post("/setup/upload", requireAuth, (req, res) => {
  if (!req.files || !req.files.profilePicture) {
    return res.redirect("/setup/countries");
  }

  var file = req.files.profilePicture;
  var uploadDir = path.join(__dirname, "assets/uploads");

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  var timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 15);
  var safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  var fileName = timestamp + "_" + safeName;
  var filePath = path.join(uploadDir, fileName);

  file.mv(filePath, function (err) {
    if (err) {
      console.error("File upload error:", err);
      return res.redirect("/setup/countries");
    }

    var dbPath = "/uploads/" + fileName;

    connection.query(
      "UPDATE tbl_users SET profilePictureUrl = ?, profilePictureAlt = ? WHERE IDuser = ?",
      [dbPath, "Profile picture", req.session.user.id],
      function (dbErr) {
        if (dbErr) {
          console.error("DB update error:", dbErr);
        } else {
          req.session.user.profilePictureUrl = dbPath;
          console.log("Profile picture saved:", dbPath);
        }

        req.session.save(function () {
          res.redirect("/setup/countries");
        });
      }
    );
  });
});

app.get("/setup/countries", requireAuth, (req, res) => {
  res.render("groups/profile/countries", {
    title: "Countries Visited",
    user: req.session.user || null,
    countries: countries
  });
});

app.get("/setup/cities", requireAuth, (req, res) => {
  // Get selected country codes from query params
  var selectedCodes = req.query["countries[]"] || req.query.countries || [];
  if (typeof selectedCodes === "string") selectedCodes = selectedCodes.split(",").filter(Boolean);

  // Look up cities for each selected country
  var cities = [];
  var selectedCountryNames = [];
  selectedCodes.forEach(function(code) {
    var country = countries.find(function(c) { return c.code.toLowerCase() === code.toLowerCase(); });
    if (country) {
      selectedCountryNames.push(country.name);
      country.cities.forEach(function(cityName) {
        cities.push({ name: cityName, flag: country.flag, countryCode: country.code });
      });
    }
  });

  // If no countries selected, show all cities
  if (cities.length === 0) {
    countries.forEach(function(c) {
      c.cities.forEach(function(cityName) {
        cities.push({ name: cityName, flag: c.flag, countryCode: c.code });
      });
    });
  }

  res.render("groups/profile/cities", {
    title: "Cities Visited",
    user: req.session.user || null,
    cities: cities,
    selectedCodes: selectedCodes,
    selectedCountryNames: selectedCountryNames
  });
});

// Save visited countries + cities to session and DB
app.post("/setup/save-visited", requireAuth, (req, res) => {
  var visitedCountryCodes = (req.body.countries || "").split(",").filter(Boolean);
  var visitedCities = req.body["cities[]"] || [];
  if (typeof visitedCities === "string") visitedCities = [visitedCities];

  // Build flag strings for visited countries
  var visitedFlags = [];
  var visitedCountryNames = [];
  visitedCountryCodes.forEach(function(code) {
    var country = countries.find(function(c) { return c.code.toLowerCase() === code.toLowerCase(); });
    if (country) {
      visitedFlags.push(country.flag);
      visitedCountryNames.push(country.name);
    }
  });

  // Save to session
  req.session.user.visitedCountries = visitedFlags;
  req.session.user.visitedCountryNames = visitedCountryNames;
  req.session.user.visitedCities = visitedCities;

  // Save to DB
  connection.query(
    "UPDATE tbl_users SET visitedCountries = ?, visitedCities = ? WHERE IDuser = ?",
    [visitedCountryCodes.join(","), visitedCities.join(","), req.session.user.id],
    function(err) {
      if (err) console.error("Save visited error:", err.message);
      req.session.save(function() {
        res.redirect("/profile/confirmed");
      });
    }
  );
});


// ── PROFILE ──────────────────────────────────────────────────────────────
app.get("/profile", requireAuth, (req, res) => {
  var userId = req.session.user.id;

  connection.query(
    "SELECT profilePictureUrl, visitedCountries, visitedCities FROM tbl_users WHERE IDuser = ?",
    [userId],
    function (err, results) {
      var image = null;
      var visitedFlags = [];
      var visitedCityList = [];
      var planningFlags = [];

      if (err) {
        console.error("Profile query error:", err.message);
      }

      if (!err && results && results.length > 0) {
        image = results[0].profilePictureUrl || null;

        // Parse visited countries into flags
        var visitedCodes = (results[0].visitedCountries || "").split(",").filter(Boolean);
        visitedCodes.forEach(function(code) {
          var country = countries.find(function(c) { return c.code.toLowerCase() === code.toLowerCase(); });
          if (country) visitedFlags.push(country.flag);
        });

        // Parse visited cities
        visitedCityList = (results[0].visitedCities || "").split(",").filter(Boolean);
      }

      // Also use session data as fallback
      if (!image && req.session.user.profilePictureUrl) {
        image = req.session.user.profilePictureUrl;
      }
      if (visitedFlags.length === 0 && req.session.user.visitedCountries) {
        visitedFlags = req.session.user.visitedCountries;
      }
      if (visitedCityList.length === 0 && req.session.user.visitedCities) {
        visitedCityList = req.session.user.visitedCities;
      }

      // Count user's groups
      var allGroups = req.app.locals.groups || [];
      var groupCount = allGroups.filter(function(g) {
        return g.createdBy === userId || (g.members && g.members.some(function(m) { return m.id === userId; }));
      }).length;

      // Build planning flags from user's groups
      allGroups.forEach(function(g) {
        if ((g.createdBy === userId || (g.members && g.members.some(function(m) { return m.id === userId; }))) && g.flag) {
          if (planningFlags.indexOf(g.flag) === -1) planningFlags.push(g.flag);
        }
      });

      var user = req.session.user;
      user.visitedCountries = visitedFlags;
      user.visitedCities = visitedCityList;
      user.planningCountries = planningFlags;
      user.groups_created = groupCount;

      res.render("profile", { user: user, image: image });
    }
  );
});

app.post("/profile/upload", requireAuth, function (req, res) {
  if (!req.files || !req.files.profilePicture) {
    return res.redirect("/profile");
  }

  var file = req.files.profilePicture;
  var uploadDir = path.join(__dirname, "assets/uploads");

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  var timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 15);
  var safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  var fileName = timestamp + "_" + safeName;
  var filePath = path.join(uploadDir, fileName);

  file.mv(filePath, function (err) {
    if (err) {
      console.error("File upload error:", err);
      return res.redirect("/profile");
    }

    var dbPath = "/uploads/" + fileName;

    connection.query(
      "UPDATE tbl_users SET profilePictureUrl = ?, profilePictureAlt = ? WHERE IDuser = ?",
      [dbPath, "Profile picture", req.session.user.id],
      function (dbErr) {
        if (dbErr) {
          console.error("DB update error:", dbErr);
        } else {
          req.session.user.profilePictureUrl = dbPath;
          console.log("Profile picture updated:", dbPath);
        }

        req.session.save(function () {
          res.redirect("/profile");
        });
      }
    );
  });
});

app.get("/profile/confirmed", requireAuth, (req, res) => {
  res.render("profile/confirmed", { user: req.session.user || null });
});

app.get("/upload", requireAuth, (req, res) => {
  const userId = req.session.user.id;

  connection.query(
    "SELECT profilePictureUrl FROM tbl_users WHERE IDuser = ?",
    [userId],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Database error");
      }

      const userData = results[0];

      res.render("profile", {
        user: req.session.user,
        message: null,
        type: null,
        image: userData?.profilePictureUrl || null,
      });
    }
  );
});

// ── SETTINGS ─────────────────────────────────────────────────────────────
app.get("/settings", requireAuth, (req, res) => {
  res.render("settings", { user: req.session.user || null });
});

// ── GROUPS / USERS ROUTES ────────────────────────────────────────────────
app.use("/groups", require("./routes/groups"));
app.use("/users", require("./routes/users"));

// ── ERROR HANDLING ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render("error", {
    status: 404,
    message: "Page not found",
    user: req.session.user || null,
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("error", {
    status: 500,
    message: "Something went wrong",
    user: req.session.user || null,
  });
});

// ── SOCKET.IO + START SERVER ───────────────────────────────────────────────
const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);
const io = new Server(server);

// In-memory chat history per group
var chatHistory = {};

io.on("connection", function(socket) {
  console.log("Socket connected:", socket.id);

  socket.on("join-group", function(data) {
    var room = "group-" + data.groupId;
    socket.join(room);
    socket.userData = { userId: data.userId, userName: data.userName, groupId: data.groupId };
    socket.emit("chat-history", chatHistory[room] || []);
    socket.to(room).emit("user-joined", { userName: data.userName });
    console.log(data.userName + " joined room " + room);
  });

  socket.on("send-message", function(data) {
    var room = "group-" + data.groupId;
    var msg = {
      id: Date.now() + "-" + Math.random().toString(36).substr(2, 5),
      userId: data.userId,
      userName: data.userName,
      user: data.userName,
      text: data.text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    if (!chatHistory[room]) chatHistory[room] = [];
    chatHistory[room].push(msg);
    if (chatHistory[room].length > 200) chatHistory[room] = chatHistory[room].slice(-200);
    io.to(room).emit("new-message", msg);
  });

  socket.on("disconnect", function() {
    console.log("Socket disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, function() {
  console.log("Server running on http://localhost:" + PORT);
  console.log("Socket.io enabled for real-time chat");
});

module.exports = app;