const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');

// JWT Secret - I produktion ska detta vara en miljövariabel
const JWT_SECRET = process.env.JWT_SECRET || 'ribegatan-admin-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h'; // 24 timmars utgångstid
const SALT_ROUNDS = 10;

const USERS_FILE = path.join(__dirname, '../data/users.json');

/**
 * Hashar ett lösenord med bcrypt
 * @param {string} password - Lösenordet att hasha
 * @returns {Promise<string>} - Det hashade lösenordet
 */
async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Jämför ett lösenord med en hash
 * @param {string} password - Lösenordet att jämföra
 * @param {string} hash - Hashen att jämföra mot
 * @returns {Promise<boolean>} - True om lösenordet matchar
 */
async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Genererar en JWT-token för en användare
 * @param {object} user - Användarobjektet
 * @returns {string} - JWT-token
 */
function generateToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verifierar en JWT-token
 * @param {string} token - Token att verifiera
 * @returns {object|null} - Dekodad token om giltig, null annars
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Läser användare från users.json
 * @returns {Promise<Array>} - Array av användare
 */
async function getUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf8');
    const json = JSON.parse(data);
    return json.users || [];
  } catch (error) {
    console.error('Fel vid läsning av användare:', error);
    return [];
  }
}

/**
 * Sparar användare till users.json
 * @param {Array} users - Array av användare att spara
 * @returns {Promise<void>}
 */
async function saveUsers(users) {
  const data = JSON.stringify({ users }, null, 2);
  await fs.writeFile(USERS_FILE, data, 'utf8');
}

/**
 * Hittar en användare baserat på användarnamn
 * @param {string} username - Användarnamnet att söka efter
 * @returns {Promise<object|null>} - Användaren om den hittas, null annars
 */
async function findUserByUsername(username) {
  const users = await getUsers();
  return users.find(u => u.username === username) || null;
}

/**
 * Autentiserar en användare
 * @param {string} username - Användarnamn
 * @param {string} password - Lösenord
 * @returns {Promise<object|null>} - Användaren om autentisering lyckas, null annars
 */
async function authenticateUser(username, password) {
  // Produktion: miljövariabler (Render m.m.)
  if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
      return {
        id: 'admin-001',
        username: process.env.ADMIN_USERNAME,
        role: 'admin'
      };
    }
  }

  // Fallback: users.json (lokal + om env-lösenordet inte matchar)
  const user = await findUserByUsername(username);

  if (!user) {
    return null;
  }

  const isValid = await comparePassword(password, user.passwordHash);

  if (!isValid) {
    return null;
  }

  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  getUsers,
  saveUsers,
  findUserByUsername,
  authenticateUser
};
