/**
 * ウェブ検索エージェント
 * Brave Search APIを使用してウェブ検索を実行します
 */

import { brave_web_search } from '../utils/brave-search';

interface SearchResult {
  title: string;
  link: string;
  snippet?: string;
  description?: string;
}

interface WebSearchResult {
  type: string;
  query?: string;
  results: SearchResult[];
  totalResults?: number;
  error?: string;
  message?: string;
  details?: string;
}

class WebSearchAgent {
  name = 'WebSearchAgent';

  async process(query: string): Promise<WebSearchResult> {
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
      const searchResults = await brave_web_search(query, {
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
          snippet: result.description,
          description: result.description
        })),
        totalResults: searchResults.length
      };
    } catch (error) {
      console.error('Web検索エラー:', error);
      return {
        type: 'error',
        message: '検索中にエラーが発生しました',
        details: error instanceof Error ? error.toString() : String(error),
        results: []
      };
    }
  }
}

export default new WebSearchAgent();