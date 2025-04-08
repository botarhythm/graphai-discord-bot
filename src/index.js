import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import dotenv from 'dotenv';
import { 
  Client, 
  GatewayIntentBits, 
  Events, 
  ChannelType, 
  MessageType,
  Collection
} from 'discord.js';
import { GraphAI } from 'graphai';

// ESM用の__dirname疑似
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 環境変数の読み込み
dotenv.config();

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

// 直接明示的にmessagecreateイベントのリスナーを追加（Events定数を使用）
client.on(Events.ClientReady, () => {
  console.log(`=========== Bot Ready ===========`);
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Bot will only respond to:`);
  console.log(`1. Direct mentions: @${client.user.username}`);
  console.log(`2. Thread replies (when parent message is from the bot)`);
  console.log(`3. Direct Messages (DMs)`);
  console.log(`=================================`);

  // 一度だけメッセージハンドラーを設定
  setupMessageHandler();
});

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
    let responseReason = "";

    // 1. ボットへの直接メンション
    const botId = client.user.id;
    const mentionPattern = new RegExp(`<@!?${botId}>`, 'i');
    const isMentioned = mentionPattern.test(message.content);
    
    if (isMentioned) {
      shouldRespond = true;
      responseReason = "MENTION";
    }

    // 2. DMチャンネル
    const isDM = message.channel.type === ChannelType.DM;
    if (isDM) {
      shouldRespond = true;
      responseReason = "DM";
    }

    // 3. ボットのメッセージへの返信スレッド
    let isThreadReply = false;
    
    if (message.channel.isThread && message.channel.isThread()) {
      try {
        // 親メッセージを取得
        const starter = await message.channel.fetchStarterMessage().catch(() => null);
        if (starter && starter.author.id === client.user.id) {
          shouldRespond = true;
          responseReason = "THREAD";
          isThreadReply = true;
        }
      } catch (error) {
        console.error('Error checking thread parent:', error);
      }
    }

    // ログ出力
    console.log(`[${new Date().toISOString()}] Message from ${message.author.tag}`);
    console.log(`Channel: ${message.channel.name || 'DM'}`);
    console.log(`Content: ${message.content.substring(0, 30)}${message.content.length > 30 ? '...' : ''}`);
    console.log(`Checks: Mention=${isMentioned}, DM=${isDM}, ThreadReply=${isThreadReply}`);
    console.log(`Should respond: ${shouldRespond} (${responseReason})`);

    // 応答条件を満たしていない場合は処理を中断
    if (!shouldRespond) {
      console.log("IGNORING MESSAGE: Does not meet response criteria");
      return;
    }

    // メッセージ処理を行う
    await processMessage(message, isMentioned);
  });

  console.log("Message handler successfully set up");
}

// メッセージ処理関数
async function processMessage(message, isMentioned) {
  try {
    console.log(`[${new Date().toISOString()}] PROCESSING message from ${message.author.tag}`);
    
    // メンションを取り除いたコンテンツを作成
    let cleanContent = message.content;
    if (isMentioned) {
      // メンションを取り除く（すべての可能なメンション形式を考慮）
      cleanContent = cleanContent.replace(/<@!?\d+>/g, '').trim();
      console.log(`Cleaned content: "${cleanContent}"`);
    }
    
    // レスポンスの作成を試みる
    console.log(`Running GraphAI flow...`);
    
    // GraphAIフローを実行
    const result = await graphAI.run({
      ...webSearchFlow,
      nodes: {
        ...webSearchFlow.nodes,
        input: { value: cleanContent }
      }
    });

    // レスポンスの送信
    if (result && result.output) {
      console.log(`GraphAI flow completed successfully. Sending response...`);
      await message.reply(result.output);
      console.log(`Response sent successfully`);
    } else {
      console.log(`GraphAI flow didn't return any output`);
      await message.reply("処理は完了しましたが、返答を生成できませんでした。");
    }
  } catch (error) {
    logError('Message Processing', error);
    
    try {
      await message.reply('処理中にエラーが発生しました。詳細はログを確認してください。');
    } catch (replyError) {
      logError('Error Reply Failed', replyError);
    }
  }
}

// スレッド作成のモニタリング - ボットのスレッドを追跡
client.on(Events.ThreadCreate, (thread) => {
  if (thread.ownerId === client.user.id) {
    botThreads.set(thread.id, true);
    console.log(`Tracking new bot-created thread: ${thread.name} (${thread.id})`);
  }
});

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