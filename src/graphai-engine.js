/**
 * GraphAIエンジン初期化
 */

const { createEngine } = require('graphai');
const config = require('./config');
const fs = require('fs');
const path = require('path');

// GraphAIエンジンの初期化
const engine = createEngine({
  logLevel: config.graphai.logLevel,
  monitoring: config.graphai.enableMonitoring,
});

// 基本エージェントの登録
engine.registerAgent('discordInputAgent', require('./agents/discord-input'));
engine.registerAgent('commandParserAgent', require('./agents/command-parser'));
engine.registerAgent('contentTypeDetectorAgent', require('./agents/content-detector'));
engine.registerAgent('geminiAgent', require('./agents/gemini-agent'));
engine.registerAgent('imageGenerationAgent', require('./agents/image-generation'));
engine.registerAgent('discordOutputAgent', require('./agents/discord-output'));
engine.registerAgent('staticResponseAgent', require('./agents/static-response-agent'));
engine.registerAgent('copyAgent', require('./agents/copy-agent'));

// フローディレクトリからすべてのフローを読み込む（main-flow.js以外）
const flowsDir = path.join(__dirname, 'flows');
if (fs.existsSync(flowsDir)) {
  const flowFiles = fs.readdirSync(flowsDir)
    .filter(file => file.endsWith('.js') && file !== 'main-flow.js');
  
  for (const file of flowFiles) {
    const flowName = path.basename(file, '.js');
    const flowDefinition = require(`./flows/${file}`);
    engine.registerFlow(flowName, flowDefinition);
    console.log(`📊 Registered flow: ${flowName}`);
  }
}

// メインフローの登録
const mainFlow = require('./flows/main-flow');
engine.registerFlow('main', mainFlow);
console.log('📊 Registered main flow');

console.log('🧠 GraphAI Engine initialized');

module.exports = engine;