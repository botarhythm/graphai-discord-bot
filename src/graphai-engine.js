/**
 * GraphAIエンジン初期化
 */

// Node.js v18未満でも動作するようにBlobのpolyfillをグローバルに追加
const CrossBlob = require('cross-blob');
global.Blob = CrossBlob;

// GraphAIの代わりにGeminiだけを使用するシンプルなエンジン
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('./config');
const fs = require('fs');
const path = require('path');

// Web検索機能をインポート
const WebSearchAgent = require('./agents/web-search-agent');
const SearchResultFormatterAgent = require('./agents/search-result-formatter-agent');
const CommandParserAgent = require('./agents/command-parser-agent');
const ContentDetectorAgent = require('./agents/content-detector-agent');

// Gemini AIクライアントの初期化
const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
const model = genAI.getGenerativeModel({ model: config.gemini.model });

// シンプルなエンジンの作成
const engine = {
  // 会話履歴の保存先
  HISTORY_DIR: path.join(__dirname, '../data/conversations'),
  
  // 会話履歴を取得する関数
  getConversationHistory(userId) {
    if (!fs.existsSync(this.HISTORY_DIR)) {
      fs.mkdirSync(this.HISTORY_DIR, { recursive: true });
    }
    
    const filePath = path.join(this.HISTORY_DIR, `${userId}.json`);
    
    if (!fs.existsSync(filePath)) {
      return [];
    }
    
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
      console.error('History file read error:', error);
      return [];
    }
  },
  
  // 会話履歴を保存する関数
  saveConversationHistory(userId, history) {
    if (!fs.existsSync(this.HISTORY_DIR)) {
      fs.mkdirSync(this.HISTORY_DIR, { recursive: true });
    }
    
    const filePath = path.join(this.HISTORY_DIR, `${userId}.json`);
    
    try {
      // 最新の10件のみ保存（コンテキストウィンドウの制限のため）
      const recentHistory = history.slice(-10);
      fs.writeFileSync(filePath, JSON.stringify(recentHistory, null, 2), 'utf8');
    } catch (error) {
      console.error('History file write error:', error);
    }
  },
  
  // 会話履歴をクリアする関数
  clearConversationHistory(userId) {
    const filePath = path.join(this.HISTORY_DIR, `${userId}.json`);
    
    try {
      fs.writeFileSync(filePath, JSON.stringify([]), 'utf8');
      return true;
    } catch (error) {
      console.error('History clear error:', error);
      return false;
    }
  },
  
  // テキスト処理を行う関数
  async processText(input) {
    const { query, userId, username = 'ユーザー' } = input;
    
    // 会話履歴の取得
    let history = this.getConversationHistory(userId);
    
    try {
      // 新しいメッセージを履歴に追加
      history.push({
        role: 'user',
        content: query,
        timestamp: new Date().toISOString()
      });
      
      // システムプロンプト
      const SYSTEM_PROMPT = `あなたは「ボッチー」という名前のDiscord上で動作するAIアシスタントです。
以下の特徴と制約を持っています：

- 親しみやすく、フレンドリーな雰囲気を持ち、時々ユーモアを交えた会話をします
- 簡潔で分かりやすい日本語で回答します
- 専門的な話題でも理解しやすい説明を心がけます
- 質問に対して具体的かつ役立つ情報を提供します
- クリエイティブな質問にも柔軟に対応します
- 不適切なリクエストには丁寧に断ります

現在の日付: ${new Date().toISOString().split('T')[0]}
`;
      
      // 会話の初期化
      const chat = model.startChat({
        history: history.length > 1 ? history.slice(0, -1).map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        })) : [],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        ]
      });
      
      // プロンプトの準備
      let prompt = query;
      
      // システムプロンプトを初回の会話のみ追加
      if (history.length <= 1) {
        prompt = `${SYSTEM_PROMPT}\n\nユーザー: ${query}`;
      }
      
      // テキストメッセージの処理
      const result = await chat.sendMessage(prompt);
      const response = await result.response;
      const text = response.text();
      
      // AIの返答を履歴に追加
      history.push({
        role: 'assistant',
        content: text,
        timestamp: new Date().toISOString()
      });
      
      // 会話履歴の保存
      this.saveConversationHistory(userId, history);
      
      return text;
    } catch (error) {
      console.error('Gemini API Error:', error);
      return `AIモデルとの通信中にエラーが発生しました: ${error.message}`;
    }
  },

  // ウェブ検索を実行する関数
  async processWebSearch(query) {
    console.log('Processing web search for query:', query);
    try {
      // WebSearchAgentを使用して検索を実行
      const searchResults = await WebSearchAgent.process(query);
      
      // 検索結果をフォーマット
      const formattedResults = await SearchResultFormatterAgent.process(searchResults);
      
      return formattedResults;
    } catch (error) {
      console.error('Web search processing error:', error);
      return `ウェブ検索中にエラーが発生しました: ${error.message || error}`;
    }
  },
  
  // コマンドを解析する関数
  async parseCommand(message) {
    try {
      return await CommandParserAgent.process(message);
    } catch (error) {
      console.error('Command parsing error:', error);
      return { command: 'chatDefault', args: message };
    }
  },
  
  // コンテンツタイプを検出する関数
  async detectContentType(message) {
    try {
      return await ContentDetectorAgent.process(message);
    } catch (error) {
      console.error('Content detection error:', error);
      return { hasImage: false, isWebSearchQuery: false };
    }
  },
  
  // フローを実行する関数（GraphAI代替の簡易実装）
  async execute(flowName, inputs) {
    console.log(`Executing flow: ${flowName} with inputs:`, inputs);
    
    if (flowName === 'main') {
      // ユーザー入力の処理
      if (inputs.discordInput) {
        // コマンドの解析
        const parsedCommand = await this.parseCommand(inputs.discordInput.content);
        console.log('Parsed command:', parsedCommand);
        
        // コマンドに基づいて処理を分岐
        if (parsedCommand.command === 'webSearch') {
          // Web検索コマンドの処理
          const searchQuery = parsedCommand.args;
          const searchResponse = await this.processWebSearch(searchQuery);
          return {
            discordOutput: searchResponse
          };
        } else if (parsedCommand.command === 'help') {
          // ヘルプコマンドの処理
          return {
            discordOutput: `# ボッチー ヘルプ

こんにちは！ボッチーです。GraphAI技術を活用した会話ボットです。
以下の機能が利用可能です：

**基本コマンド:**
- \`!help\` - このヘルプメッセージを表示します
- \`!search [検索キーワード]\` - ウェブ検索を実行します
- \`/clear\` - 会話履歴をクリアします

**機能:**
- テキスト対話処理 - Gemini 2.0 Flash AIによる自然な会話
- ウェブ検索 - 最新の情報をウェブから検索します
- 画像分析 - 画像に関する質問に答えることができます（近日実装）

GraphAI技術を活用した高度な会話をお楽しみください！`
          };
        } else if (parsedCommand.command === 'clearChat') {
          // 会話履歴クリアコマンドの処理
          const cleared = this.clearConversationHistory(inputs.discordInput.authorId);
          return {
            discordOutput: cleared ? 
              '会話履歴をクリアしました。新しい会話を始めましょう！' : 
              '会話履歴のクリアに失敗しました。'
          };
        } else {
          // コンテンツタイプを検出
          const contentType = await this.detectContentType(inputs.discordInput);
          console.log('Detected content type:', contentType);
          
          // ウェブ検索クエリの場合は検索を実行
          if (contentType.isWebSearchQuery) {
            console.log('Detected web search query, performing search...');
            const searchResponse = await this.processWebSearch(inputs.discordInput.content);
            return {
              discordOutput: searchResponse
            };
          }
          
          // 通常のチャットメッセージとして処理
          const response = await this.processText({
            query: inputs.discordInput.content,
            userId: inputs.discordInput.authorId,
            username: inputs.discordInput.username
          });
          
          return {
            discordOutput: response
          };
        }
      }
    } else if (flowName === 'web-search') {
      // ウェブ検索フローの実行
      const searchQuery = inputs.query;
      const searchResults = await this.processWebSearch(searchQuery);
      
      return {
        discordOutput: searchResults
      };
    }
    
    return {
      error: 'Invalid flow or inputs'
    };
  },
  
  // process関数の追加（TypeScriptからの互換性のために）
  async process(flowName, inputs) {
    console.log(`Processing flow: ${flowName}`);
    
    // メッセージオブジェクトの形式をdiscordInputに変換
    if (inputs.message) {
      return await this.processText({
        query: inputs.message.content,
        userId: inputs.message.authorId,
        username: inputs.message.username
      });
    }
    
    // 既存のexecuteメソッドにフォールバック
    const result = await this.execute(flowName, inputs);
    
    // discordOutputフィールドがあれば返す
    if (result && result.discordOutput) {
      return result.discordOutput;
    }
    
    return result;
  }
};

console.log('🧠 Simple Gemini Engine initialized successfully');

module.exports = engine;