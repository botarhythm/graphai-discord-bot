/**
 * Brave APIを使用したウェブ検索エージェント
 */

const fetch = require('node-fetch');
const config = require('../config');

const WebSearchAgent = {
  /**
   * ウェブ検索を実行する
   * @param {string} query - 検索クエリ
   * @param {Object} options - 検索オプション
   * @returns {Promise<Object>} 検索結果
   */
  async process(query, options = {}) {
    try {
      // APIキーの確認
      if (!config.brave || !config.brave.apiKey) {
        throw new Error('Brave API key is not configured');
      }

      // リクエストパラメータの構築
      const params = new URLSearchParams();
      
      // 基本パラメータを追加
      params.append('q', query);
      params.append('count', options.count || 5); // 結果の数 (デフォルト: 5)
      params.append('offset', options.offset || 0); // ページネーション用オフセット
      params.append('country', options.country || 'jp'); // 国コード
      params.append('search_lang', options.search_lang || 'ja'); // 検索言語
      params.append('ui_lang', options.ui_lang || 'ja-JP'); // UI言語
      params.append('safesearch', options.safesearch || 'moderate'); // 安全検索設定
      params.append('text_decorations', 'false'); // テキスト装飾なし

      // 任意のパラメータを追加
      if (options.freshness) {
        params.append('freshness', options.freshness);
      }

      // APIエンドポイント
      const endpoint = `https://api.search.brave.com/res/v1/web/search?${params.toString()}`;

      // APIリクエストの送信
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate, br',
          'X-Subscription-Token': config.brave.apiKey
        }
      });

      // レスポンスが成功しない場合
      if (!response.ok) {
        throw new Error(`Search API error: ${response.status} ${response.statusText}`);
      }

      // レスポンスのパース
      const data = await response.json();
      
      // クエリを追加
      data.query = query;
      
      return data;
    } catch (error) {
      console.error('Web search error:', error);
      return {
        error: true,
        message: error.message,
        query
      };
    }
  }
};

module.exports = WebSearchAgent;