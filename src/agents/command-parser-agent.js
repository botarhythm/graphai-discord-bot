/**
 * コマンド解析エージェント
 */

const CommandParserAgent = {
  /**
   * メッセージからコマンドを解析する
   * @param {string} message - ユーザーからのメッセージ
   * @returns {Object} 解析されたコマンド情報
   */
  async process(message) {
    try {
      // プレフィックス（環境変数から取得またはデフォルト値）
      const prefix = process.env.PREFIX || '!';
      
      // メッセージがない場合
      if (!message || typeof message !== 'string') {
        return { command: 'chatDefault', args: message, continue: true };
      }

      // メッセージのトリム
      const trimmedMessage = message.trim();

      // ヘルプコマンド
      if (trimmedMessage === `${prefix}help` || trimmedMessage === '/help') {
        return { command: 'help', args: null, continue: true };
      }

      // 会話履歴クリアコマンド
      if (trimmedMessage === '/clear') {
        return { command: 'clearChat', args: null, continue: true };
      }

      // 検索コマンド
      if (trimmedMessage.startsWith(`${prefix}search `)) {
        const searchQuery = trimmedMessage.slice(`${prefix}search `.length).trim();
        return { command: 'webSearch', args: searchQuery, continue: true };
      }

      // 画像生成コマンド
      if (trimmedMessage.startsWith(`${prefix}image `)) {
        const imagePrompt = trimmedMessage.slice(`${prefix}image `.length).trim();
        return { command: 'generateImage', args: imagePrompt, continue: true };
      }

      // その他のメッセージは通常のチャットとして扱う
      return { command: 'chatDefault', args: trimmedMessage, continue: true };
    } catch (error) {
      console.error('Command parsing error:', error);
      // エラー時はデフォルトのチャットとして扱う
      return { command: 'chatDefault', args: message, continue: true };
    }
  }
};

module.exports = CommandParserAgent;