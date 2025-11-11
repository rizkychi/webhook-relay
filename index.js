const express = require('express');
const axios = require('axios');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { validateApiKey } = require('./middleware/auth');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Helper: Color logging
const log = {
  info: msg => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  success: msg => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  error: msg => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
  warn: msg => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`)
};

// Helper: Auto-format [code] ... [/code]
function formatCodeTags(message, platform = 'discord') {
  const codeRegex = /\[code\]([\s\S]*?)\[\/code\]/g;
  if (platform === 'discord') {
    return message.replace(codeRegex, (match, code) => {
      return `\`\`\`json\n${code.trim()}\n\`\`\``;
    });
  } else if (platform === 'telegram') {
    code = message.replace(codeRegex, (match, code) => {
      code = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<pre><code>${code.trim()}</code></pre>`;
    });
    return code;
  }
  return message;
}

// Discord Bot Client (with embed support)
let discordClient = null;
if (process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_CHANNEL_ID) {
  discordClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
  discordClient.login(process.env.DISCORD_BOT_TOKEN).catch(err => log.error(`Discord bot login failed: ${err.message}`));
  discordClient.on('ready', () => log.success(`Discord bot logged in as ${discordClient.user.tag}`));
}

// Discord bot function
async function sendToDiscordBot(message, embed = false, username) {
  if (!discordClient || !discordClient.isReady()) return { success: false, error: 'Bot not ready' };
  try {
    const channel = await discordClient.channels.fetch(process.env.DISCORD_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return { success: false, error: 'Invalid channel' };
    const formattedMessage = formatCodeTags(message, 'discord');
    if (embed) {
      const embedMsg = new EmbedBuilder()
        .setColor('#00FF99')
        .setTitle(username || 'Webhook Relay')
        .setDescription(formattedMessage.length < 4096 ? formattedMessage : formattedMessage.slice(0, 4080) + '...') // Discord embed max 4096
        .setTimestamp();
      await channel.send({ embeds: [embedMsg] });
    } else {
      await channel.send(formattedMessage);
    }
    log.success(`Message sent via Discord bot${embed ? ' (embed)' : ''}`);
    return { success: true, method: embed ? 'embed' : 'bot' };
  } catch (error) {
    log.error(`Discord bot error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Discord webhook function (embed not supported)
async function sendToDiscordWebhook(message, username = 'Logger Bot') {
  if (!process.env.DISCORD_WEBHOOK_URL) return { success: false, error: 'Webhook not configured' };
  const formattedMessage = formatCodeTags(message, 'discord');
  try {
    const payload = { content: formattedMessage, username: username };
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

// Telegram function
async function sendToTelegram(message) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID)
    return { success: false, error: 'Not configured' };
  const formattedMessage = formatCodeTags(message, 'telegram');
  try {
    const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payload = { chat_id: process.env.TELEGRAM_CHAT_ID, text: formattedMessage, parse_mode: 'HTML' };
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

// Main Discord sender: prefer bot (embed support), fallback webhook
async function sendToDiscord(message, username = 'Logger Bot', preferBot = true, embed = false) {
  let result;
  if (preferBot && discordClient && discordClient.isReady()) {
    result = await sendToDiscordBot(message, embed, username);
    if (result.success) return result;
    log.warn('Bot failed, trying webhook...');
  }
  result = await sendToDiscordWebhook(message, username);
  return result;
}

// Health check
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

// Main POST endpoint
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.post('/send', validateApiKey, async (req, res) => {
  const { message, username, send_telegram, use_bot, embed } = req.body;
  if (!message) {
    log.warn('No message provided');
    return res.status(400).json({ success: false, error: 'Message is required' });
  }
  log.info(`Received message: ${message.substring(0, 50)}...`);

  const results = { discord: null, telegram: null };

  // Discord: bot or webhook
  const preferBot = use_bot !== false;
  results.discord = await sendToDiscord(message, username, preferBot, !!embed);

  // Telegram (optional)
  if (send_telegram === true || send_telegram === 'true') {
    results.telegram = await sendToTelegram(message);
  }

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
