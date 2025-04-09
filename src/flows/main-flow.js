/**
 * GraphAI メインフロー定義
 * Discord Botの主要な処理フローを定義します
 */

module.exports = {
  version: '0.5',
  // 会話継続フラグが true の間、ループを続ける
  loop: {
    while: ':continueConversation'
  },
  nodes: {
    // 継続フラグ（コマンドによって変更される可能性がある）
    continueConversation: {
      value: true,
      update: ':checkCommand.continue'
    },
    
    // Discordからの入力受信
    discordInput: {
      agent: 'discordInputAgent'
    },
    
    // コマンド判定
    checkCommand: {
      agent: 'commandParserAgent',
      inputs: {
        message: ':discordInput'
      }
    },
    
    // ヘルプコマンド処理
    helpCommand: {
      agent: 'staticResponseAgent',
      inputs: {
        text: `# ボッチー ヘルプ

こんにちは！ボッチーです。GraphAI技術を活用した会話ボットです。
現在は以下の機能が利用可能です：

**基本コマンド:**
- \`!help\` - このヘルプメッセージを表示します

**近日実装予定の機能:**
- テキスト対話処理
- 画像分析・理解
- 画像生成
- ウェブ検索

GraphAI技術を活用した高度な会話体験をお届けするために開発中です。
今しばらくお待ちください。`
      },
      if: ':checkCommand.helpRequested'
    },
    
    // 入力内容分析（コマンドでない場合）
    contentAnalyzer: {
      agent: 'contentTypeDetectorAgent',
      inputs: {
        message: ':discordInput'
      },
      if: ':checkCommand.continue && !checkCommand.command'
    },
    
    // テキスト処理（通常会話）
    textProcessing: {
      agent: 'staticResponseAgent',
      inputs: {
        text: `こんにちは！ボッチーです。
GraphAI技術を活用した会話ボットを開発中です。

現在、GraphAIエンジンの統合作業を進めています。
もうしばらくお待ちください。

コマンド一覧を見るには \`!help\` と入力してください。`
      },
      if: '!checkCommand.command && !contentAnalyzer.hasImage'
    },
    
    // レスポンス選択（各処理の結果から適切なものを選択）
    responseSelector: {
      agent: 'copyAgent',
      inputs: {
        responses: [
          ':helpCommand',
          ':textProcessing'
        ]
      },
      anyInput: true
    },
    
    // Discord出力
    discordOutput: {
      agent: 'discordOutputAgent',
      inputs: {
        message: ':responseSelector',
        discordInput: ':discordInput'
      },
      if: ':checkCommand.continue'
    }
  }
};