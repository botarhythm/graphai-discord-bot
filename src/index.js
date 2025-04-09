/**
 * GraphAI Discord Bot メインエントリーポイント
 */

// 必要なモジュールをインポート
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { 
  Client, 
  GatewayIntentBits, 
  Events, 
  ChannelType, 
  Collection
} = require('discord.js');

// 環境変数の読み込み
dotenv.config();

// エラーロギング関数
function logError(context, error) {
  const timestamp = new Date().toISOString();
  const errorLog = `\n===== ERROR LOG =====\nTimestamp: ${timestamp}\nContext: ${context}\nError Name: ${error.name}\nError Message: ${error.message}\nError Stack: ${error.stack}\n==================\n`;
  
  // コンソールに出力
  console.error(errorLog);
  
  // ログファイルに記録
  try {
    fs.appendFileSync(path.join(__dirname, '..', 'error.log'), errorLog, 'utf8');
  } catch (logError) {
    console.error('Failed to write error log:', logError);
  }
}

// Discordクライアントの設定
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ]
});

// スレッド情報のキャッシュ - ボットが作成したスレッドを追跡
const botThreads = new Collection();

// シンプルなGeminiエンジンのインポート
let geminiEngine = null;
try {
  geminiEngine = require('./graphai-engine');
  console.log("Gemini Engine loaded successfully");
} catch (error) {
  logError('Gemini Engine Import Error', error);
  console.error("Failed to load Gemini Engine:", error.message);
}

// クライアント準備完了イベント
client.on(Events.ClientReady, () => {
  console.log(`=========== Bot Ready ===========`);
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Bot is ready with intents: IntentsBitField { bitfield: ${client.options.intents.bitfield} }`);
  console.log(`Gemini Engine initialized: ${geminiEngine ? 'Yes' : 'No'}`);
  console.log(`=================================`);

  // メッセージハンドラーを設定
  setupMessageHandler();
});

// Geminiエンジンを使用してメッセージを処理する関数
async function processMessageWithGemini(message) {
  try {
    if (!geminiEngine) {
      await message.reply("Geminiエンジンが初期化されていません。管理者にお問い合わせください。");
      return;
    }
    
    // typingインジケータを表示
    await message.channel.sendTyping();
    
    // Geminiエンジンに入力を渡す
    const result = await geminiEngine.execute('main', {
      discordInput: {
        content: message.content,
        attachments: Array.from(message.attachments.values()).map(a => a.url),
        channelId: message.channel.id,
        messageId: message.id,
        authorId: message.author.id,
        username: message.author.username
      }
    });
    
    // 処理結果が返ってきたら応答
    if (result && result.discordOutput) {
      await message.reply(result.discordOutput);
    } else {
      console.warn('Gemini processing returned no output:', result);
      await message.reply('処理中にエラーが発生しました。しばらく経ってからお試しください。');
    }
  } catch (error) {
    logError('Message Processing', error);
    await message.reply('AIエンジンでエラーが発生しました。管理者に報告します。');
  }
}

// メッセージハンドラーの設定
function setupMessageHandler() {
  // 既存のリスナーをすべて削除
  client.removeAllListeners(Events.MessageCreate);

  // 新たなメッセージハンドラーを追加
  client.on(Events.MessageCreate, async (message) => {
    // ボット自身またはその他のボットのメッセージは無視
    if (message.author.bot) return;

    // 応答条件のチェック（3つの条件のいずれかに合致する必要がある）
    let shouldRespond = false;

    // 1. ボットへの直接メンション
    const botId = client.user.id;
    const mentionPattern = new RegExp(`<@!?${botId}>`, 'i');
    const isMentioned = mentionPattern.test(message.content);
    
    if (isMentioned) {
      shouldRespond = true;
    }

    // 2. DMチャンネル
    const isDM = message.channel.type === ChannelType.DM;
    if (isDM) {
      shouldRespond = true;
    }

    // 3. ボットのメッセージへの返信スレッド
    let isThreadReply = false;
    
    if (message.channel.isThread && message.channel.isThread()) {
      try {
        // 親メッセージを取得
        const starter = await message.channel.fetchStarterMessage().catch(() => null);
        if (starter && starter.author.id === client.user.id) {
          shouldRespond = true;
          isThreadReply = true;
        }
      } catch (error) {
        console.error('Error checking thread parent:', error);
      }
    }

    // ログ出力
    console.log(`Message received: "${message.content}" from ${message.author.username} in ${message.channel.type === ChannelType.DM ? 'DM' : message.channel.name}`);
    console.log(`Channel type: ${message.channel.type}`);
    console.log(`Check conditions: isMentioned=${isMentioned}, isDM=${isDM}, isThreadReply=${isThreadReply}`);

    // 応答条件を満たしていない場合は処理を中断
    if (!shouldRespond) {
      console.log("Message will not be processed: Does not meet bot interaction criteria");
      return;
    }

    console.log("Message will be processed: Meets bot interaction criteria");
    console.log(`Processing content: "${message.content}"`);

    // !help コマンドの処理
    const prefix = process.env.PREFIX || '!';
    if (message.content.startsWith(`${prefix}help`)) {
      const helpText = `# ボッチー ヘルプ

こんにちは！ボッチーです。GraphAI技術を活用した会話ボットです。
以下の機能が利用可能です：

**基本コマンド:**
- \`!help\` - このヘルプメッセージを表示します
- \`/clear\` - 会話履歴をクリアします

**機能:**
- テキスト対話処理 - Gemini 2.0 Flash AIによる自然な会話
- 画像分析 - 添付画像に関する質問に回答します（近日実装）

GraphAI技術を活用した高度な会話をお楽しみください！`;
      
      await message.reply(helpText);
      return;
    }

    // /clear コマンドの処理
    if (message.content.startsWith(`/clear`)) {
      if (geminiEngine && typeof geminiEngine.clearConversationHistory === 'function') {
        const cleared = geminiEngine.clearConversationHistory(message.author.id);
        if (cleared) {
          await message.reply('会話履歴をクリアしました。新しい会話を始めましょう！');
        } else {
          await message.reply('会話履歴のクリアに失敗しました。');
        }
      } else {
        await message.reply('会話履歴機能は現在利用できません。');
      }
      return;
    }

    // Geminiエンジンでメッセージを処理
    await processMessageWithGemini(message);
  });

  console.log("Message handler successfully set up");
}

// ボットログイン
try {
  client.login(process.env.DISCORD_TOKEN)
    .then(() => console.log("Bot login successful"))
    .catch(error => {
      logError('Login Failed', error);
      process.exit(1);
    });
} catch (error) {
  logError('Discord Login Error', error);
  process.exit(1);
}

// プロセス全体のエラーハンドリング
process.on('uncaughtException', (error) => {
  logError('Uncaught Exception', error);
  console.error('Critical error occurred, exiting...');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logError('Unhandled Rejection', reason);
  console.error('Unhandled promise rejection detected');
});