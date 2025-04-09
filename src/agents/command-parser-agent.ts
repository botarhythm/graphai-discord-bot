/**
 * コマンドパーサーエージェント
 * メッセージからコマンド形式やキーワードを検出して解析します
 */

interface CommandParserResult {
  command: string;
  args?: string;
  isWebSearch?: boolean;
  helpRequested?: boolean;
  clearRequested?: boolean;
  continue?: boolean;
  query?: string;
}

class CommandParserAgent {
  name = 'CommandParserAgent';

  async process(input: any): Promise<CommandParserResult> {
    console.log(`CommandParserAgent processing input:`, input);
    
    // 入力がオブジェクトの場合（GraphAIからのオブジェクト入力）
    let message = input;
    if (typeof input === 'object' && input !== null) {
      if (input.content) {
        message = input.content;
      } else if (input.message) {
        message = input.message;
      } else {
        console.log('Invalid input format. No content or message property found in input object.');
        return { command: 'chatDefault', args: '', continue: true };
      }
    }
    
    if (!message || typeof message !== 'string') {
      console.log('Invalid message format. Expected string but got:', typeof message);
      return { command: 'chatDefault', args: '', continue: true };
    }

    // デフォルトの継続フラグ
    let continueFlag = true;
    
    // コマンド前置詞の検出
    const prefix = process.env.PREFIX || '!';
    
    // コマンドの処理
    if (message.startsWith(prefix)) {
      const args = message.slice(prefix.length).trim().split(/ +/);
      const command = args.shift()?.toLowerCase() || '';
      const fullArgs = args.join(' ');
      
      console.log(`Detected command: ${command}, with args: ${fullArgs}`);
      
      // 各種コマンドの処理
      if (command === 'help') {
        return { 
          command: 'help', 
          helpRequested: true, 
          continue: continueFlag 
        };
      } else if (command === 'search' || command === 'web') {
        if (!fullArgs || fullArgs.trim() === '') {
          console.log('Empty search query');
          return {
            command: 'chatDefault',
            continue: continueFlag,
            query: '検索キーワードが指定されていません。!search [検索キーワード] の形式で指定してください。'
          };
        }
        
        console.log(`Processing web search command with query: ${fullArgs}`);
        return { 
          command: 'webSearch', 
          args: fullArgs, 
          isWebSearch: true,
          continue: continueFlag 
        };
      } else if (command === 'clear') {
        return { 
          command: 'clearChat', 
          clearRequested: true, 
          continue: continueFlag 
        };
      } else if (command === 'image') {
        if (!fullArgs || fullArgs.trim() === '') {
          return {
            command: 'chatDefault',
            continue: continueFlag,
            query: '画像生成のプロンプトが指定されていません。!image [生成する画像の説明] の形式で指定してください。'
          };
        }
        
        return { 
          command: 'generateImage', 
          args: fullArgs, 
          continue: continueFlag 
        };
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
      
      // クエリが有効な場合のみWeb検索を実行
      if (query && query.trim() !== '') {
        console.log(`Detected implicit web search with query: ${query}`);
        return { 
          command: 'webSearch', 
          args: query, 
          isWebSearch: true,
          continue: continueFlag 
        };
      }
    }

    // 通常のチャットメッセージとして処理
    console.log('Processing as default chat message');
    return { 
      command: 'chatDefault', 
      args: message, 
      query: message,
      continue: continueFlag 
    };
  }
}

export default new CommandParserAgent();