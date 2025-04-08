import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import dotenv from 'dotenv';
import { Client, GatewayIntentBits, ChannelType } from 'discord.js';
import { GraphAI } from 'graphai';

// ESM用の__dirname疑似
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// エラーロギング関数
function logError(context, error) {
  const timestamp = new Date().toISOString();
  const errorLog = `
===== ERROR LOG =====
Timestamp: ${timestamp}
Context: ${context}
Error Name: ${error.name}
Error Message: ${error.message}
Error Stack: ${error.stack}
==================
`;
  
  // コンソールに出力
  console.error(errorLog);
  
  // ログファイルに記録
  try {
    fs.appendFileSync(path.join(__dirname, '..', 'error.log'), errorLog, 'utf8');
  } catch (logError) {
    console.error('Failed to write error log:', logError);
  }
}

// 環境変数の読み込み
try {
  dotenv.config();
} catch (error) {
  logError('Environment Configuration', error);
  process.exit(1);
}

// エージェントのインポート
import CommandParserAgent from './agents/command-parser-agent.js';
import WebSearchAgent from './agents/web-search-agent.js';
import SearchResultFormatterAgent from './agents/search-result-formatter-agent.js';

// エージェント定義
const agents = {
  commandParserAgent: CommandParserAgent,
  webSearchAgent: WebSearchAgent,
  searchResultFormatterAgent: SearchResultFormatterAgent
};

// フロー読み込み関数
function loadFlow(flowPath) {
  try {
    const fileContents = fs.readFileSync(flowPath, 'utf8');
    return yaml.load(fileContents);
  } catch (error) {
    logError('Flow Loading', error);
    throw error;
  }
}

// Discordクライアントの設定
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageTyping
  ]
});

// メインフロー読み込み
let webSearchFlow;
try {
  webSearchFlow = loadFlow(path.resolve(__dirname, 'flows', 'web-search-flow.yaml'));
} catch (error) {
  logError('Flow Initialization', error);
  process.exit(1);
}

// GraphAIインスタンスの作成
let graphAI;
try {
  graphAI = new GraphAI({
    agents: agents
  });
} catch (error) {
  logError('GraphAI Initialization', error);
  process.exit(1);
}

// Discordボットのログイン完了
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// メッセージ受信イベント
client.on('messageCreate', async (message) => {
  // ボット自身のメッセージは無視
  if (message.author.bot) return;

  // 以下の条件をより厳密にチェック
  
  // 1. ボットのメンションを直接的に確認（正規表現を使用して確実に）
  // ここでボットのIDを使用して直接テキスト内に`<@BOT_ID>`や`<@!BOT_ID>`の形式があるか確認
  const botId = client.user.id;
  const botMentionRegex = new RegExp(`<@!?${botId}>`, 'i');
  const isMentioned = botMentionRegex.test(message.content);
  
  // 2. DMの確認
  const isDM = message.channel.type === ChannelType.DM;
  
  // 3. スレッド内の返信確認（親がボットかを確認）
  // スレッドの確認ロジックを修正
  let isThreadReply = false;
  if (message.channel.isThread && message.channel.isThread()) {
    try {
      // スレッドの親メッセージを取得して確認する追加チェック
      const parentChannel = message.channel.parent;
      if (parentChannel) {
        // 可能であれば親メッセージの作成者を確認
        const threadStarterMessage = await message.channel.fetchStarterMessage().catch(() => null);
        if (threadStarterMessage && threadStarterMessage.author.id === client.user.id) {
          isThreadReply = true;
        }
      }
    } catch (e) {
      console.error("Thread parent check error:", e);
    }
  }

  // デバッグログを追加
  console.log(`Message processing check:
  - From: ${message.author.tag}
  - Content: ${message.content}
  - Channel: ${message.channel.name || 'DM'}
  - Channel Type: ${message.channel.type}
  - Is Mentioned: ${isMentioned}
  - Is DM: ${isDM}
  - Is Thread Reply: ${isThreadReply}
  `);

  // いずれかの条件を満たしていない場合は処理しない
  if (!isMentioned && !isDM && !isThreadReply) {
    console.log("Message ignored - conditions not met");
    return;
  }

  console.log("Message will be processed!");

  try {
    // メンションを取り除いたコンテンツを作成
    let cleanContent = message.content;
    if (isMentioned) {
      // メンションを取り除く (より厳密な方法)
      cleanContent = cleanContent.replace(/<@!?[0-9]+>/g, '').trim();
    }
    
    console.log(`Processing message: "${cleanContent}"`);
    
    // GraphAIフローの実行
    const result = await graphAI.run({
      ...webSearchFlow,
      nodes: {
        ...webSearchFlow.nodes,
        input: { value: cleanContent }
      }
    });

    // 検索結果の送信
    if (result.output) {
      message.reply(result.output);
    }
  } catch (error) {
    logError('Message Processing', error);
    message.reply('処理中に予期せぬエラーが発生しました。詳細はログを確認してください。');
  }
});

// ボットログイン
try {
  client.login(process.env.DISCORD_TOKEN);
} catch (error) {
  logError('Discord Login', error);
  process.exit(1);
}

// プロセス全体のエラーハンドリング
process.on('uncaughtException', (error) => {
  logError('Uncaught Exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logError('Unhandled Rejection', reason);
});