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
const { check, validationResult } = require("express-validator");

// ── Validation Rules ────────────────────────────────────────────────────
const validationRegisterRules = [
  check("username")
    .exists({ checkFalsy: true }).withMessage("Username is required")
    .isString().withMessage("Username must be a string")
    .trim()
    .isLength({ min: 3, max: 20 }).withMessage("Username must be 3–20 characters")
    .escape(),
  check("useremail")
    .exists({ checkFalsy: true }).withMessage("Email is required")
    .isEmail().withMessage("Invalid email format")
    .normalizeEmail(),
  check("userphone")
    .isMobilePhone().withMessage("Invalid phone number"),
  check("gender")
    .optional(),
  check("psw")
    .exists({ checkFalsy: true }).withMessage("Password is required")
    .isLength({ min: 6, max: 12 }).withMessage("Password must be at least 6 characters or a maximum of 12")
];

const validationVerifyRules = [
  check(["code1", "code2", "code3", "code4", "code5", "code6"])
    .exists({ checkFalsy: true }).withMessage("All code fields are required")
    .isInt().withMessage("Each code must be a number")
    .isLength({ min: 1, max: 1 }).withMessage("Each code must be a single number")
    .trim(),
];

const validationLoginRules = [
  check("loginemail")
    .exists({ checkFalsy: true }).withMessage("Email is required")
    .isEmail().withMessage("Invalid email format"),
  check("loginpsw")
    .exists({ checkFalsy: true }).withMessage("Password is required")
];

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
  timezone: '+00:00',
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

app.post("/auth/login", validationLoginRules, (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render("login", {
      title: "Sign In",
      error: errors.array().map(e => e.msg).join(", "),
      user: null,
    });
  }

  const username = req.body.loginuser || req.body.loginemail;
  const password = req.body.loginpsw;

  console.log("Login attempt:", { username, passwordLength: password ? password.length : 0, body: Object.keys(req.body) });

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
        console.log("Login: No user found for:", username);
        return res.render("login", {
          title: "Sign In",
          error: "Invalid username or password. Try again.",
          user: null,
        });
      }

      const user = results[0];
      let match = false;
      console.log("Login: Found user:", user.username, "email:", user.email, "has password hash:", !!user.password);

      try {
        match = await bcrypt.compare(password, user.password);
      } catch (err) {
        match = false;
      }

      if (!match && password === user.password) {
        match = true;
      }

      console.log("Login: bcrypt match:", match);

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
        profilePictureUrl: user.profilePictureUrl || '',
      };

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).send("Session error");
        }

        // Check if user has any groups — if so, go straight to groups
        connection.query(
          "SELECT COUNT(*) as cnt FROM tbl_group_members WHERE userId = ?",
          [user.IDuser],
          function (grpErr, grpRows) {
            if (!grpErr && grpRows && grpRows[0].cnt > 0) {
              res.redirect("/groups");
            } else {
              res.redirect("/profile");
            }
          }
        );
      });
    }
  );
});

// ── REGISTER ─────────────────────────────────────────────────────────────
app.get("/auth/register", (req, res) => {
  res.render("register", { title: "Register", user: null });
});

app.post("/auth/register", validationRegisterRules, async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render("register", {
      title: "Register",
      error: errors.array().map(e => e.msg).join(", "),
      user: null,
    });
  }
  
  console.log("New registration:", req.body);

  try {
    const { username, useremail, userphone, gender, psw } = req.body;

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
        const genderId = gender && !isNaN(Number(gender)) ? Number(gender) : null;

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

app.post("/auth/verify", validationVerifyRules, (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render("register-step2", {
      title: "Verify",
      user: null,
      email: req.session.pendingVerification?.email || null,
      error: "Please enter all 6 numbers correctly.",
      success: null,
    });
  }

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
      if (err) console.error("Resend code DB update error:", err);

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

// Upload from profile page (redirects back to /profile)
app.post("/profile/upload", requireAuth, (req, res) => {
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

app.get("/setup/countries", requireAuth, (req, res) => {
  res.render("groups/profile/countries", {
    title: "Countries Visited",
    user: req.session.user || null,
    countries: countries
  });
});

app.get("/setup/cities", requireAuth, (req, res) => {
  var selectedCodes = req.query["countries[]"] || req.query.countries || [];
  if (typeof selectedCodes === "string") selectedCodes = selectedCodes.split(",").filter(Boolean);

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

app.post("/setup/save-visited", requireAuth, (req, res) => {
  var visitedCountryCodes = (req.body.countries || "").split(",").filter(Boolean);
  var visitedCities = req.body["cities[]"] || [];
  if (typeof visitedCities === "string") visitedCities = [visitedCities];

  req.session.user.visitedCities = visitedCities;

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
  console.log('Profile userId:', userId);

  connection.query(
    "SELECT profilePictureUrl, visitedCountries, visitedCities FROM tbl_users WHERE IDuser = ?",
    [userId],
    function (err, results) {
      var image = null;
      var visitedFlags = [];
      var visitedCityList = [];

      if (err) {
        console.error("Profile query error:", err.message);
      }

      if (!err && results && results.length > 0) {
        image = results[0].profilePictureUrl || null;

        var visitedCodes = (results[0].visitedCountries || "").split(",").filter(Boolean);
        visitedCodes.forEach(function(code) {
          var country = countries.find(function(c) { return c.code.toLowerCase() === code.toLowerCase(); });
          if (country) visitedFlags.push({ code: country.code, name: country.name });
        });

        visitedCityList = (results[0].visitedCities || "").split(",").filter(Boolean);
      }

      if (!image && req.session.user.profilePictureUrl) {
        image = req.session.user.profilePictureUrl;
      }
      if (visitedFlags.length === 0 && req.session.user.visitedCountries) {
        visitedFlags = req.session.user.visitedCountries;
      }
      if (visitedCityList.length === 0 && req.session.user.visitedCities) {
        visitedCityList = req.session.user.visitedCities;
      }

      connection.query(
        "SELECT g.* FROM tbl_groups g INNER JOIN tbl_group_members gm ON g.id = gm.groupId WHERE gm.userId = ?",
        [userId],
        function (grpErr, grpRows) {
          var groupCount = 0;
          var planningFlags = [];

          if (!grpErr && grpRows) {
            groupCount = grpRows.length;
            grpRows.forEach(function (g) {
              console.log('Group:', g.name, '| destination:', g.destination);
              var destination = g.name || g.destination || '';
              var country = countries.find(function(c) {
                return c.name.toLowerCase() === destination.toLowerCase();
              });
              if (country) {
                var alreadyAdded = planningFlags.some(function(f) { return f.code === country.code; });
                if (!alreadyAdded) {
                  planningFlags.push({ code: country.code, name: country.name });
                }
              }
            });
          }

          var user = req.session.user;
          user.visitedCountries = visitedFlags;
          user.visitedCities = visitedCityList;
          user.planningCountries = planningFlags;
          user.groups_created = groupCount;

          res.render("profile", { user: user, image: image });
        }
      );
    }
  );
});

// ── SETTINGS ─────────────────────────────────────────────────────────────
app.get("/settings", requireAuth, (req, res) => {
  const userId = req.session.user.id;
  connection.query(
    "SELECT u.*, g.Value as genderValue FROM tbl_users u LEFT JOIN tbl_gender g ON u.FIDgender = g.IDgender WHERE u.IDuser = ?",
    [userId],
    function(err, results) {
      if (err) {
        console.error("Settings query error:", err.message);
        return res.redirect("/");
      }
      
      const user = results[0] || req.session.user;
      // Parse visited countries and cities from DB
      const visitedCountryCodes = (user.visitedCountries || '').split(',').filter(Boolean);
      const visitedCityNames = (user.visitedCities || '').split(',').filter(Boolean);
      user.visitedCountries = visitedCountryCodes;
      user.visitedCities = visitedCityNames;

      // Load user's groups from DB
      connection.query(
        "SELECT g.* FROM tbl_groups g INNER JOIN tbl_group_members gm ON g.id = gm.groupId WHERE gm.userId = ?",
        [userId],
        function(grpErr, grpRows) {
          var groups = grpRows || [];
          res.render("settings", {
            user: user,
            groups: groups,
            allCountriesData: countries
          });
        }
      );
    }
  );
});

// ── Activities ────────────────────────────────────────────────
app.get("/groups/create/activities", requireAuth, (req, res) => {
  res.render("groups/activities", {
    title: "Activities",
    user: req.session.user || null,
    groupId: req.query.groupId || ''
  });
});


// ── GROUPS / USERS ROUTES ────────────────────────────────────────────────
app.use("/groups", require("./routes/groups"));
app.use("/users", require("./routes/users"));

// ── API Route ────────────────────────────────────────────────
const axios = require("axios");

function inferTags(name, ranking, subcategory) {
  var text = [
    name || "",
    ranking || "",
    subcategory || ""
  ].join(" ").toLowerCase();

  var tags = [];

  if (
    text.includes("museum") ||
    text.includes("church") ||
    text.includes("cathedral") ||
    text.includes("historic") ||
    text.includes("monument") ||
    text.includes("archae")
  ) {
    tags.push("Culture");
  }

  if (
    text.includes("park") ||
    text.includes("garden") ||
    text.includes("beach") ||
    text.includes("nature") ||
    text.includes("trail")
  ) {
    tags.push("Nature");
  }

  if (
    text.includes("bar") ||
    text.includes("night") ||
    text.includes("club") ||
    text.includes("pub")
  ) {
    tags.push("Nightlife");
  }

  if (
    text.includes("food") ||
    text.includes("market") ||
    text.includes("wine") ||
    text.includes("culinary")
  ) {
    tags.push("Food");
  }

  if (
    text.includes("spa") ||
    text.includes("relax") ||
    text.includes("thermal")
  ) {
    tags.push("Relax");
  }

  if (
    text.includes("hike") ||
    text.includes("bike") ||
    text.includes("adventure") ||
    text.includes("sport") ||
    text.includes("climb")
  ) {
    tags.push("Active");
  }

  if (tags.length === 0) {
    tags.push("Explore");
  }

  return tags;
}

function scoreAttraction(item, preferences) {
  var prefList = preferences || [];
  var matched = 0;
  var itemTags = item.tags || [];

  prefList.forEach(function (pref) {
    if (itemTags.indexOf(pref) !== -1) {
      matched += 1;
    }
  });

  return matched;
}

app.get("/api/recommendations", requireAuth, async (req, res) => {
  var city = req.query.city || "Rome";
  console.log("Requested city:", city);

  var preferences = req.query.activities
    ? req.query.activities.split(",").map(function (s) { return s.trim(); }).filter(Boolean)
    : [];

  try {
    // Step 1: search location
    var locationResponse = await axios.get(
      "https://travel-advisor.p.rapidapi.com/locations/search",
      {
        params: {
          query: city,
          limit: "50",
          offset: "0",
          units: "km",
          location_id: "1",
          sort: "relevance",
          lang: "en_US"
        },
        headers: {
          "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
          "X-RapidAPI-Host": process.env.RAPIDAPI_HOST
        }
      }
    );

    var locationData = locationResponse.data && locationResponse.data.data
      ? locationResponse.data.data
      : [];

    var geoResult = locationData.find(function (item) {
      return item.result_type === "geos";
    });

    if (!geoResult || !geoResult.result_object || !geoResult.result_object.location_id) {
      return res.json([]);
    }

    var locationId = geoResult.result_object.location_id;

    // Step 2: get attractions for that location
    var attractionsResponse = await axios.get(
      "https://travel-advisor.p.rapidapi.com/attractions/list",
      {
        params: {
          location_id: locationId,
          currency: "EUR",
          lang: "en_US",
          lunit: "km",
          sort: "recommended"
        },
        headers: {
          "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
          "X-RapidAPI-Host": process.env.RAPIDAPI_HOST
        }
      }
    );

    var attractionData = attractionsResponse.data && attractionsResponse.data.data
      ? attractionsResponse.data.data
      : [];

    var normalized = attractionData
      .filter(function (item) {
        return item && item.name;
      })
      .map(function (item, index) {
        var image =
          item.photo &&
          item.photo.images &&
          item.photo.images.large &&
          item.photo.images.large.url
            ? item.photo.images.large.url
            : "/images/fallback.jpg";

        var ranking = item.ranking || "";
        var subcategory =
          item.subcategory && item.subcategory.length > 0
            ? item.subcategory.map(function (x) { return x.name; }).join(" ")
            : "";

        var tags = inferTags(item.name, ranking, subcategory);

        return {
          id: item.location_id || index + 1,
          name: item.name,
          tags: tags,
          description:
            item.description ||
            item.ranking ||
            "A popular attraction worth exploring during your trip.",
          image: image,
          rating: item.rating || null,
          location: city
        };
      });

    var sorted = normalized
      .map(function (item) {
        return {
          item: item,
          score: scoreAttraction(item, preferences)
        };
      })
      .sort(function (a, b) {
        return b.score - a.score;
      })
      .map(function (entry) {
        return entry.item;
      });

    res.json(sorted.slice(0, 50));
  } catch (error) {
    console.error(
      "Travel Advisor API error:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({ error: "Failed to fetch recommendations." });
  }
});


// ── VOTE API ────────────────────────────────────────────────────────────

app.post("/api/votes", requireAuth, (req, res) => {
  var userId = req.session.user.id;
  var userName = req.session.user.username || 'Someone';
  var { groupId, activityId, activityName, activityImage, activityDesc, activityTags, vote } = req.body;
  console.log("Vote POST:", { groupId, activityId, activityName: activityName ? activityName.substring(0, 30) : '', vote, userId });
  if (!groupId || !activityId || !vote) return res.status(400).json({ error: "Missing fields" });
  var tagsStr = Array.isArray(activityTags) ? activityTags.join(",") : (activityTags || "");
  connection.query(
    "INSERT INTO tbl_activity_votes (groupId, userId, activityId, activityName, activityImage, activityDesc, activityTags, `vote`) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE `vote` = ?, activityName = ?, activityImage = ?, activityDesc = ?, activityTags = ?",
    [groupId, userId, activityId, activityName || "", activityImage || "", activityDesc || "", tagsStr, vote, vote, activityName || "", activityImage || "", activityDesc || "", tagsStr],
    function(err) {
      if (err) { console.error("Vote save error:", err.message); return res.status(500).json({ error: "Failed" }); }

      // Create notifications for other group members
      if (vote !== 'downvote') {
        var voteLabel = vote === 'upvote' ? 'upvoted' : 'bookmarked';
        connection.query("SELECT g.name as groupName, gm.userId FROM tbl_group_members gm JOIN tbl_groups g ON g.id = gm.groupId WHERE gm.groupId = ? AND gm.userId != ?",
          [groupId, userId],
          function(nErr, members) {
            if (nErr || !members || members.length === 0) return;
            var groupName = members[0].groupName;
            var msg = userName + ' ' + voteLabel + ' "' + (activityName || 'an activity').substring(0, 60) + '"';
            var values = members.map(function(m) { return [m.userId, groupId, groupName, msg, 'vote']; });
            connection.query("INSERT INTO tbl_notifications (userId, groupId, groupName, message, type) VALUES ?", [values], function(iErr) {
              if (iErr) console.error("Notification insert error:", iErr.message);
              // Emit socket notification to group
              io.to("group-" + groupId).emit("new-notification", { groupId: groupId, groupName: groupName, message: msg });
            });
          }
        );
      }

      res.json({ success: true });
    }
  );
});

app.get("/api/votes", requireAuth, (req, res) => {
  var groupId = req.query.groupId;
  if (!groupId) return res.json([]);
  connection.query(
    "SELECT DISTINCT activityId, activityName, activityImage, activityDesc, activityTags, `vote` FROM tbl_activity_votes WHERE groupId = ?",
    [groupId],
    function(err, rows) { res.json(!err && rows ? rows : []); }
  );
});

app.get("/api/votes/saved", requireAuth, (req, res) => {
  var groupId = req.query.groupId;
  var type = req.query.type;
  console.log("Vote SAVED GET:", { groupId, type });
  if (!groupId) return res.json([]);
  var sql = "SELECT DISTINCT activityId, activityName, activityImage, activityDesc, activityTags, `vote` FROM tbl_activity_votes WHERE groupId = ?";
  var params = [groupId];
  if (type === 'upvote' || type === 'bookmark') { sql += " AND `vote` = ?"; params.push(type); }
  else { sql += " AND `vote` IN ('upvote', 'bookmark')"; }
  connection.query(sql, params, function(err, rows) {
    console.log("Vote saved result:", { err: err ? err.message : null, count: rows ? rows.length : 0 });
    res.json(!err && rows ? rows : []);
  });
});

// ── ITINERARY BLOCKS API ─────────────────────────────────────────────────

// Save a single block (upsert)
app.post("/api/itinerary/block", requireAuth, (req, res) => {
  var userId = req.session.user.id;
  var { groupId, dayIndex, timeSlot, activityName, activityColor } = req.body;
  if (!groupId || dayIndex === undefined || !timeSlot || !activityName) return res.status(400).json({ error: "Missing fields" });
  connection.query(
    "INSERT INTO tbl_itinerary_blocks (groupId, dayIndex, timeSlot, activityName, activityColor, updatedBy) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE activityName = ?, activityColor = ?, updatedBy = ?",
    [groupId, dayIndex, timeSlot, activityName, activityColor || '#E8933A', userId, activityName, activityColor || '#E8933A', userId],
    function(err) {
      if (err) { console.error("Block save error:", err.message); return res.status(500).json({ error: "Failed" }); }
      res.json({ success: true });
    }
  );
});

// Delete a single block
app.delete("/api/itinerary/block", requireAuth, (req, res) => {
  var { groupId, dayIndex, timeSlot } = req.body;
  if (!groupId || dayIndex === undefined || !timeSlot) return res.status(400).json({ error: "Missing fields" });
  connection.query(
    "DELETE FROM tbl_itinerary_blocks WHERE groupId = ? AND dayIndex = ? AND timeSlot = ?",
    [groupId, dayIndex, timeSlot],
    function(err) {
      if (err) { console.error("Block delete error:", err.message); return res.status(500).json({ error: "Failed" }); }
      res.json({ success: true });
    }
  );
});

// Save all blocks for a group (full replace) - kept for compatibility
app.post("/api/itinerary/blocks", requireAuth, (req, res) => {
  var userId = req.session.user.id;
  var { groupId, blocks } = req.body;
  console.log("Itinerary save:", { groupId, userId, blockCount: blocks ? blocks.length : 0 });
  if (!groupId) return res.status(400).json({ error: "Missing groupId" });

  // Delete existing blocks for this group, then insert new ones
  connection.query("DELETE FROM tbl_itinerary_blocks WHERE groupId = ?", [groupId], function(err) {
    if (err) { console.error("Itinerary delete error:", err.message); return res.status(500).json({ error: "Failed" }); }

    if (!blocks || blocks.length === 0) return res.json({ success: true });

    var values = blocks.map(function(b) {
      return [groupId, b.dayIndex, b.timeSlot, b.activityName, b.activityColor || '#E8933A', userId];
    });

    connection.query(
      "INSERT INTO tbl_itinerary_blocks (groupId, dayIndex, timeSlot, activityName, activityColor, updatedBy) VALUES ?",
      [values],
      function(insertErr) {
        if (insertErr) { console.error("Itinerary insert error:", insertErr.message); return res.status(500).json({ error: "Failed" }); }
        res.json({ success: true });
      }
    );
  });
});

// Load blocks for a group
app.get("/api/itinerary/blocks", requireAuth, (req, res) => {
  var groupId = req.query.groupId;
  if (!groupId) return res.json([]);
  connection.query(
    "SELECT dayIndex, timeSlot, activityName, activityColor FROM tbl_itinerary_blocks WHERE groupId = ? ORDER BY dayIndex, timeSlot",
    [groupId],
    function(err, rows) {
      res.json(!err && rows ? rows : []);
    }
  );
});

// Save shared date range for a group
app.post("/api/itinerary/dates", requireAuth, (req, res) => {
  var { groupId, rangeStart, rangeEnd, calYear, calMonth } = req.body;
  if (!groupId) return res.status(400).json({ error: "Missing groupId" });
  connection.query(
    "INSERT INTO tbl_itinerary_dates (groupId, rangeStart, rangeEnd, calYear, calMonth) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE rangeStart = ?, rangeEnd = ?, calYear = ?, calMonth = ?",
    [groupId, rangeStart, rangeEnd, calYear, calMonth, rangeStart, rangeEnd, calYear, calMonth],
    function(err) {
      if (err) { console.error("Date save error:", err.message); return res.status(500).json({ error: "Failed" }); }
      res.json({ success: true });
    }
  );
});

// Load shared date range for a group
app.get("/api/itinerary/dates", requireAuth, (req, res) => {
  var groupId = req.query.groupId;
  if (!groupId) return res.json(null);
  connection.query(
    "SELECT rangeStart, rangeEnd, calYear, calMonth FROM tbl_itinerary_dates WHERE groupId = ?",
    [groupId],
    function(err, rows) {
      if (!err && rows && rows.length > 0) return res.json(rows[0]);
      res.json(null);
    }
  );
});

// ── NOTIFICATIONS API ────────────────────────────────────────────────────

// Get notifications for current user
app.get("/api/notifications", requireAuth, (req, res) => {
  var userId = req.session.user.id;
  connection.query(
    "SELECT id, groupId, groupName, message, type, isRead, createdAt FROM tbl_notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 50",
    [userId],
    function(err, rows) {
      if (err) { console.error("Notif load error:", err.message); return res.json([]); }
      // Convert timestamps to ISO and group notifications
      var notifications = (rows || []).map(function(n) {
        return { id: n.id, groupId: n.groupId, groupName: n.groupName, message: n.message, type: n.type, isRead: n.isRead, createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : null };
      });
      var unreadByGroup = {};
      notifications.forEach(function(n) {
        if (!n.isRead) {
          if (!unreadByGroup[n.groupId]) unreadByGroup[n.groupId] = { count: 0, groupName: n.groupName, groupId: n.groupId };
          unreadByGroup[n.groupId].count++;
        }
      });
      var summarizedGroups = {};
      var results = [];
      notifications.forEach(function(n) {
        if (!n.isRead && unreadByGroup[n.groupId] && unreadByGroup[n.groupId].count >= 4 && !summarizedGroups[n.groupId]) {
          summarizedGroups[n.groupId] = true;
          results.push({ id: n.id, groupId: n.groupId, groupName: n.groupName, message: n.groupName + ' has ' + unreadByGroup[n.groupId].count + ' new votes', type: 'vote-summary', isRead: 0, createdAt: n.createdAt });
        } else if (!n.isRead && unreadByGroup[n.groupId] && unreadByGroup[n.groupId].count >= 4) {
          // Skip individual ones for summarized groups
        } else {
          results.push(n);
        }
      });
      res.json(results);
    }
  );
});

// Get unread count
app.get("/api/notifications/count", requireAuth, (req, res) => {
  var userId = req.session.user.id;
  connection.query(
    "SELECT COUNT(*) as cnt FROM tbl_notifications WHERE userId = ? AND isRead = 0",
    [userId],
    function(err, rows) {
      res.json({ count: (!err && rows && rows[0]) ? rows[0].cnt : 0 });
    }
  );
});

// Mark all as read
app.post("/api/notifications/read", requireAuth, (req, res) => {
  var userId = req.session.user.id;
  connection.query("UPDATE tbl_notifications SET isRead = 1 WHERE userId = ?", [userId], function(err) {
    res.json({ success: !err });
  });
});

// Get last active time for a group
app.get("/api/groups/last-active", requireAuth, (req, res) => {
  var groupId = req.query.groupId;
  if (!groupId) return res.json({ lastActive: null });
  connection.query(
    "SELECT createdAt, userName FROM tbl_chat_messages WHERE groupId = ? ORDER BY createdAt DESC LIMIT 1",
    [groupId],
    function(err, rows) {
      if (!err && rows && rows.length > 0) {
        return res.json({ lastActive: new Date(rows[0].createdAt).toISOString(), userName: rows[0].userName });
      }
      res.json({ lastActive: null });
    }
  );
});

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

// ── SOCKET.IO + START SERVER ─────────────────────────────────────────────
const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);
const io = new Server(server);
var roomMembers = {}; // { "group-123": { "userId1": true, ... } }

io.on("connection", function(socket) {
  console.log("Socket connected:", socket.id);

  socket.on("join-group", function(data) {
    var room = "group-" + data.groupId;
    socket.join(room);
    socket.userData = { userId: data.userId, userName: data.userName, groupId: data.groupId, userAvatar: data.userAvatar || '' };

    // Load last 100 messages from DB
    connection.query(
      "SELECT id, groupId, userId, userName, userAvatar, `text`, `time`, `system` FROM tbl_chat_messages WHERE groupId = ? ORDER BY createdAt ASC LIMIT 100",
      [data.groupId],
      function (err, rows) {
        var history = [];
        if (!err && rows) {
          history = rows.map(function (r) {
            return { id: r.id, userId: r.userId, userName: r.userName, userAvatar: r.userAvatar || '', user: r.userName, text: r.text, time: r.time, system: !!r.system };
          });
        }
        socket.emit("chat-history", history);
      }
    );

    // Only broadcast "user joined" if they're not already in the room
    if (!roomMembers[room]) roomMembers[room] = {};
    if (!roomMembers[room][data.userId]) {
      roomMembers[room][data.userId] = true;
      socket.to(room).emit("user-joined", { userName: data.userName });
      console.log(data.userName + " joined room " + room);
    }
  });

  socket.on("send-message", function(data) {
    var room = "group-" + data.groupId;
    var msgId = Date.now() + "-" + Math.random().toString(36).substr(2, 5);
    var timeStr = new Date().toISOString();
    var msg = {
      id: msgId,
      userId: data.userId,
      userName: data.userName,
      userAvatar: data.userAvatar || '',
      user: data.userName,
      text: data.text,
      time: timeStr
    };

    // Save to DB
    connection.query(
      "INSERT INTO tbl_chat_messages (id, groupId, userId, userName, userAvatar, `text`, `time`, `system`) VALUES (?, ?, ?, ?, ?, ?, ?, 0)",
      [msgId, data.groupId, data.userId, data.userName, data.userAvatar || '', data.text, timeStr],
      function (err) {
        if (err) console.error("Message save error:", err.message);
      }
    );

    io.to(room).emit("new-message", msg);
  });

  socket.on("disconnect", function() {
    console.log("Socket disconnected:", socket.id);
    if (socket.userData) {
      var room = "group-" + socket.userData.groupId;
      if (roomMembers[room] && roomMembers[room][socket.userData.userId]) {
        // Check if user has any other sockets still in the room
        var room_sockets = io.sockets.adapter.rooms.get(room);
        var stillConnected = false;
        if (room_sockets) {
          room_sockets.forEach(function(sid) {
            var s = io.sockets.sockets.get(sid);
            if (s && s.userData && s.userData.userId === socket.userData.userId && s.id !== socket.id) {
              stillConnected = true;
            }
          });
        }
        if (!stillConnected) {
          delete roomMembers[room][socket.userData.userId];
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, function() {
  console.log("Server running on http://localhost:" + PORT);
  console.log("Socket.io enabled for real-time chat");
});

module.exports = app;