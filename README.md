# Mr. DalDalee Bot

This provides several useful features related to Final Fantasy XIV with Discord. Currently primary features are printing FFXIV Lodestone / Korean official archive messages and fflogs reports.

## Requirements

- NodeJS v15 or higher
- Redis 6.0 or higher

## How to use

```bash
$ npm install
```

Web server and Discord Bot client are designed separately so that they can operate separately, so when you run the server, you need to run two separately.

```bash
# Discord Bot Server
$ node index

# Web Server
$ node server
```

Open the **config/constants.js** file and edit the Discord bot token and fflogs.

```javascript
// Discord Bot Client ID
DISCORD_BOT_CLIENT_ID: '',

// Discord Bot Client Secret
DISCORD_BOT_CLIENT_SECRET: '',

// Discord Bot Token
DISCORD_BOT_TOKEN: '',

// 채팅 명령어 접두사
DISCORD_CHAT_PREFIX: ';!',

// FFLogs 웹 토큰
FFLOGS_WEB_TOKEN: '',
```
