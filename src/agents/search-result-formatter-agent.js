class SearchResultFormatterAgent {
  static async run({ results }, context) {
    if (!results || results.length === 0) {
      return {
        formattedResults: '検索結果が見つかりませんでした。'
      };
    }

    const formattedResults = results.map((result, index) => 
      `${index + 1}. ${result.title}\n${result.link}\n${result.snippet}\n`
    ).join('\n');

    return {
      formattedResults: formattedResults
    };
  }
}

export default SearchResultFormatterAgent;