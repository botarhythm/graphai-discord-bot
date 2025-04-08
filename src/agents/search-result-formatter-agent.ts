/**
 * 検索結果フォーマッターエージェント
 * WebSearchAgentからの結果を整形して表示用に処理します
 */

import { Agent } from 'graphai';

class SearchResultFormatterAgent implements Agent {
  name = 'SearchResultFormatterAgent';
  
  async process(results: any): Promise<string> {
    if (!results || !Array.isArray(results.results) || results.results.length === 0) {
      // 検索結果が空またはエラーの場合
      const errorMessage = results && results.error 
        ? `検索中にエラーが発生しました: ${results.error}`
        : '検索結果が見つかりませんでした。別のキーワードで試してみてください。';
      
      return errorMessage;
    }

    try {
      // 検索結果の整形
      let formattedResults = '## 🔍 検索結果\n\n';
      
      // Gemini APIからの生のテキスト結果を整形
      const searchText = results.results[0].content;
      
      // 長すぎる場合は適切な長さにトリミング
      const maxLength = 1800; // Discordのメッセージ制限を考慮
      const trimmedText = searchText.length > maxLength 
        ? searchText.substring(0, maxLength) + '...(以下省略)'
        : searchText;
      
      formattedResults += trimmedText;
      
      // フッターの追加
      formattedResults += '\n\n---\n*Gemini APIによる検索結果です*';
      
      return formattedResults;
    } catch (error) {
      console.error('Result formatting error:', error);
      return '検索結果の処理中にエラーが発生しました。もう一度試してみてください。';
    }
  }
}

export default new SearchResultFormatterAgent();
