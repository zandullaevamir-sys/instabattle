const { Bot } = require('grammy');
const express = require('express');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 5000);
app.disable('x-powered-by');

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/script.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'script.js'));
});

app.get('/styles.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'styles.css'));
});

app.get('/healthz', (req, res) => {
  res.json({ ok: true, service: 'BattleChat site' });
});

app.use((req, res) => {
  res.sendStatus(404);
});

function startWebServer() {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`BattleChat site listening on port ${PORT}.`);
  });
  return server;
}

function getPublicSiteUrl() {
  const value = process.env.PUBLIC_SITE_URL?.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function initTelegramBot() {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    throw new Error('BOT_TOKEN is not configured. Add it through Replit Secrets.');
  }

  const bot = new Bot(token);
  const siteUrl = getPublicSiteUrl();

  if (!siteUrl) {
    console.warn('PUBLIC_SITE_URL is not set to a public HTTPS URL; /start will not show the site button yet.');
  }

  bot.command('start', async (ctx) => {
    const options = siteUrl
      ? {
          reply_markup: {
            inline_keyboard: [[{ text: '🌐 Saytni ochish', url: siteUrl }]]
          }
        }
      : undefined;

    await ctx.reply(
      'BattleChat botga xush kelibsiz! Ovoz berish, admin va leaderboard uchun saytni oching.',
      options
    );
  });

  bot.catch((error) => {
    const errorName = error.error?.name || error.constructor?.name || 'unknown';
    console.error(`Telegram update handler failed (${errorName}).`);
  });

  bot.start({
    onStart: ({ username }) => {
      console.log(`Telegram connected as @${username}. Send /start to test the bot.`);
    }
  }).catch((error) => {
    // Do not log the full error: API errors may contain the bot token in a URL.
    if (error.error_code === 401) {
      console.error('Telegram rejected BOT_TOKEN. Check the token saved in Replit Secrets.');
    } else if (error.error_code === 409) {
      console.error('Telegram polling conflict: another process is already using this bot token.');
    } else {
      console.error(`Telegram polling failed (API error ${error.error_code || 'unknown'}). Check connectivity.`);
    }
    process.exitCode = 1;
  });

  return bot;
}

if (require.main === module) {
  const webServer = startWebServer();

  try {
    const bot = initTelegramBot();
    const stop = () => {
      bot.stop();
      webServer.close();
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
  } catch (error) {
    webServer.close();
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { initTelegramBot, startWebServer };
