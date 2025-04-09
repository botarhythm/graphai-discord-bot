/**
 * コンテンツタイプ検出エージェント
 */

const ContentDetectorAgent = {
  /**
   * メッセージのコンテンツタイプを検出する
   * @param {Object} message - Discordメッセージオブジェクト
   * @returns {Object} 検出されたコンテンツ情報
   */
  async process(message) {
    try {
      // メッセージが無効な場合
      if (!message) {
        return { hasImage: false, isWebSearchQuery: false };
      }

      // メッセージの添付ファイルを確認
      const hasAttachment = message.attachments && message.attachments.length > 0;
      // 添付ファイルが画像かどうかを確認
      const isImageAttachment = hasAttachment && 
        message.attachments.some(attachment => {
          const url = attachment.toLowerCase();
          return url.endsWith('.jpg') || url.endsWith('.jpeg') || 
                 url.endsWith('.png') || url.endsWith('.gif') || 
                 url.endsWith('.webp');
        });

      // ウェブ検索クエリかどうかを判定
      const isWebSearchQuery = this.isSearchQuery(message.content);

      return {
        hasImage: hasAttachment && isImageAttachment,
        isWebSearchQuery: isWebSearchQuery
      };
    } catch (error) {
      console.error('Content detection error:', error);
      return { hasImage: false, isWebSearchQuery: false };
    }
  },

  /**
   * テキストが検索クエリかどうかを判定
   * @param {string} text - 判定するテキスト
   * @returns {boolean} 検索クエリであればtrue
   */
  isSearchQuery(text) {
    if (!text || typeof text !== 'string') return false;

    // 検索クエリとして判定するパターン
    const searchPatterns = [
      /検索して/i,
      /調べて/i,
      /教えて/i,
      /最新.*情報/i,
      /検索結果/i,
      /what is|who is|how to|when did|where is/i
    ];

    return searchPatterns.some(pattern => pattern.test(text));
  }
};

module.exports = ContentDetectorAgent;