/**
 * ウェブ検索エージェント
 * Brave Search APIを使用してウェブ検索を実行します
 */

// モジュール環境を検出し適切にインポート
let braveSearch;
if (typeof require !== 'undefined') {
  // CommonJS環境
  braveSearch = require('../utils/brave-search');
} else {
  // ESモジュール環境
  import('../utils/brave-search.js').then(module => {
    braveSearch = module;
  });
}

class WebSearchAgent {
  static async process(query) {
    console.log(`WebSearchAgent processing query: "${query}"`);
    
    if (!query || typeof query !== 'string' || query.trim() === '') {
      console.log('Invalid or empty search query');
      return { 
        type: 'error',
        message: '検索クエリが無効または空です。',
        results: []
      };
    }

    try {
      console.log(`Executing web search for: "${query}"`);
      
      // モジュール環境に応じた呼び出し方法
      let searchResults;
      if (typeof braveSearch.brave_web_search === 'function') {
        // CommonJS環境
        searchResults = await braveSearch.brave_web_search(query, {
          count: 5, 
          safe: true
        });
      } else {
        // ESモジュール環境またはダイナミックインポート
        const module = braveSearch || await import('../utils/brave-search.js');
        searchResults = await module.brave_web_search(query, {
          count: 5, 
          safe: true
        });
      }

      console.log(`Received ${searchResults.length} search results for query "${query}"`);

      return {
        type: 'web_search',
        query: query,
        results: searchResults.map(result => ({
          title: result.title,
          link: result.link,
          snippet: result.description
        })),
        totalResults: searchResults.length
      };
    } catch (error) {
      console.error('Web検索エラー:', error);
      return {
        type: 'error',
        message: '検索中にエラーが発生しました',
        details: error.toString(),
        results: []
      };
    }
  }
}

// ESM互換性のため、両方のエクスポート形式をサポート
if (typeof module !== 'undefined' && module.exports) {
  // CommonJS環境
  module.exports = WebSearchAgent;
} else {
  // ESモジュール環境
  export default WebSearchAgent;
}