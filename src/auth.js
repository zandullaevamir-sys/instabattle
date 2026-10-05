const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'battle.json');

const defaultState = {
  userCoins: 150,
  votes: {
    'Doniyor Qayumov': 12450,
    'Sardor Team': 13820
  }
};

function ensureJsonFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultState, null, 2));
  }
}

function readJsonState() {
  ensureJsonFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (error) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultState, null, 2));
    return JSON.parse(JSON.stringify(defaultState));
  }
}

function writeJsonState(nextState) {
  ensureJsonFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(nextState, null, 2));
}

function getConnection() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;

  try {
    return new Pool({ connectionString });
  } catch (error) {
    console.warn('Postgres Pool init failed. Falling back to JSON storage.', error.message);
    return null;
  }
}

async function initializeDatabase() {
  const pool = getConnection();
  if (!pool) return null;

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS battle_state (
        id SERIAL PRIMARY KEY,
        user_coins INTEGER NOT NULL DEFAULT 150,
        votes JSONB NOT NULL DEFAULT '{"Doniyor Qayumov": 12450, "Sardor Team": 13820}'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const result = await pool.query('SELECT * FROM battle_state ORDER BY id DESC LIMIT 1;');
    if (result.rows.length === 0) {
      await pool.query(
        'INSERT INTO battle_state (user_coins, votes) VALUES ($1, $2)',
        [defaultState.userCoins, JSON.stringify(defaultState.votes)]
      );
    }

    return pool;
  } catch (error) {
    console.warn('Postgres connection failed. Falling back to JSON storage.', error.message);
    return null;
  }
}

async function getBattleState() {
  const pool = await initializeDatabase();
  if (!pool) return readJsonState();

  try {
    const result = await pool.query('SELECT * FROM battle_state ORDER BY id DESC LIMIT 1;');
    if (!result.rows.length) return readJsonState();

    return {
      userCoins: Number(result.rows[0].user_coins || 150),
      votes: result.rows[0].votes || defaultState.votes
    };
  } catch (error) {
    console.warn('Battle state fetch failed. Falling back to JSON storage.', error.message);
    return readJsonState();
  }
}

async function saveBattleState(nextState) {
  const pool = await initializeDatabase();
  if (!pool) {
    writeJsonState(nextState);
    return nextState;
  }

  try {
    await pool.query(
      'INSERT INTO battle_state (user_coins, votes) VALUES ($1, $2)',
      [nextState.userCoins, JSON.stringify(nextState.votes)]
    );
    return nextState;
  } catch (error) {
    console.warn('Battle state save failed. Falling back to JSON storage.', error.message);
    writeJsonState(nextState);
    return nextState;
  }
}

module.exports = {
  defaultState,
  getBattleState,
  saveBattleState,
  initializeDatabase
};
