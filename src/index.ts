import { Blob } from 'cross-blob';
import { Client, GatewayIntentBits } from 'discord.js';
import { GraphAI } from 'graphai';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

// グローバルにBlobを設定
globalThis.Blob = Blob;

// エージェントのインポート
import CommandParserAgent from './agents/command-parser-agent';
import WebSearchAgent from './agents/web-search-agent';
import SearchResultFormatterAgent from './agents/search-result-formatter-agent';

// 環境変数の読み込み
dotenv.config();

// エラーロギング関数
function logError(context: string, error: unknown): void {
  const timestamp = new Date().toISOString();
  const errorLog = `
===== ERROR LOG =====
Timestamp: ${timestamp}
Context: ${context}
Error: ${error instanceof Error ? error.message : String(error)}
Error Stack: ${error instanceof Error ? error.stack : 'N/A'}
====================
`;
  
  console.error(errorLog);
  
  fs.appendFile(path.join(__dirname, '..', 'error.log'), errorLog)
    .catch(logError => {
      console.error('Failed to write error log:', logError);
    });
}

// エージェント登録
const agents = {
  commandParserAgent: CommandParserAgent,
  webSearchAgent: WebSearchAgent,
  searchResultFormatterAgent: SearchResultFormatterAgent
};

// フロー読み込み関数
async function loadFlow(flowPath: string): Promise<unknown> {
  try {
    const fileContents = await fs.readFile(flowPath, 'utf8');
    return yaml.load(fileContents);
  } catch (error) {
    logError('Flow Loading', error);
    throw error;
  }
}

// メインアプリケーション関数
async function startBot(): Promise<void> {
  // メインフロー読み込み
  const webSearchFlow = await loadFlow(path.resolve(__dirname, 'flows', 'web-search-flow.yaml'));

  // Discordクライアントの設定
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  // GraphAIインスタンスの作成
  const graphAI = new GraphAI({
    version: '0.5',
    agents: agents
  });

  // Discordボットのログイン準備
  client.once('ready', () => {
    console.log(`Logged in as ${client.user?.tag}`);
  });

  // メッセージ受信イベント
  client.on('messageCreate', async (message) => {
    // ボット自身のメッセージは無視
    if (message.author.bot) return;

    try {
      // GraphAIフローの実行
      const result = await graphAI.run({
        ...webSearchFlow as object,
        nodes: {
          ...(webSearchFlow as any).nodes,
          input: { value: message.content }
        }
      });

      // 検索結果の送信
      if ((result as any).output) {
        message.reply((result as any).output);
      }
    } catch (error) {
      logError('Message Processing', error);
      message.reply('処理中に予期せぬエラーが発生しました。詳細はログを確認してください。');
    }
  });

  // ボットログイン
  try {
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    logError('Discord Login', error);
    process.exit(1);
  }
}

// アプリケーション起動
startBot().catch(error => {
  logError('Application Startup', error);
  process.exit(1);
});

// プロセス全体のエラーハンドリング
process.on('uncaughtException', (error) => {
  logError('Uncaught Exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logError('Unhandled Rejection', reason);
});
