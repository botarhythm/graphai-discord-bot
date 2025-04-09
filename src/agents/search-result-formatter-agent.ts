/**
 * 検索結果フォーマッタエージェント
 * ウェブ検索結果を見やすい形式に整形します
 */

interface SearchResult {
  title: string;
  link: string;
  snippet?: string;
  description?: string;
}

interface SearchData {
  type: string;
  query?: string;
  results?: SearchResult[];
  totalResults?: number;
  error?: string;
  message?: string;
}

class SearchResultFormatterAgent {
  name = 'SearchResultFormatterAgent';

  async process(searchData: SearchData): Promise<string> {
    console.log('SearchResultFormatterAgent processing search results');
    
    if (!searchData) {
      console.log('No search data provided');
      return '検索データが提供されていません。';
    }
    
    // エラーチェック
    if (searchData.type === 'error' || searchData.error) {
      console.log(`Search error: ${searchData.message || searchData.error}`);
      return `検索中にエラーが発生しました: ${searchData.message || searchData.error || '不明なエラー'}`;
    }
    
    const results = searchData.results || [];
    if (results.length === 0) {
      console.log('No search results found');
      return '検索結果が見つかりませんでした。別のキーワードで試してみてください。';
    }

    console.log(`Formatting ${results.length} search results`);
    
    // 結果をフォーマット
    const query = searchData.query || '';
    let formattedOutput = `## "${query}" の検索結果\n\n`;
    
    results.forEach((result, index) => {
      formattedOutput += `### ${index + 1}. ${result.title}\n`;
      formattedOutput += `${result.link}\n\n`;
      formattedOutput += `${result.snippet || result.description || '説明なし'}\n\n`;
    });
    
    formattedOutput += `\n合計 ${results.length} 件の結果`;
    
    return formattedOutput;
  }
}

export default new SearchResultFormatterAgent();