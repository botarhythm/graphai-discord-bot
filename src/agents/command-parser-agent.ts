/**
 * コマンドパーサーエージェント
 * ユーザー入力をコマンドとして解析し、適切なアクションを判断します
 */

import { Agent } from 'graphai';

class CommandParserAgent implements Agent {
  name = 'CommandParserAgent';

  async process(input: string): Promise<{ command: string; args: string | null }> {
    // 入力テキストの整形
    const text = input.trim();
    
    // コマンド判定
    if (text.startsWith('!image ')) {
      // 画像生成コマンド
      return {
        command: 'generateImage',
        args: text.substring(7).trim()
      };
    } else if (text === '/help') {
      // ヘルプコマンド
      return {
        command: 'help',
        args: null
      };
    } else if (text === '/clear') {
      // 履歴クリアコマンド
      return {
        command: 'clearHistory',
        args: null
      };
    } else if (text.startsWith('!search ')) {
      // 検索コマンド
      return {
        command: 'webSearch',
        args: text.substring(8).trim()
      };
    } else {
      // 通常の会話
      return {
        command: 'chat',
        args: text
      };
    }
  }
}

export default new CommandParserAgent();
