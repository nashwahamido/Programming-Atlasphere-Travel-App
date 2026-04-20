/**
 * Validation rules for all routes.
 * Uses express-validator for sanitisation and validation.
 */
const { check } = require("express-validator");

// ── Auth ────────────────────────────────────────────────────────────────
const login = [
  check("loginemail")
    .trim()
    .exists({ checkFalsy: true }).withMessage("Email is required")
    .isEmail().withMessage("Invalid email format"),
  check("loginpsw")
    .trim()
    .exists({ checkFalsy: true }).withMessage("Password is required"),
];

const register = [
  check("username")
    .trim()
    .exists({ checkFalsy: true }).withMessage("Username is required")
    .isString().withMessage("Username must be a string")
    .isLength({ min: 3, max: 20 }).withMessage("Username must be 3–20 characters")
    .escape(),
  check("useremail")
    .trim()
    .exists({ checkFalsy: true }).withMessage("Email is required")
    .isEmail().withMessage("Invalid email format")
    .normalizeEmail(),
  check("userphone")
    .trim()
    .isMobilePhone().withMessage("Invalid phone number"),
  check("gender")
    .optional(),
  check("psw")
    .trim()
    .exists({ checkFalsy: true }).withMessage("Password is required")
    .isLength({ min: 6, max: 12 }).withMessage("Password must be 6–12 characters"),
];

const verify = [
  check(["code1", "code2", "code3", "code4", "code5", "code6"])
    .exists({ checkFalsy: true }).withMessage("All code fields are required")
    .isInt().withMessage("Each code must be a number")
    .isLength({ min: 1, max: 1 }).withMessage("Each code must be a single digit")
    .trim(),
];

// ── Password reset ──────────────────────────────────────────────────────
const forgotPassword = [
  check("email")
    .trim()
    .exists({ checkFalsy: true }).withMessage("Email is required")
    .isEmail().withMessage("Invalid email format")
    .normalizeEmail(),
];

const resetPassword = [
  check("token")
    .trim()
    .exists({ checkFalsy: true }).withMessage("Reset token is required")
    .isHexadecimal().withMessage("Invalid token format"),
  check("password")
    .trim()
    .exists({ checkFalsy: true }).withMessage("Password is required")
    .isLength({ min: 6, max: 12 }).withMessage("Password must be 6–12 characters"),
  check("confirmPassword")
    .trim()
    .exists({ checkFalsy: true }).withMessage("Please confirm your password")
    .custom((value, { req }) => {
      if (value !== req.body.password) throw new Error("Passwords do not match");
      return true;
    }),
];

// ── API endpoints ───────────────────────────────────────────────────────
const vote = [
  check("groupId")
    .trim()
    .exists({ checkFalsy: true }).withMessage("Group ID is required")
    .escape(),
  check("activityId")
    .exists({ checkFalsy: true }).withMessage("Activity ID is required"),
  check("activityName")
    .trim()
    .exists({ checkFalsy: true }).withMessage("Activity name is required")
    .isLength({ max: 200 }).withMessage("Activity name too long")
    .escape(),
  check("vote")
    .exists({ checkFalsy: true }).withMessage("Vote is required")
    .isIn(["upvote", "bookmark", "downvote"]).withMessage("Vote must be upvote, bookmark, or downvote"),
];

const itineraryBlock = [
  check("groupId")
    .trim()
    .exists({ checkFalsy: true }).withMessage("Group ID is required"),
  check("dayIndex")
    .exists().withMessage("Day index is required")
    .isInt({ min: 0 }).withMessage("Day index must be a non-negative integer"),
  check("timeSlot")
    .trim()
    .exists({ checkFalsy: true }).withMessage("Time slot is required")
    .matches(/^\d{2}\.\d{2}$/).withMessage("Time slot must be in HH.MM format"),
  check("activityName")
    .trim()
    .exists({ checkFalsy: true }).withMessage("Activity name is required")
    .isLength({ max: 200 }).withMessage("Activity name too long")
    .escape(),
  check("duration")
    .optional()
    .isFloat({ min: 0.5, max: 6 }).withMessage("Duration must be between 0.5 and 6 hours"),
];

const itineraryDates = [
  check("groupId")
    .trim()
    .exists({ checkFalsy: true }).withMessage("Group ID is required"),
  check("rangeStart")
    .isInt({ min: 1, max: 31 }).withMessage("Start date must be 1–31"),
  check("rangeEnd")
    .isInt({ min: 1, max: 31 }).withMessage("End date must be 1–31"),
  check("calYear")
    .isInt({ min: 2020, max: 2100 }).withMessage("Invalid year"),
  check("calMonth")
    .isInt({ min: 0, max: 11 }).withMessage("Invalid month"),
];

const invite = [
  check("groupId")
    .trim()
    .exists({ checkFalsy: true }).withMessage("Group ID is required"),
  check("query")
    .trim()
    .exists({ checkFalsy: true }).withMessage("Username or email is required")
    .isLength({ min: 2, max: 100 }).withMessage("Search query must be 2–100 characters"),
];

const saveActivities = [
  check("groupId")
    .trim()
    .exists({ checkFalsy: true }).withMessage("Group ID is required"),
  check("activities")
    .isArray().withMessage("Activities must be an array"),
];

const groupRename = [
  check("name")
    .trim()
    .exists({ checkFalsy: true }).withMessage("Group name is required")
    .isLength({ min: 1, max: 100 }).withMessage("Group name must be 1–100 characters")
    .escape(),
];

module.exports = {
  login,
  register,
  verify,
  forgotPassword,
  resetPassword,
  vote,
  itineraryBlock,
  itineraryDates,
  invite,
  saveActivities,
  groupRename,
};