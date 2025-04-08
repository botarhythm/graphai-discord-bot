# GraphAI × Discord マルチモーダルチャットボット

## プロジェクト概要

GraphAI技術を活用した、高度なマルチモーダル対応 Discordボット「ボッチー」のプロジェクトリポジトリです。

## 主要機能

- Web検索
- マルチモーダル対話
- GraphAIによる柔軟なワークフロー管理

## 技術スタック

- Node.js v18+
- TypeScript
- Discord.js v14
- GraphAI
- Brave Search API

## セットアップ手順

1. リポジトリをクローン
```bash
git clone https://github.com/botarhythm/graphai-discord-bot.git
cd graphai-discord-bot
```

2. 依存関俄をインストール
```bash
npm install
```

3. 環境変数を設定
`.env`ファイルを作成し、以下の情報を追加：
```
DISCORD_TOKEN=your_discord_bot_token
BRAVE_API_KEY=your_brave_search_api_key
```

4. ビルドと起動
```bash
npm run build
npm start
```

## 開発モード

```bash
npm run dev
```

## テスト

```bash
npm run lint
```

## ライセンス

[ライセンス情報を追加]

## コントリビューション

[コントリビューションガイドラインを追加]