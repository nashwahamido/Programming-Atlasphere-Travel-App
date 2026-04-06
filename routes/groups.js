var express = require("express");
var router = express.Router();
var crypto = require("crypto");
var countries = require("../data/countries");

// ── In-memory groups storage (starts empty — no template groups) ────────
function getGroups(req) {
  if (!req.app.locals.groups) {
    req.app.locals.groups = [];
  }
  return req.app.locals.groups;
}

function generateInviteCode() {
  return crypto.randomBytes(6).toString("hex");
}

// ── API: return user's groups as JSON (for sidebar) ─────────────────────
router.get("/api/my-groups", function (req, res) {
  var groups = getGroups(req);
  var user = req.session.user;

  var userGroups = user
    ? groups.filter(function (g) {
        return g.members.some(function (m) { return m.id === user.id; }) || g.createdBy === user.id;
      })
    : [];

  res.json(userGroups.map(function (g) {
    return { id: g.id, name: g.name, destination: g.destination, flag: g.flag || "", color: g.color || "#3B5F8A" };
  }));
});

// ── Group creation flow (MUST be before /:id) ───────────────────────────

router.get("/create/country", function (req, res) {
  res.render("groups/create-country", {
    title: "Choose Destination",
    user: req.session.user || null,
    countries: countries
  });
});

router.get("/create/city", function (req, res) {
  var countryName = req.query.country || "";
  var country = countries.find(function (c) {
    return c.name.toLowerCase() === countryName.toLowerCase();
  });
  var cities = country ? country.cities : [];
  var flag = country ? country.flag : "";

  res.render("groups/create-city", {
    title: "Choose Cities",
    user: req.session.user || null,
    countryName: country ? country.name : countryName,
    countryFlag: flag,
    cities: cities
  });
});

router.get("/create/days", function (req, res) {
  res.render("groups/create-days", {
    title: "Trip Length",
    user: req.session.user || null,
    country: req.query.country || "",
    cities: req.query.cities || ""
  });
});

// Create the group and show confirm page with invite options
router.get("/create/confirm", function (req, res) {
  var groups = getGroups(req);
  var user = req.session.user;

  var countryName = req.query.country || "My Trip";
  var cities = req.query.cities || "";
  var days = parseInt(req.query.days) || 7;
  var inviteCode = generateInviteCode();

  // Look up the flag
  var country = countries.find(function (c) {
    return c.name.toLowerCase() === countryName.toLowerCase();
  });
  var flag = country ? country.flag : "";

  // Assign alternating colors
  var colors = ["#3B5F8A", "#E8933A", "#2D8B6F", "#8B5A2B", "#6A5ACD"];
  var colorIndex = groups.length % colors.length;

  var newGroup = {
    id: Date.now(),
    name: countryName,
    destination: countryName,
    flag: flag,
    cities: cities.split(",").filter(Boolean),
    inviteCode: inviteCode,
    days: days,
    color: colors[colorIndex],
    members: user ? [{ id: user.id, username: user.username, email: user.email }] : [],
    createdBy: user ? user.id : null
  };
  groups.push(newGroup);

  req.session.currentGroupId = newGroup.id;

  var inviteLink = req.protocol + "://" + req.get("host") + "/groups/join/" + inviteCode;

  res.render("groups/create-confirm", {
    title: "Group Created",
    user: user || null,
    group: newGroup,
    inviteLink: inviteLink,
    inviteSuccess: null,
    inviteError: null
  });
});

// ── Invite by email ─────────────────────────────────────────────────────
router.post("/invite", async function (req, res) {
  var groups = getGroups(req);
  var groupId = req.body.groupId;
  var friendEmail = req.body.friendEmail;
  var user = req.session.user;

  var group = groups.find(function (g) { return g.id == groupId; });
  if (!group) {
    return res.status(404).send("Group not found");
  }

  var inviteLink = req.protocol + "://" + req.get("host") + "/groups/join/" + group.inviteCode;

  var nodemailer = require("nodemailer");
  var transporter = req.app.locals.transporter;

  if (!transporter) {
    console.log("No email transporter. Invite link: " + inviteLink);
    return res.render("groups/create-confirm", {
      title: "Group Created", user: user || null, group: group,
      inviteLink: inviteLink,
      inviteSuccess: "Invite link generated (email not configured): " + inviteLink,
      inviteError: null
    });
  }

  try {
    var senderName = user ? user.username : "Someone";
    await transporter.sendMail({
      from: "Atlasphere <noreply@atlasphere.com>",
      to: friendEmail,
      subject: senderName + " invited you to join " + group.name + " on Atlasphere!",
      html: "<div style=\"font-family:Arial;max-width:480px;margin:0 auto;padding:32px\">" +
            "<h1 style=\"color:#0B3856\">You're invited!</h1>" +
            "<p style=\"font-size:16px;color:#555\">" + senderName + " wants you to join their trip group <strong>" + group.name + "</strong> on Atlasphere.</p>" +
            "<div style=\"text-align:center;margin:32px 0\">" +
            "<a href=\"" + inviteLink + "\" style=\"display:inline-block;padding:14px 40px;background:#E8933A;color:#fff;text-decoration:none;border-radius:30px;font-weight:700;font-size:16px\">Join Group</a>" +
            "</div>" +
            "<p style=\"color:#888;font-size:14px\">Or copy this link: " + inviteLink + "</p>" +
            "</div>"
    });

    console.log("Invite email sent to: " + friendEmail);

    res.render("groups/create-confirm", {
      title: "Group Created", user: user || null, group: group,
      inviteLink: inviteLink,
      inviteSuccess: "Invite sent to " + friendEmail + "!",
      inviteError: null
    });
  } catch (err) {
    console.error("Invite email error:", err.message);
    res.render("groups/create-confirm", {
      title: "Group Created", user: user || null, group: group,
      inviteLink: inviteLink,
      inviteSuccess: null,
      inviteError: "Failed to send email. Share this link instead: " + inviteLink
    });
  }
});

// ── Join via invite link ────────────────────────────────────────────────
router.get("/join/:code", function (req, res) {
  var groups = getGroups(req);
  var group = groups.find(function (g) { return g.inviteCode === req.params.code; });

  if (!group) {
    return res.status(404).render("error", {
      status: 404, message: "Invalid or expired invite link", user: req.session.user || null
    });
  }

  var user = req.session.user;

  if (!user) {
    req.session.pendingInvite = req.params.code;
    req.session.save(function () {
      res.redirect("/auth/register");
    });
    return;
  }

  var alreadyMember = group.members.find(function (m) { return m.id === user.id; });
  if (!alreadyMember) {
    group.members.push({ id: user.id, username: user.username, email: user.email });
    console.log(user.username + " joined group: " + group.name);
  }

  res.redirect("/groups/" + group.id);
});

// ── List all groups ─────────────────────────────────────────────────────
router.get("/", function (req, res) {
  var groups = getGroups(req);
  var user = req.session.user;

  var userGroups = user
    ? groups.filter(function (g) {
        return g.members.some(function (m) { return m.id === user.id; }) || g.createdBy === user.id;
      })
    : [];

  if (userGroups.length === 0) {
    return res.redirect("/groups/create/country");
  }

  res.render("groups/groupPage", {
    user: user || null,
    group: userGroups[0],
    groups: userGroups,
    tripDays: userGroups[0].days || 7
  });
});

// ── Individual group page (MUST be last) ────────────────────────────────
router.get("/:id", function (req, res) {
  var groups = getGroups(req);
  var user = req.session.user;
  var groupId = req.params.id;
  var group = groups.find(function (g) { return g.id == groupId; });

  if (!group) {
    return res.status(404).render("error", {
      status: 404, message: "Group not found", user: user || null
    });
  }

  var userGroups = user
    ? groups.filter(function (g) {
        return g.members.some(function (m) { return m.id === user.id; }) || g.createdBy === user.id;
      })
    : [group];

  res.render("groups/groupPage", {
    user: user || null,
    group: group,
    groups: userGroups,
    tripDays: group.days || 7
  });
});


// ── Delete group ────────────────────────────────────────────────────────
router.post("/delete/:id", function (req, res) {
  var groups = getGroups(req);
  req.app.locals.groups = groups.filter(function (g) { return g.id != req.params.id; });
  res.redirect("/settings");
});

// ── Rename group ────────────────────────────────────────────────────────
router.post("/rename/:id", function (req, res) {
  var groups = getGroups(req);
  var group = groups.find(function (g) { return g.id == req.params.id; });
  if (group && req.body.newName) {
    group.name = req.body.newName;
  }
  res.redirect("/settings");
});

module.exports = router;