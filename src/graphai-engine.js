/**
 * GraphAIエンジン初期化
 */

// Node.js v18未満でも動作するようにBlobのpolyfillをグローバルに追加
const CrossBlob = require('cross-blob');
global.Blob = CrossBlob;

const { createEngine } = require('graphai');
const config = require('./config');
const fs = require('fs');
const path = require('path');

// GraphAIエンジンの初期化
const engine = createEngine({
  logLevel: 'debug', // より詳細なログを出力
  monitoring: true,
});

// 基本エージェントの登録
engine.registerAgent('discordInputAgent', require('./agents/discord-input'));
engine.registerAgent('commandParserAgent', require('./agents/command-parser'));
engine.registerAgent('contentTypeDetectorAgent', require('./agents/content-detector'));
engine.registerAgent('staticResponseAgent', require('./agents/static-response-agent'));
engine.registerAgent('copyAgent', require('./agents/copy-agent'));
engine.registerAgent('discordOutputAgent', require('./agents/discord-output'));
engine.registerAgent('geminiAgent', require('./agents/gemini-agent'));

// ウェブ検索エージェントの登録
engine.registerAgent('webSearchAgent', require('./agents/web-search-agent'));

// メインフローの登録
const mainFlow = require('./flows/main-flow');
engine.registerFlow('main', mainFlow);
console.log('📊 Registered main flow');

// ウェブ検索フローの登録
try {
  const webSearchFlow = require('./flows/web-search-flow');
  engine.registerFlow('webSearch', webSearchFlow);
  console.log('🔍 Registered web search flow');
} catch (error) {
  console.warn('⚠️ Web search flow registration failed:', error.message);
}

console.log('🧠 GraphAI Engine initialized with Gemini AI support');

module.exports = engine;