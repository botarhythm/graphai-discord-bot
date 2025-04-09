/**
 * ウェブ検索エージェント
 * Brave Search APIを使用してウェブ検索を実行します
 */

// CommonJS環境
const braveSearch = require('../utils/brave-search');

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
      
      // Brave Search APIを呼び出し
      const searchResults = await braveSearch.brave_web_search(query, {
        count: 5, 
        safe: true
      });

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

module.exports = WebSearchAgent;
