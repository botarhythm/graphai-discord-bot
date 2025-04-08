// Blobのインポート
import Blob from 'cross-blob';
import { Client, GatewayIntentBits, ChannelType, Partials } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

// グローバルにBlobを設定
globalThis.Blob = Blob;

// エージェントのインポート
import CommandParserAgent from './agents/command-parser-agent.js';
import WebSearchAgent from './agents/web-search-agent.js';
import SearchResultFormatterAgent from './agents/search-result-formatter-agent.js';

// ウェブ検索フローの設定をインポート
// @ts-ignore
import webSearchFlowConfig from './flows/web-search-flow.js';

// デバッグ用ヘルパー関数の読み込み
import { debugDM, log, logError } from './debug-helpers.js';

// 環境変数の読み込み
dotenv.config();

// エラーロギング関数
function logAppError(context: string, error: unknown): void {
  const timestamp = new Date().toISOString();
  const errorLog = `
===== ERROR LOG =====
Timestamp: ${timestamp}
Context: ${context}
Error: ${error instanceof Error ? error.message : String(error)}
Error Stack: ${error instanceof Error ? error.stack : 'N/A'}
==================
`;
  
  console.error(errorLog);
  
  fs.appendFile(path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'error.log'), errorLog)
    .catch(logError => {
      console.error('Failed to write error log:', logError);
    });
}

// エージェント定義
const agents = {
  commandParserAgent: CommandParserAgent,
  webSearchAgent: WebSearchAgent,
  searchResultFormatterAgent: SearchResultFormatterAgent
};

// GraphAIインターフェース（本物のGraphAIライブラリとの互換性のため）
interface GraphAI {
  run(config: any): Promise<any>;
}

class GraphAIImplementation implements GraphAI {
  version: string;
  agents: Record<string, any>;

  constructor(options: { version: string; agents: Record<string, any> }) {
    this.version = options.version;
    this.agents = options.agents;
  }

  async run(config: any): Promise<any> {
    try {
      // 入力値の取得
      const inputValue = config.nodes.input.value;
      
      console.log(`GraphAI processing input: "${inputValue}"`);
      
      // コマンドの解析
      const commandResult = await this.agents.commandParserAgent.process(inputValue);
      
      console.log(`Command parsed:`, commandResult);
      
      // コマンドタイプに沿って処理を分岐
      if (commandResult.command === 'webSearch' && commandResult.args) {
        // Web検索の実行
        const searchResult = await this.agents.webSearchAgent.process(commandResult.args);
        
        // 検索結果の整形
        const formattedResult = await this.agents.searchResultFormatterAgent.process(searchResult);
        
        console.log(`Search completed and formatted`);
        return { output: formattedResult };
      } else if (commandResult.command === 'help') {
        // ヘルプテキストを返す
        console.log(`Help command requested`);
        return { output: config.nodes.helpCommand.value };
      } else {
        // その他のコマンドやチャット
        console.log(`Default chat response`);
        return { output: config.nodes.chatDefault.value };
      }
    } catch (error) {
      logAppError('GraphAI Flow Execution', error);
      throw error;
    }
  }
}

// メインアプリケーション関数
async function startBot(): Promise<void> {
  // Discordクライアントの設定
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.DirectMessageTyping,
      GatewayIntentBits.DirectMessageReactions
    ],
    partials: [
      Partials.Channel,     // DMチャンネルを部分的に取得するために必要
      Partials.Message,     // キャッシュないメッセージを処理するために必要
      Partials.User         // キャッシュないユーザーを処理するために必要
    ]
  });

  // GraphAIインスタンスの作成
  const graphAI = new GraphAIImplementation({
    version: '0.5',
    agents: agents
  });

  // Discordボットのログイン完了
  client.once('ready', () => {
    console.log(`Logged in as ${client.user?.tag}`);
    console.log(`Bot is ready with intents:`, client.options.intents);
  });

  // デバッグイベントリスナー：すべてのイベントをログに記録
  client.on('debug', (info) => {
    console.log(`[Discord Debug] ${info}`);
  });

  client.on('error', (error) => {
    logAppError('Discord Client Error', error);
  });

  // メッセージ受信イベント
  client.on('messageCreate', async (message) => {
    // ボット自身のメッセージは無視
    if (message.author.bot) return;

    // 以下の条件以外は処理しない
    // 1. ボットがメンションされた場合
    // 2. DMの場合
    // 3. ボットが起点のスレッド内のメッセージ
    const botId = client.user?.id;
    const botMentionRegex = new RegExp(`<@!?${botId}>`, 'i');
    const isMentioned = botId && botMentionRegex.test(message.content);
    const isDM = !message.guild;
    
    // スレッド関連の確認（スレッドが存在し、親がボットか）
    let isThreadReply = false;
    if (message.channel.isThread && message.channel.isThread()) {
      try {
        const threadStarterMessage = await message.channel.fetchStarterMessage().catch(() => null);
        if (threadStarterMessage && threadStarterMessage.author.id === client.user?.id) {
          isThreadReply = true;
        }
      } catch (e) {
        console.error("Thread check error:", e);
      }
    }
    
    // 詳細なログ出力
    console.log(`Message received: "${message.content}" from ${message.author.tag} in ${message.guild ? message.guild.name : 'DM'}`);
    console.log(`Channel type: ${message.channel.type}`);
    console.log(`Check conditions: isMentioned=${isMentioned}, isDM=${isDM}, isThreadReply=${isThreadReply}`);

    // 条件チェック - どの条件も満たさない場合は処理しない
    if (!isMentioned && !isDM && !isThreadReply) {
      console.log("Message ignored: Does not meet bot interaction criteria");
      return;
    }

    console.log("Message will be processed: Meets bot interaction criteria");

    try {
      // メンションを取り除く処理
      let cleanContent = message.content;
      if (isMentioned && botId) {
        cleanContent = cleanContent.replace(new RegExp(`<@!?${botId}>`, 'g'), '').trim();
      }

      console.log(`Processing content: "${cleanContent}"`);
      
      // GraphAIフローの実行
      const result = await graphAI.run({
        ...webSearchFlowConfig,
        nodes: {
          ...(webSearchFlowConfig as any).nodes,
          input: { value: cleanContent }
        }
      });

      // 検索結果の送信
      if ((result as any).output) {
        console.log(`Replying to message with: "${(result as any).output.substring(0, 100)}..."`);
        await message.reply((result as any).output)
          .then(() => console.log('Reply sent successfully'))
          .catch(err => {
            console.error('Error replying to message:', err);
            // DMの場合は別のアプローチを試す
            if (!message.guild) {
              console.log('Trying alternative approach for DM');
              message.author.send((result as any).output)
                .then(() => console.log('Direct message sent successfully'))
                .catch(dmErr => console.error('Failed to send direct message:', dmErr));
            }
          });
      }
    } catch (error) {
      logAppError('Message Processing', error);
      message.reply('処理中に予期せぬエラーが発生しました。管理者はログを確認してください。')
        .catch(err => console.error('Failed to send error message:', err));
    }
  });

  // ボットログイン
  try {
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    logAppError('Discord Login', error);
    process.exit(1);
  }
}

// アプリケーション起動
startBot().catch(error => {
  logAppError('Application Startup', error);
  process.exit(1);
});

// プロセス全体のエラーハンドリング
process.on('uncaughtException', (error) => {
  logAppError('Uncaught Exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logAppError('Unhandled Rejection', reason);
});