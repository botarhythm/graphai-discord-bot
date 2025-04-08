import { Client, GatewayIntentBits } from 'discord.js';
import { GraphAI } from 'graphai';
import dotenv from 'dotenv';
import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

import CommandParserAgent from './agents/command-parser-agent.js';
import WebSearchAgent from './agents/web-search-agent.js';
import SearchResultFormatterAgent from './agents/search-result-formatter-agent.js';

dotenv.config();

const agents = {
  commandParserAgent: CommandParserAgent,
  webSearchAgent: WebSearchAgent,
  searchResultFormatterAgent: SearchResultFormatterAgent
};

function loadFlow(flowPath) {
  const fileContents = fs.readFileSync(flowPath, 'utf8');
  return yaml.load(fileContents);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const webSearchFlow = loadFlow(path.resolve('./src/flows/web-search-flow.yaml'));

const graphAI = new GraphAI({
  agents: agents
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  try {
    const result = await graphAI.run({
      ...webSearchFlow,
      nodes: {
        ...webSearchFlow.nodes,
        input: { value: message.content }
      }
    });

    if (result.output) {
      message.reply(result.output);
    }
  } catch (error) {
    console.error('GraphAI実行エラー:', error);
    message.reply('処理中にエラーが発生しました。');
  }
});

client.login(process.env.DISCORD_TOKEN);