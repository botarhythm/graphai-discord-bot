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

以下のコマンドが利用可能です：

**一般コマンド:**
- \`!image [プロンプト]\` - 指定したプロンプトで画像を生成します
- \`!search [検索語句]\` - ウェブ検索を行います (近日実装予定)

**システムコマンド:**
- \`/help\` - このヘルプメッセージを表示します
- \`/clear\` - 会話履歴をクリアします
- \`/reset\` - ボットの状態をリセットします

画像付きメッセージを送ると、その画像について分析や質問に答えることができます。`
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
    
    // 画像生成処理
    imageGeneration: {
      agent: 'imageGenerationAgent',
      inputs: {
        prompt: ':checkCommand.args.join(" ")'
      },
      if: ':checkCommand.command == "image"'
    },
    
    // テキスト処理（通常会話）
    textProcessing: {
      agent: 'geminiAgent',
      inputs: {
        query: ':discordInput.content',
        userId: ':discordInput.authorId',
        username: ':discordInput.username'
      },
      if: '!checkCommand.command && !contentAnalyzer.hasImage'
    },
    
    // 画像付きメッセージ処理
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
    
    // レスポンス選択（各処理の結果から適切なものを選択）
    responseSelector: {
      agent: 'copyAgent',
      inputs: {
        responses: [
          ':helpCommand',
          ':textProcessing',
          ':imageProcessing',
          ':imageGeneration'
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