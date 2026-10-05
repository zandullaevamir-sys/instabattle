const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const { getBattleState, saveBattleState, defaultState } = require('./src/db');
const { getAdminToken, verifyToken, validateAdminCredentials } = require('./src/auth');
const { initTelegramBot } = require('./src/telegram');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = __dirname;
const INDEX_FILE = path.join(ROOT_DIR, 'index.html');

const defaultVotes = {
  'Doniyor Qayumov': 12450,
  'Sardor Team': 13820
};

function getVotePercentages(votes) {
  const entries = Object.entries(votes || defaultVotes);
  const total = entries.reduce((sum, [_, value]) => sum + Number(value || 0), 0) || 1;

  return entries.reduce((result, [name, value]) => {
    const count = Number(value || 0);
    result[name] = {
      count,
      percent: Math.round((count / total) * 100)
    };
    return result;
  }, {});
}

function normalizeState(data) {
  return {
    userCoins: Number(data.userCoins || 150),
    votes: {
      'Doniyor Qayumov': Number(data.votes?.['Doniyor Qayumov'] || defaultVotes['Doniyor Qayumov']),
      'Sardor Team': Number(data.votes?.['Sardor Team'] || defaultVotes['Sardor Team'])
    }
  };
}

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, try again later.' }
});
app.use(limiter);

app.use(express.static(ROOT_DIR));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'BattleChat API', status: 'healthy' });
});

app.get('/api/battle', async (req, res) => {
  try {
    const state = normalizeState(await getBattleState());
    res.json({
      userCoins: state.userCoins,
      votes: getVotePercentages(state.votes),
      meta: { title: 'BattleChat', status: 'active' }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load battle state' });
  }
});

app.post('/api/vote', async (req, res) => {
  const label = req.body?.blogger;

  if (!label || !['Doniyor Qayumov', 'Sardor Team'].includes(label)) {
    return res.status(400).json({ error: 'Invalid blogger name' });
  }

  try {
    const state = normalizeState(await getBattleState());
    state.votes[label] = Number(state.votes[label] || 0) + 120;
    await saveBattleState(state);

    return res.json({
      ok: true,
      blogger: label,
      userCoins: state.userCoins,
      votes: getVotePercentages(state.votes)
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Vote failed' });
  }
});

app.post('/api/store/buy', async (req, res) => {
  const amount = Number(req.body?.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    const state = normalizeState(await getBattleState());
    state.userCoins += amount;
    await saveBattleState(state);

    return res.json({ ok: true, userCoins: state.userCoins, purchased: amount });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Purchase failed' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!validateAdminCredentials(username, password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = getAdminToken();
  return res.json({ ok: true, token, user: { username, role: 'admin' } });
});

app.get('/api/admin/me', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const payload = verifyToken(authHeader);

  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return res.json({ ok: true, user: { username: payload.username, role: payload.role } });
});

app.post('/api/admin/boost', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const payload = verifyToken(authHeader);

  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const name = req.body?.name;
  const count = Number(req.body?.count || 0);
  if (!name || !Number.isFinite(count) || count <= 0) {
    return res.status(400).json({ error: 'Name and count are required' });
  }

  try {
    const state = normalizeState(await getBattleState());
    if (!state.votes[name]) state.votes[name] = 0;
    state.votes[name] += count;
    await saveBattleState(state);

    return res.json({ ok: true, name, count: state.votes[name], votes: getVotePercentages(state.votes) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Admin boost failed' });
  }
});

app.post('/api/admin/reset', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const payload = verifyToken(authHeader);

  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const resetState = {
      userCoins: defaultState.userCoins,
      votes: {
        'Doniyor Qayumov': defaultState.votes['Doniyor Qayumov'],
        'Sardor Team': defaultState.votes['Sardor Team']
      }
    };

    await saveBattleState(resetState);
    return res.json({ ok: true, state: resetState });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Reset failed' });
  }
});

app.post('/api/telegram/webhook', (req, res) => {
  const message = req.body?.message || {};
  const chatId = message.chat?.id;
  const text = message.text || '';

  if (!chatId) {
    return res.status(400).json({ ok: false, message: 'Missing chat id' });
  }

  if (text === '/start') {
    return res.json({ ok: true, reply: 'BattleChat botga xush kelibsiz! Ovoz berish va admin uchun tayyor.' });
  }

  return res.json({ ok: true, message: 'Webhook received' });
});

initTelegramBot();

app.get('*', (req, res) => {
  if (fs.existsSync(INDEX_FILE)) {
    res.sendFile(INDEX_FILE);
    return;
  }
  res.status(404).send('Not found');
});

app.listen(PORT, () => {
  console.log(`BattleChat server running on http://localhost:${PORT}`);
});
