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
以下の機能が利用可能です：

**基本コマンド:**
- \`!help\` - このヘルプメッセージを表示します
- \`/clear\` - 会話履歴をクリアします

**機能:**
- テキスト対話処理 - Gemini 2.0 Flash AIによる自然な会話
- 画像分析 - 画像に関する質問に答えることができます（近日実装）

GraphAI技術を活用した高度な会話をお楽しみください！`
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
    
    // テキスト処理（通常会話）- Gemini AIを使用
    textProcessing: {
      agent: 'geminiAgent',
      inputs: {
        query: ':discordInput.content',
        userId: ':discordInput.authorId',
        username: ':discordInput.username'
      },
      if: '!checkCommand.command && !contentAnalyzer.hasImage'
    },
    
    // 画像付きメッセージ処理 - Gemini AIを使用
    imageProcessing: {
      agent: 'geminiAgent',
      inputs: {
        query: ':discordInput.content || "この画像について説明してください"',
        userId: ':discordInput.authorId',
        username: ':discordInput.username',
        imageUrl: ':discordInput.attachments[0]'
      },
      if: 'contentAnalyzer.hasImage'
    },
    
    // 履歴クリアコマンド
    clearHistory: {
      agent: 'staticResponseAgent',
      inputs: {
        text: '会話履歴をクリアしました。新しい会話を始めましょう！'
      },
      if: ':checkCommand.clearRequested'
    },
    
    // レスポンス選択（各処理の結果から適切なものを選択）
    responseSelector: {
      agent: 'copyAgent',
      inputs: {
        responses: [
          ':helpCommand',
          ':textProcessing.response',
          ':imageProcessing.response',
          ':clearHistory'
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