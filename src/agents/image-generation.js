/**
 * 画像生成エージェント
 * Recraft APIを使用して画像生成を行います
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// 使用回数のカウンターファイル
const COUNTER_FILE = path.join(__dirname, '../../data/image_counter.json');

// 使用回数の取得
function getUsageCounter() {
  if (!fs.existsSync(COUNTER_FILE)) {
    return { date: new Date().toISOString().split('T')[0], count: 0 };
  }
  
  try {
    return JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf8'));
  } catch (error) {
    console.error('Counter file read error:', error);
    return { date: new Date().toISOString().split('T')[0], count: 0 };
  }
}

// 使用回数の更新
function updateUsageCounter() {
  const counter = getUsageCounter();
  const today = new Date().toISOString().split('T')[0];
  
  // 日付が変わっていたらリセット
  if (counter.date !== today) {
    counter.date = today;
    counter.count = 0;
  }
  
  counter.count += 1;
  fs.writeFileSync(COUNTER_FILE, JSON.stringify(counter), 'utf8');
  return counter;
}

/**
 * プロンプト最適化関数
 * 生成AIを使用してより良い画像生成用プロンプトを作成します
 */
async function optimizePrompt(rawPrompt) {
  // プロンプト最適化のロジック（将来的にはLLMを使用して拡張する予定）
  // 現在は簡単な変換のみ実装
  
  // 日本語プロンプトを検出して英語に付け加える（単純な実装）
  const isJapanese = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/g.test(rawPrompt);
  
  if (isJapanese) {
    // 日本語が含まれる場合は、英語の基本的な修飾子を追加
    return `${rawPrompt}, high quality, detailed, photorealistic, 8k resolution, masterpiece`;
  }
  
  return rawPrompt;
}

// GraphAIエージェント定義
module.exports = async function imageGenerationAgent(inputs, context) {
  const { prompt } = inputs;
  
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return {
      error: true,
      message: 'プロンプトが指定されていません。画像を生成するためのプロンプトを入力してください。'
    };
  }
  
  // 使用回数のチェック
  const counter = getUsageCounter();
  const today = new Date().toISOString().split('T')[0];
  
  // 日付が変わっていたらリセット
  if (counter.date !== today) {
    counter.date = today;
    counter.count = 0;
  }
  
  // 上限チェック
  if (counter.count >= config.recraft.dailyLimit) {
    return {
      error: true,
      message: `1日の画像生成上限(${config.recraft.dailyLimit}枚)に達しました。明日またお試しください。`
    };
  }
  
  try {
    // プロンプトの最適化
    const optimizedPrompt = await optimizePrompt(prompt);
    console.log(`🖌️ Optimized prompt: "${optimizedPrompt}"`);
    
    // Recraft APIで画像生成
    const response = await axios.post(
      'https://api.recraft.ai/v1/images/generations',
      {
        prompt: optimizedPrompt,
        negative_prompt: 'low quality, blurry, distorted, deformed, disfigured, bad anatomy, watermark',
        width: 768,
        height: 768,
        number_of_images: 1,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.recraft.apiKey}`
        }
      }
    );
    
    // 使用回数のカウントアップ
    updateUsageCounter();
    
    // 結果を返却
    return {
      imageUrl: response.data.images[0].url,
      prompt: optimizedPrompt,
      remainingCount: config.recraft.dailyLimit - (counter.count + 1),
      generationId: response.data.id
    };
  } catch (error) {
    console.error('Recraft API Error:', error);
    return {
      error: true,
      message: `画像生成中にエラーが発生しました: ${error.message}`
    };
  }
};