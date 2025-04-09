/**
 * コマンドパーサーエージェント
 * メッセージからコマンド形式やキーワードを検出して解析します
 */

class CommandParserAgent {
  static async process(message) {
    console.log(`CommandParserAgent processing message: ${message}`);
    
    if (!message || typeof message !== 'string') {
      console.log('Invalid message format. Expected string but got:', typeof message);
      return { command: 'chatDefault', args: message };
    }

    // コマンド前置詞の検出
    const prefix = process.env.PREFIX || '!';
    
    // コマンドの処理
    if (message.startsWith(prefix)) {
      const args = message.slice(prefix.length).trim().split(/ +/);
      const command = args.shift().toLowerCase();
      
      console.log(`Detected command: ${command}, with args:`, args);
      
      if (command === 'help') {
        return { command: 'help' };
      } else if (command === 'search' || command === 'web') {
        return { command: 'webSearch', args: args.join(' '), isWebSearch: true };
      } else if (command === 'clear') {
        return { command: 'clearChat' };
      } else if (command === 'image') {
        return { command: 'generateImage', args: args.join(' ') };
      }
    }
    
    // Web検索トリガーの検出
    const searchTriggers = [
      '検索して', 
      '調べて', 
      'について教えて', 
      'について知りたい', 
      'web search', 
      'what is', 
      'who is'
    ];

    const lowercaseMessage = message.toLowerCase();
    const isWebSearch = searchTriggers.some(trigger => 
      lowercaseMessage.includes(trigger.toLowerCase())
    );

    let query = message;
    if (isWebSearch) {
      searchTriggers.forEach(trigger => {
        query = query.replace(new RegExp(trigger, 'gi'), '').trim();
      });
      
      console.log(`Detected web search with query: ${query}`);
      return { command: 'webSearch', args: query, isWebSearch: true, query: query };
    }

    // 通常のチャットメッセージとして処理
    console.log('Processing as chat message');
    return { command: 'chatDefault', args: message, query: message };
  }
}

// ESM互換性のため、両方のエクスポート形式をサポート
if (typeof module !== 'undefined' && module.exports) {
  // CommonJS環境
  module.exports = CommandParserAgent;
} else {
  // ESモジュール環境
  export default CommandParserAgent;
}