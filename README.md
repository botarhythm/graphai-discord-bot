# GraphAI × Discord マルチモーダルチャットボット「ボッチー」

GraphAI技術を活用したマルチモーダル対応のDiscord Botを開発するプロジェクトです。複数のAIサービスを連携させ、コスト効率と機能性のバランスを重視した設計を目指しています。

## 🚀 プロジェクトミッション

生成AIの最先端技術を活用した、柔軟で知的なマルチモーダルチャットボットの開発

## 🔧 技術スタック

- **GraphAI**: 非同期データフロー実行エンジン（コアフレームワーク）
- **Discord.js**: Discord APIとの連携
- **Gemini API**: 主要LLMエンジン
- **OpenAI API**: 補助LLMエンジン（一部機能で使用）
- **Recraft API**: 画像生成エンジン
- **Glitch**: ホスティング環境

## 📊 主要機能

1. マルチモーダル対応
   - テキスト処理
   - 画像生成
   - 画像理解
   - ウェブ検索

2. インテリジェントな機能
   - 動的コンテキスト適応
   - 自律的学習
   - リアルタイム情報統合

## 🔬 技術的アプローチ

- **GraphAIによる動的ワークフロー管理**: 
  データフロープログラミングモデルを採用し、複雑なAI処理パイプラインを柔軟に定義・実行
  
- **コンテキスト横断的な情報処理**:
  異なるモダリティ間での情報の関連付けと統合

- **継続的な性能最適化**:
  使用パターンに基づく自動的な処理フローの調整

## 💡 開発戦略

- トークン消費の最小化
- 無料APIの最大活用
- マルチモーダル対応
- リアルタイム学習メカニズム

## 🛠️ セットアップ方法

### 前提条件

- Node.js 18.x以上
- npm 9.x以上
- Discord Bot Token（[Discord Developer Portal](https://discord.com/developers/applications)で取得）
- Gemini API Key（[Google AI Studio](https://makersuite.google.com/app/apikey)で取得）
- GraphAI SDK（npm installで取得）

### インストール手順

1. リポジトリをクローン
   ```bash
   git clone https://github.com/botarhythm/graphai-discord-bot.git
   cd graphai-discord-bot
   ```

2. 依存パッケージのインストール
   ```bash
   npm install
   ```

3. 環境変数の設定
   ```bash
   cp .env.example .env
   ```
   
   `.env`ファイルを編集して、必要なAPIキーを設定します：
   ```
   DISCORD_TOKEN=your_discord_bot_token_here
   DISCORD_CLIENT_ID=your_discord_client_id_here
   GEMINI_API_KEY=your_gemini_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   RECRAFT_API_KEY=your_recraft_api_key_here
   ```

4. Botの起動
   ```bash
   npm start
   ```

## 🤖 使用方法

Botが起動したら、以下のコマンドを使用できます：

### 一般コマンド

- `!image [プロンプト]` - 指定したプロンプトで画像を生成します
- `!search [検索語句]` - ウェブ検索を行います（近日実装予定）

### システムコマンド

- `/help` - ヘルプメッセージを表示します
- `/clear` - 会話履歴をクリアします
- `/reset` - ボットの状態をリセットします

### マルチモーダル機能

- 画像付きメッセージを送ると、その画像について分析や質問に答えることができます

## GraphAIデータフロー

このプロジェクトはGraphAIのデータフロープログラミングモデルを使用しています。以下は基本的な処理フローの概略です：

```yaml
version: 0.5
loop:
  while: :continueConversation
nodes:
  # 継続フラグ
  continueConversation:
    value: true
    update: :checkCommand.continue
  
  # Discordからの入力受信
  discordInput:
    agent: discordInputAgent
  
  # コマンド判定
  checkCommand:
    agent: commandParserAgent
    inputs:
      message: :discordInput
  
  # 入力内容分析
  contentAnalyzer:
    agent: contentTypeDetectorAgent
    inputs:
      message: :discordInput
    if: :checkCommand.continue
  
  # テキスト処理フロー
  textProcessing:
    agent: nestedAgent
    inputs:
      query: :discordInput.content
    if: :contentAnalyzer.type == "text_only"
  
  # 画像処理フロー
  imageProcessing:
    agent: nestedAgent
    inputs:
      message: :discordInput
    if: :contentAnalyzer.hasImage
  
  # 画像生成フロー
  imageGeneration:
    agent: nestedAgent
    inputs:
      prompt: :discordInput.content
    if: :checkCommand.command == "image"
  
  # レスポンス選択
  responseSelector:
    agent: copyAgent
    inputs:
      responses: [
        ":textProcessing.response", 
        ":imageProcessing.response", 
        ":imageGeneration.response"
      ]
    anyInput: true
  
  # Discord出力
  discordOutput:
    agent: discordOutputAgent
    inputs:
      message: :responseSelector
    if: :checkCommand.continue
```

## Glitchへのデプロイ方法

Glitchでこのプロジェクトを実行する場合：

1. Glitchで新しいプロジェクトを作成
2. Import from GitHub を選択し、このリポジトリURLを入力
3. `.env` ファイルをセットアップ
4. `watch.json` ファイルを作成して自動再起動を設定（オプション）

## ライセンス

MIT

## 作者

- 開発者: ノブ
- ボット名: ボッチー

---

Powered by GraphAI & Gemini 2.0 Flash