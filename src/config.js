require('dotenv').config();

module.exports = {
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-2.0-flash',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o-mini',
  },
  recraft: {
    apiKey: process.env.RECRAFT_API_KEY,
    dailyLimit: 50,
  },
  graphai: {
    logLevel: 'info',
    enableMonitoring: true,
  }
};