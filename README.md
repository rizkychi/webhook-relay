# 🔔 webhook-relay

<div align="center">

![Node.js](https://img.shields.io/badge/node.js-%3E%3D18.0.0-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Express](https://img.shields.io/badge/express-4.18.2-lightgrey)
![Discord.js](https://img.shields.io/badge/discord.js-14.14.1-5865F2)

A lightweight, secure webhook forwarding service that receives HTTP POST requests and relays them to Discord (bot/webhook) and Telegram channels in real-time. Perfect for centralized logging, notifications, and alerting systems.

[Features](#features) • [Installation](#installation) • [Configuration](#configuration) • [Usage](#usage) • [Deployment](#deployment) • [API Reference](#api-reference)

</div>

---

## ✨ Features

- 🔐 **Secure Authentication** - API key protection for all endpoints
- 💬 **Discord Support** - Both bot and webhook methods with automatic fallback
- 📱 **Telegram Integration** - Optional forwarding to Telegram channels
- 🚀 **Production Ready** - Deploy to Coolify, Docker, or any Node.js host
- 📊 **Colorized Logging** - Clear, informative console output
- ⚡ **Real-time Delivery** - Instant message forwarding
- 🔄 **Auto Fallback** - Switches from bot to webhook if one fails
- 🛡️ **Error Handling** - Comprehensive error responses

---

## 📋 Table of Contents

- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
  - [Discord Bot Setup](#discord-bot-setup)
  - [Discord Webhook Setup](#discord-webhook-setup)
  - [Telegram Setup](#telegram-setup-optional)
- [Usage](#-usage)
  - [Starting the Server](#starting-the-server)
  - [API Examples](#api-examples)
- [Deployment](#-deployment)
  - [Deploy to Coolify](#deploy-to-coolify)
  - [Docker Deployment](#docker-deployment)
- [API Reference](#-api-reference)
- [Bot vs Webhook](#-bot-vs-webhook)
- [Security](#-security)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🔧 Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Discord server with admin access
- (Optional) Telegram bot token

---

## 📦 Installation

### Clone Repository

```
git clone https://github.com/yourusername/webhook-relay.git
cd webhook-relay
```

### Install Dependencies

```
npm install
```

### Environment Setup

Copy the example environment file:

```
cp .env.example .env
```

Edit `.env` with your credentials:

```
PORT=3000

Security - REQUIRED
API_KEY=your-secret-api-key-here

Discord Bot (Option 1 - Recommended)
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_CHANNEL_ID=your-channel-id

Discord Webhook (Option 2 - Fallback)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

Telegram (Optional)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-chat-id
```

---

## ⚙️ Configuration

### Discord Bot Setup

#### 1. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** → Enter name → **Create**
3. Navigate to **Bot** section → **Add Bot**
4. Copy **Bot Token** (save as `DISCORD_BOT_TOKEN`)

#### 2. Enable Intents

In the **Bot** section:

- Enable **MESSAGE CONTENT INTENT**
- Enable **SERVER MEMBERS INTENT** (optional)

#### 3. Invite Bot to Server

1. Go to **OAuth2** → **URL Generator**
2. Select scopes:
   - `bot`
3. Select permissions:
   - Send Messages
   - Read Messages/View Channels
4. Copy generated URL → Open in browser → Select server

#### 4. Get Channel ID

1. Enable **Developer Mode** in Discord (Settings → Advanced)
2. Right-click target channel → **Copy ID**
3. Save as `DISCORD_CHANNEL_ID`

### Discord Webhook Setup

1. Open Discord server → Server Settings → **Integrations**
2. Click **Webhooks** → **New Webhook**
3. Select channel → Copy **Webhook URL**
4. Save as `DISCORD_WEBHOOK_URL`

### Telegram Setup (Optional)

#### 1. Create Bot

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` → Follow instructions
3. Copy **Bot Token** (save as `TELEGRAM_BOT_TOKEN`)

#### 2. Get Chat ID

**For Private Chat:**

1. Message [@userinfobot](https://t.me/userinfobot)
2. Copy your **User ID** (save as `TELEGRAM_CHAT_ID`)

**For Group/Channel:**

1. Add bot to group/channel
2. Send a message in the group
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Find `"chat":{"id":...}` → Save as `TELEGRAM_CHAT_ID`

---

## 🚀 Usage

### Starting the Server

```
npm start
```

Expected output:

```
[SUCCESS] Server running on port 3000
[INFO] Auth: Enabled ✓
[INFO] Discord Bot: Enabled ✓
[INFO] Discord Webhook: Enabled ✓
[INFO] Telegram: Enabled ✓
[SUCCESS] Discord bot logged in as YourBot#1234
```

### API Examples

#### Basic Message

```
curl -X POST http://localhost:3000/send
-H "Content-Type: application/json"
-H "X-API-Key: your-secret-api-key"
-d '{"message": "Hello from webhook-relay!"}'
```

#### Custom Username (Webhook only)

```
curl -X POST http://localhost:3000/send
-H "Content-Type: application/json"
-H "X-API-Key: your-api-key"
-d '{
  "message": "Server deployment completed!",
  "username": "CI/CD Bot"
}'
```

#### Send to Discord + Telegram

```
curl -X POST http://localhost:3000/send
-H "Content-Type: application/json"
-H "X-API-Key: your-api-key"
-d '{
  "message": "⚠️ Critical alert: High CPU usage detected",
  "send_telegram": true
}'
```

#### Force Webhook Method

```
curl -X POST http://localhost:3000/send
-H "Content-Type: application/json"
-H "X-API-Key: your-api-key"
-d '{
  "message": "Using webhook instead of bot",
  "use_bot": false,
  "username": "Webhook Logger"
}'
```

#### Using Node.js

```javascript
const axios = require("axios");

async function sendNotification(message, critical = false) {
  try {
    const response = await axios.post(
      "http://localhost:3000/send",
      {
        message: message,
        username: "App Logger",
        send_telegram: critical,
        use_bot: true,
      },
      {
        headers: {
          "X-API-Key": process.env.WEBHOOK_RELAY_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✓ Notification sent:", response.data);
  } catch (error) {
    console.error("✗ Failed:", error.response?.data || error.message);
  }
}

// Usage
sendNotification("App started successfully");
sendNotification("🚨 Database connection lost!", true);
```

#### Health Check

```
curl http://localhost:3000/
```

Response:

```json
{
  "status": "running",
  "auth": true,
  "discord": {
    "bot": true,
    "webhook": true
  },
  "telegram": true,
  "timestamp": "2025-11-10T07:00:00.000Z"
}
```

---

## 🌐 Deployment

### Deploy to Coolify

#### 1. Push to GitHub

```
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/webhook-relay.git
git push -u origin main
```

#### 2. Configure Coolify

1. Login to Coolify dashboard
2. **New Project** → **Public Repository**
3. Enter GitHub repository URL
4. Click **Continue**

#### 3. Set Environment Variables

Add in Coolify environment settings:

```
API_KEY=generate-strong-random-key-here
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_CHANNEL_ID=123456789012345678
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=987654321
PORT=3000
```

#### 4. Deploy

Click **Deploy** → Wait for build completion

Your webhook-relay will be accessible at:
https://your-app.coolify.domain/

### Docker Deployment

Create `Dockerfile`:

```
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:

```
docker build -t webhook-relay .

docker run -d
-p 3000:3000
-e API_KEY=your-secret-key
-e DISCORD_BOT_TOKEN=your-token
-e DISCORD_CHANNEL_ID=your-channel-id
--name webhook-relay
webhook-relay
```

---

## 📖 API Reference

### Endpoints

#### `GET /`

Health check endpoint (no authentication required)

**Response:**

```json
{
  "status": "running",
  "auth": true,
  "discord": {
    "bot": true,
    "webhook": true
  },
  "telegram": true,
  "timestamp": "2025-11-10T07:00:00.000Z"
}
```

#### `POST /send`

Send message to Discord and/or Telegram (requires authentication)

**Headers:**

- `X-API-Key: <your-api-key>` (required)
- `Content-Type: application/json` (required)

**Body Parameters:**

| Parameter       | Type    | Required | Default      | Description                            |
| --------------- | ------- | -------- | ------------ | -------------------------------------- |
| `message`       | string  | Yes      | -            | Message content to send                |
| `username`      | string  | No       | "Logger Bot" | Custom username (webhook only)         |
| `send_telegram` | boolean | No       | false        | Also send to Telegram                  |
| `use_bot`       | boolean | No       | true         | Use Discord bot (false = webhook only) |

**Success Response (200):**

```json
{
  "success": true,
  "results": {
    "discord": {
      "success": true,
      "method": "bot"
    },
    "telegram": {
      "success": true
    }
  },
  "timestamp": "2025-11-10T07:00:00.000Z"
}
```

**Error Responses:**

- `400` - Missing message parameter
- `401` - API key not provided
- `403` - Invalid API key
- `500` - Message delivery failed

---

## 🤖 Bot vs Webhook

| Feature           | Discord Bot              | Discord Webhook       |
| ----------------- | ------------------------ | --------------------- |
| **Setup**         | Complex (token + invite) | Simple (copy URL)     |
| **Auth**          | Bot token required       | URL is secret         |
| **Multi-channel** | ✅ Yes                   | ❌ One channel only   |
| **Username**      | Fixed bot name           | ✅ Custom per message |
| **Rate Limit**    | 50 req/sec               | 5 req/2sec            |
| **Reliability**   | WebSocket connection     | HTTP only             |
| **Recommended**   | ✅ Primary method        | Fallback/Simple use   |

**Recommendation:** Use bot as primary with webhook as fallback for maximum reliability.

---

## 🔒 Security

### API Key Best Practices

1. **Generate Strong Keys**
   Use openssl to generate secure key

```
openssl rand -hex 32
```

2. **Never Commit Keys**

- Add `.env` to `.gitignore`
- Use environment variables in production
- Rotate keys periodically

3. **Authentication Methods**

- `X-API-Key` header (recommended)
- `Authorization: Bearer <key>` header

### Network Security

- Deploy behind HTTPS/TLS
- Use firewall rules to restrict access
- Enable rate limiting (add middleware)
- Monitor failed authentication attempts

---

## 🐛 Troubleshooting

### Bot Not Responding

**Problem:** Bot is online but not sending messages

**Solutions:**

1. Check `DISCORD_CHANNEL_ID` is correct
2. Verify bot has "Send Messages" permission in channel
3. Check console for error messages
4. Ensure MESSAGE CONTENT INTENT is enabled

### Webhook Fails

**Problem:** `404 Not Found` error

**Solution:** Webhook URL expired/deleted - create new webhook in Discord

### API Key Rejected

**Problem:** `403 Invalid API key` error

**Solution:**

1. Check API key matches exactly (no extra spaces)
2. Verify environment variable is loaded: check `/` endpoint

### Telegram Not Working

**Problem:** Messages not reaching Telegram

**Solutions:**

1. Verify bot token with `https://api.telegram.org/bot<TOKEN>/getMe`
2. Check chat ID is correct (try negative ID for groups: `-123456789`)
3. Ensure bot is member of group/channel

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [discord.js](https://discord.js.org/) - Discord API library
- [Express.js](https://expressjs.com/) - Web framework
- [Coolify](https://coolify.io/) - Deployment platform

---

## 📞 Support

- 🐛 [Report Bug](https://github.com/rizkychi/webhook-relay/issues)
- 💡 [Request Feature](https://github.com/rizkychi/webhook-relay/issues)
- 📧 [Email Support](mailto:rizkynhae@gmail.com)

---

<div align="center">

Made with ❤️ by [Rizkychi](https://github.com/rizkychi)

⭐ Star this repo if you find it useful!

</div>
