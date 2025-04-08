/**
 * Gemini APIとの連携エージェント
 * Gemini 2.0 Flash APIを使用した会話処理を行います
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Gemini APIクライアントの初期化
const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
const model = genAI.getGenerativeModel({ model: config.gemini.model });

// プロンプトテンプレート
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

// 会話履歴の保存先
const HISTORY_DIR = path.join(__dirname, '../../data/conversations');
if (!fs.existsSync(HISTORY_DIR)) {
  fs.mkdirSync(HISTORY_DIR, { recursive: true });
}

// 会話履歴の取得
function getConversationHistory(userId) {
  const filePath = path.join(HISTORY_DIR, `${userId}.json`);
  
  if (!fs.existsSync(filePath)) {
    return [];
  }
  
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error('History file read error:', error);
    return [];
  }
}

// 会話履歴の保存
function saveConversationHistory(userId, history) {
  const filePath = path.join(HISTORY_DIR, `${userId}.json`);
  
  try {
    // 最新の10件のみ保存（コンテキストウィンドウの制限のため）
    const recentHistory = history.slice(-10);
    fs.writeFileSync(filePath, JSON.stringify(recentHistory, null, 2), 'utf8');
  } catch (error) {
    console.error('History file write error:', error);
  }
}

// 会話履歴のクリア
function clearConversationHistory(userId) {
  const filePath = path.join(HISTORY_DIR, `${userId}.json`);
  
  try {
    fs.writeFileSync(filePath, JSON.stringify([]), 'utf8');
    return true;
  } catch (error) {
    console.error('History clear error:', error);
    return false;
  }
}

// GraphAIエージェント定義
module.exports = async function geminiAgent(inputs, context) {
  const { query, userId, username = 'ユーザー', imageUrl = null } = inputs;
  
  // 会話履歴の取得
  let history = getConversationHistory(userId);
  
  try {
    // 新しいメッセージを履歴に追加
    history.push({
      role: 'user',
      content: query,
      timestamp: new Date().toISOString()
    });
    
    // 会話履歴のフォーマット変換
    const formattedHistory = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));
    
    // 会話の初期化（履歴がある場合はそれを含める）
    const chat = model.startChat({
      history: formattedHistory.length > 1 ? formattedHistory.slice(0, -1) : [],
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
    
    // 画像付きメッセージの場合
    let result;
    if (imageUrl) {
      console.log(`🖼️ Processing message with image: ${imageUrl}`);
      const imageParts = [
        { text: prompt },
        { inlineData: { mimeType: 'image/jpeg', data: imageUrl } }
      ];
      result = await model.generateContent(imageParts);
    } else {
      // テキストのみのメッセージ
      result = await chat.sendMessage(prompt);
    }
    
    const response = await result.response;
    const text = response.text();
    
    // AIの返答を履歴に追加
    history.push({
      role: 'assistant',
      content: text,
      timestamp: new Date().toISOString()
    });
    
    // 会話履歴の保存
    saveConversationHistory(userId, history);
    
    // 結果を返却
    return {
      response: text,
      history: history
    };
  } catch (error) {
    console.error('Gemini API Error:', error);
    return {
      error: true,
      message: `AIモデルとの通信中にエラーが発生しました: ${error.message}`
    };
  }
};

// 会話履歴のクリア関数をエクスポート
module.exports.clearConversationHistory = clearConversationHistory;