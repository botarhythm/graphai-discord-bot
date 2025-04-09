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
  
  // フローを実行する関数（GraphAI代替の簡易実装）
  async execute(flowName, inputs) {
    console.log(`Executing flow: ${flowName}`);
    
    if (flowName === 'main') {
      // ユーザー入力の処理
      if (inputs.discordInput) {
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