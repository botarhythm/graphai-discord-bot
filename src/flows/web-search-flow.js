// Web search flow configuration
export default {
  version: "0.5",
  nodes: {
    // 入力ノード - メッセージテキストを受け取ります
    input: {
      type: "input",
      next: "commandParser"
    },

    // コマンドパーサーノード - ユーザー入力を解析します
    commandParser: {
      type: "agent",
      agent: "commandParserAgent",
      next: [
        {
          condition: "result.command === 'webSearch'",
          target: "webSearch"
        },
        {
          condition: "result.command === 'help'",
          target: "helpCommand"
        },
        {
          condition: "result.command === 'chat'",
          target: "chatDefault"
        },
        {
          condition: "true", // その他のコマンドはデフォルト動作
          target: "chatDefault"
        }
      ]
    },

    // ウェブ検索ノード - 検索クエリを処理します
    webSearch: {
      type: "agent",
      agent: "webSearchAgent",
      input: "node.commandParser.result.args",
      next: "formatSearchResults"
    },

    // 検索結果フォーマッターノード - 検索結果を整形します
    formatSearchResults: {
      type: "agent",
      agent: "searchResultFormatterAgent",
      input: "node.webSearch.result",
      next: "output"
    },

    // ヘルプコマンドノード - ヘルプテキストを生成します
    helpCommand: {
      type: "value",
      value: `
## 🤖 ボッチーボット ヘルプ

以下のコマンドが利用できます:

- **!search [検索キーワード]** - ウェブ検索を実行します
- **!image [画像の説明]** - AIで画像を生成します
- **/help** - このヘルプを表示します
- **/clear** - 会話履歴をクリアします

また、コマンドなしのメッセージにはAIが自動的に応答します。
      `,
      next: "output"
    },

    // デフォルトチャットノード - 通常の会話応答を生成します
    chatDefault: {
      type: "value",
      value: "この機能はまだ実装中です。!search コマンドを使ってウェブ検索を試してみてください。",
      next: "output"
    },

    // 出力ノード - 最終的な応答を返します
    output: {
      type: "output"
    }
  }
};
