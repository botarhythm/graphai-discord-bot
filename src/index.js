/**
 * GraphAI × Discord マルチモーダルチャットボット「ボッチー」
 * メインエントリーポイント
 */

const { Client, GatewayIntentBits, Events } = require('discord.js');
const config = require('./config');
const graphEngine = require('./graphai-engine');
const path = require('path');
const fs = require('fs');

// データディレクトリの確認・作成
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Discord.jsクライアントの初期化
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// 起動時の処理
client.once(Events.ClientReady, () => {
  console.log(`✅ Bot is ready! Logged in as ${client.user.tag}`);
});

// メッセージ受信イベントの処理
client.on(Events.MessageCreate, async message => {
  // 自分自身のメッセージは無視
  if (message.author.bot) return;
  
  console.log(`📝 Message received: ${message.content}`);
  
  // GraphAIフローの実行開始
  try {
    const result = await graphEngine.execute('main', {
      discordInput: {
        content: message.content,
        attachments: message.attachments.map(a => a.url),
        channelId: message.channelId,
        messageId: message.id,
        authorId: message.author.id,
        username: message.author.username,
        reply: async (content) => {
          await message.reply(content);
        }
      }
    });
    
    console.log('📊 GraphAI Flow Execution Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ GraphAI Flow Execution Error:', error);
    await message.reply('内部エラーが発生しました。しばらくしてからもう一度お試しください。');
  }
});

// エラーハンドリング
client.on(Events.Error, error => {
  console.error('❌ Discord Client Error:', error);
});

// Botのログイン
client.login(config.discord.token)
  .then(() => console.log('🚀 Connecting to Discord...'))
  .catch(err => {
    console.error('❌ Failed to connect to Discord:', err);
    process.exit(1);
  });

// プロセス終了時の処理
process.on('SIGINT', () => {
  console.log('⏹️ Shutting down bot...');
  client.destroy();
  process.exit(0);
});

console.log('🤖 GraphAI Discord Bot is starting...');