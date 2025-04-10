/**
 * Brave Search API
 * ウェブ検索機能を提供するユーティリティ
 */

const dotenv = require('dotenv');
// node-fetch v3は通常ESMのみだが、cross-fetchはCommonJSでも動作する
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

dotenv.config();

/**
 * Brave Search APIを使用してウェブ検索を実行
 * @param {string} query - 検索クエリ
 * @param {Object} options - 検索オプション
 * @returns {Promise<Array>} 検索結果配列
 */
async function brave_web_search(query, options = {}) {
  const {
    count = 5,
    offset = 0,
    safe = true,
    country = 'JP',  // 日本の検索結果を優先
    language = 'ja'  // 日本語の検索結果を優先
  } = options;

  if (!query || typeof query !== 'string' || query.trim() === '') {
    console.log('Invalid or empty search query');
    return [];
  }

  console.log(`Brave Search API querying: "${query}"`);

  try {
    const apiKey = process.env.BRAVE_API_KEY;
    if (!apiKey) {
      console.error('BRAVE_API_KEY is not set in environment variables');
      throw new Error('API キーが設定されていません');
    }

    // Brave Search APIにリクエスト
    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}&offset=${offset}&country=${country}&language=${language}`, {
      method: 'GET',
      headers: {
        'X-Subscription-Token': apiKey,
        'Accept': 'application/json',
        'Accept-Language': 'ja'
      }
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`Brave API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`検索API エラー: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.web || !data.web.results) {
      console.log('No search results found or invalid response format');
      return [];
    }

    console.log(`Received ${data.web.results.length} raw search results, returning up to ${count}`);

    return data.web.results.map(result => ({
      title: result.title,
      link: result.url,
      description: result.description
    })).slice(0, count);

  } catch (error) {
    console.error('Brave検索エラー:', error);
    throw error;
  }
}

module.exports = {
  brave_web_search
};