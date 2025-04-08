// Blobのインポート
import Blob from 'cross-blob';
import { Client, GatewayIntentBits } from 'discord.js';
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
=================
`;
  
  console.error(errorLog);
  
  fs.appendFile(path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'error.log'), errorLog)
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

// GraphAIインターフェースのモック（実際のGraphAIライブラリとの互換性のため）
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
      
      // コマンドの解析
      const commandResult = await this.agents.commandParserAgent.process(inputValue);
      
      // コマンドタイプに基づいて処理を分岐
      if (commandResult.command === 'webSearch' && commandResult.args) {
        // Web検索の実行
        const searchResult = await this.agents.webSearchAgent.process(commandResult.args);
        
        // 検索結果の整形
        const formattedResult = await this.agents.searchResultFormatterAgent.process(searchResult);
        
        return { output: formattedResult };
      } else if (commandResult.command === 'help') {
        // ヘルプテキストを返す
        return { output: config.nodes.helpCommand.value };
      } else {
        // その他のコマンドやチャット
        return { output: config.nodes.chatDefault.value };
      }
    } catch (error) {
      logError('GraphAI Flow Execution', error);
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
      GatewayIntentBits.MessageContent
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
  });

  // メッセージ受信イベント
  client.on('messageCreate', async (message) => {
    // ボット自身のメッセージは無視
    if (message.author.bot) return;

    try {
      // GraphAIフローの実行
      const result = await graphAI.run({
        ...webSearchFlowConfig,
        nodes: {
          ...(webSearchFlowConfig as any).nodes,
          input: { value: message.content }
        }
      });

      // 検索結果の送信
      if ((result as any).output) {
        message.reply((result as any).output);
      }
    } catch (error) {
      logError('Message Processing', error);
      message.reply('処理中に予期せぬエラーが発生しました。管理者はログを確認してください。');
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

process.on('unhandledRejection', (reason) => {
  logError('Unhandled Rejection', reason);
});
