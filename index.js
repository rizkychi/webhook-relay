const express = require('express');
const axios = require('axios');
const { Client, GatewayIntentBits } = require('discord.js');
const { validateApiKey } = require('./middleware/auth');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Discord Bot Client (optional)
let discordClient = null;
if (process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_CHANNEL_ID) {
  discordClient = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
  });

  discordClient.login(process.env.DISCORD_BOT_TOKEN).catch(err => {
    log.error(`Discord bot login failed: ${err.message}`);
  });

  discordClient.on('ready', () => {
    log.success(`Discord bot logged in as ${discordClient.user.tag}`);
  });
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple colored logging
const log = {
  info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  error: (msg) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
  warn: (msg) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`)
};

// Discord webhook function
async function sendToDiscordWebhook(message, username = 'Logger Bot') {
  if (!process.env.DISCORD_WEBHOOK_URL) {
    return { success: false, error: 'Webhook not configured' };
  }

  try {
    const payload = {
      content: message,
      username: username
    };

    const response = await axios.post(process.env.DISCORD_WEBHOOK_URL, payload);
    
    if (response.status === 204 || response.status === 200) {
      log.success('Message sent via Discord webhook');
      return { success: true, method: 'webhook' };
    }
    
    return { success: false, error: `Status: ${response.status}` };
  } catch (error) {
    log.error(`Discord webhook error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Discord bot function
async function sendToDiscordBot(message) {
  if (!discordClient || !discordClient.isReady()) {
    return { success: false, error: 'Bot not ready' };
  }

  try {
    const channel = await discordClient.channels.fetch(process.env.DISCORD_CHANNEL_ID);
    
    if (!channel || !channel.isTextBased()) {
      return { success: false, error: 'Invalid channel' };
    }

    await channel.send(message);
    log.success('Message sent via Discord bot');
    return { success: true, method: 'bot' };
  } catch (error) {
    log.error(`Discord bot error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Main Discord sender (tries bot first, fallback to webhook)
async function sendToDiscord(message, username = 'Logger Bot', preferBot = true) {
  let result;

  if (preferBot && discordClient && discordClient.isReady()) {
    result = await sendToDiscordBot(message);
    if (result.success) return result;
    log.warn('Bot failed, trying webhook...');
  }

  result = await sendToDiscordWebhook(message, username);
  return result;
}

// Telegram bot function
async function sendToTelegram(message) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    return { success: false, error: 'Not configured' };
  }

  try {
    const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payload = {
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    };

    const response = await axios.post(url, payload);
    
    if (response.data.ok) {
      log.success('Message sent to Telegram');
      return { success: true };
    }
    
    return { success: false, error: response.data.description };
  } catch (error) {
    log.error(`Telegram error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Health check endpoint (no auth required)
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    auth: !!process.env.API_KEY,
    discord: {
      bot: discordClient?.isReady() || false,
      webhook: !!process.env.DISCORD_WEBHOOK_URL
    },
    telegram: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    timestamp: new Date().toISOString()
  });
});

// Protected POST endpoint with API key
app.post('/send', validateApiKey, async (req, res) => {
  const { message, username, send_telegram, use_bot } = req.body;

  if (!message) {
    log.warn('No message provided');
    return res.status(400).json({ 
      success: false, 
      error: 'Message is required' 
    });
  }

  log.info(`Received message: ${message.substring(0, 50)}...`);

  const results = {
    discord: null,
    telegram: null
  };

  // Send to Discord (bot or webhook)
  const preferBot = use_bot !== false; // default true
  results.discord = await sendToDiscord(message, username, preferBot);

  // Send to Telegram (optional)
  if (send_telegram === true || send_telegram === 'true') {
    results.telegram = await sendToTelegram(message);
  }

  // Response
  const success = results.discord.success || (results.telegram && results.telegram.success);
  
  res.status(success ? 200 : 500).json({
    success: success,
    results: results,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  log.success(`Server running on port ${PORT}`);
  log.info(`Auth: ${process.env.API_KEY ? 'Enabled ✓' : 'Disabled ✗'}`);
  log.info(`Discord Bot: ${discordClient ? 'Enabled ✓' : 'Disabled ✗'}`);
  log.info(`Discord Webhook: ${process.env.DISCORD_WEBHOOK_URL ? 'Enabled ✓' : 'Disabled ✗'}`);
  log.info(`Telegram: ${process.env.TELEGRAM_BOT_TOKEN ? 'Enabled ✓' : 'Disabled ✗'}`);
});
