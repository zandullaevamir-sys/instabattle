const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);

function getAdminToken() {
  return jwt.sign({ role: 'admin', username: ADMIN_USERNAME }, JWT_SECRET, { expiresIn: '12h' });
}

function verifyToken(token) {
  if (!token) return null;

  try {
    return jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
  } catch (error) {
    return null;
  }
}

function validateAdminCredentials(username, password) {
  if (!username || !password) return false;
  return username === ADMIN_USERNAME && bcrypt.compareSync(password, passwordHash);
}

module.exports = {
  getAdminToken,
  verifyToken,
  validateAdminCredentials,
  ADMIN_USERNAME,
  ADMIN_PASSWORD
};
