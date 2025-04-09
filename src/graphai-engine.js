/**
 * GraphAIエンジン初期化
 */

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

// メインフローの登録
const mainFlow = require('./flows/main-flow');
engine.registerFlow('main', mainFlow);
console.log('📊 Registered main flow');

console.log('🧠 GraphAI Engine initialized with Gemini AI support');

module.exports = engine;