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

    // !コマンド形式かどうかをチェック
    const prefix = process.env.PREFIX || '!';
    if (message.content.startsWith(prefix)) {
      const args = message.content.slice(prefix.length).trim().split(/ +/);
      const command = args.shift().toLowerCase();

      // !search コマンドをチェック
      if (command === 'search') {
        const searchQuery = args.join(' ');
        console.log(`!search command detected with query: "${searchQuery}"`);
        
        try {
          // 検索中メッセージを送信
          const searchingMsg = await message.reply(`「${searchQuery}」を検索中...`);
          
          // Web検索を実行
          const searchAgent = new WebSearchAgent();
          const searchResults = await searchAgent.process(searchQuery);
          
          // 結果をフォーマット
          const formatterAgent = new SearchResultFormatterAgent();
          const formattedResults = await formatterAgent.process(searchResults);
          
          // 結果を返信
          await searchingMsg.edit(formattedResults);
          console.log("Search results sent successfully");
          return;
        } catch (error) {
          console.error("Error executing search:", error);
          await message.reply(`検索中にエラーが発生しました: ${error.message}`);
          return;
        }
      }
      
      // !image コマンドをチェック
      if (command === 'image') {
        console.log(`!image command detected with prompt: "${args.join(' ')}"`);
        await message.reply(`画像生成機能は近日実装予定です。しばらくお待ちください。`);
        return;
      }
      
      // !help コマンドをチェック
      if (command === 'help') {
        console.log(`!help command detected`);
        const helpText = `# ボッチー ヘルプ

以下のコマンドが利用可能です：

**一般コマンド:**
- \`!search [検索語句]\` - ウェブ検索を行います
- \`!image [プロンプト]\` - 指定したプロンプトで画像を生成します (近日実装予定)

**システムコマンド:**
- \`!help\` - このヘルプメッセージを表示します
- \`!clear\` - 会話履歴をクリアします (近日実装予定)

画像付きメッセージを送ると、その画像について分析や質問に答えることができます (近日実装予定)。`;
        
        await message.reply(helpText);
        return;
      }
    }

    // 通常会話の処理（現在は制限メッセージ）
    console.log(`GraphAI processing input: "${message.content}"`);
    console.log("Command parsed: { command: 'chat', args: '" + message.content + "' }");
    console.log("Default chat response");

    // デフォルトのレスポンス
    await message.reply("この機能はまだ実装中です。!search コマンドを使ってウェブ検索を試してみてください。\n\n例: `!search 天気 東京`\n\nコマンド一覧を見るには `!help` と入力してください。");
  });

  console.log("Message handler successfully set up");
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