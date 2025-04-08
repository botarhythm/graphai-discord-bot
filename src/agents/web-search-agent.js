import { brave_web_search } from '../utils/brave-search.js';

class WebSearchAgent {
  static async run({ query }, context) {
    const { 
      count = 5, 
      safeSearch = true 
    } = context.params || {};

    try {
      const searchResults = await brave_web_search(query, {
        count, 
        safe: safeSearch
      });

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
        details: error.toString()
      };
    }
  }
}

export default WebSearchAgent;