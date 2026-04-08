const db = require('../config/database');

const User = {
  // Find user by ID
  findById: async (id) => {
    const [rows] = await db.query(
      'SELECT u.*, g.Value as genderValue FROM tbl_users u LEFT JOIN tbl_gender g ON u.FIDgender = g.IDgender WHERE u.IDuser = ?',
      [id]
    );
    return rows[0] || null;
  },

  // Find user by email
  findByEmail: async (email) => {
    const [rows] = await db.query(
      'SELECT u.*, g.Value as genderValue FROM tbl_users u LEFT JOIN tbl_gender g ON u.FIDgender = g.IDgender WHERE u.email = ?',
      [email]
    );
    return rows[0] || null;
  },

  // Update user info
  update: async (id, { username, email, phonenumber, FIDgender }) => {
    const [result] = await db.query(
      'UPDATE tbl_users SET username = ?, email = ?, phonenumber = ?, FIDgender = ? WHERE IDuser = ?',
      [username, email, phonenumber, FIDgender, id]
    );
    return result;
  },

  // Delete user
  delete: async (id) => {
    const [result] = await db.query(
      'DELETE FROM tbl_users WHERE IDuser = ?',
      [id]
    );
    return result;
  }
};

module.exports = User;