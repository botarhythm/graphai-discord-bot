/**
 * 検索結果フォーマットエージェント
 */

const SearchResultFormatterAgent = {
  /**
   * 検索結果を整形する
   * @param {Object} searchResults - Brave APIからの検索結果
   * @returns {string} 整形された検索結果テキスト
   */
  async process(searchResults) {
    try {
      // エラーがある場合は処理しない
      if (searchResults.error) {
        return `検索中にエラーが発生しました: ${searchResults.message}`;
      }

      // 検索結果がない場合
      if (!searchResults.web || !searchResults.web.results || searchResults.web.results.length === 0) {
        return `「${searchResults.query || ''}」に関する検索結果は見つかりませんでした。`;
      }

      // 検索情報を抽出
      const { query, web } = searchResults;
      const { results, total } = web;

      // マークダウン形式でフォーマット
      let formattedText = `## 🔍 「${query}」の検索結果

`;

      // 検索結果の総数を追加
      formattedText += `${total.toLocaleString()} 件の結果が見つかりました。上位の結果を表示します：
\n`;

      // 各検索結果をフォーマット
      results.forEach((result, index) => {
        const { title, url, description } = result;
        formattedText += `### ${index + 1}. [${title}](${url})
${description}\n\n`;
      });

      // 注釈を追加
      formattedText += `\n*Brave Searchを使用した検索結果です。*`;

      return formattedText;
    } catch (error) {
      console.error('Search result formatting error:', error);
      return `検索結果の処理中にエラーが発生しました: ${error.message}`;
    }
  }
};

module.exports = SearchResultFormatterAgent;