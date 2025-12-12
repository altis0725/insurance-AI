# 保険営業音声録音・AI分析システム デモアプリケーション

保険営業の商談音声を録音し、AIを用いて文字起こし・コンプライアンスチェック・要約・リマインダー作成などを行うデモシステムです。

## 動作要件

- Node.js: v20 以上推奨
- npm または pnpm

## セットアップ手順

### 1. リポジトリのクローンと依存関係のインストール

```bash
npm install
# または
pnpm install
```

### 2. 環境変数の設定

`.env` ファイルを作成し、必要な環境変数を設定してください（`.env.example` を参考にしてください）。
※ デモ動作には以下の変数が最低限必要です。

```env
DATABASE_URL=mysql://... (またはローカルDB設定)
OPENAI_API_KEY=sk-... (AI機能用)
MONICA_API_KEY=... (Monica AI用)
MONICA_API_BASE_URL=...
```

### 3. データベースのセットアップ

```bash
npm run db:push
```

## アプリケーションの起動とログイン

### 開発サーバーの起動

```bash
npm run dev
```

サーバーは標準で `http://localhost:3000` (ポートが埋まっている場合は 3001) で起動します。

### ログイン方法（開発環境）

1. ブラウザで `http://localhost:3000` にアクセスします。
2. 自動的に `/login` ページにリダイレクトされます。
3. **「Dev Login」** ボタンをクリックします。
   - 開発用ユーザーアカウント（Dev User）としてログインし、ダッシュボードへ移動します。
   - 外部認証（Manus OAuthなど）は不要です。

## 主な機能

- **ダッシュボード**: 録音データのアップロードと一覧表示
- **録音詳細**:
    - AI文字起こし結果
    - コンプライアンスチェック（NGワード検出、必須項目確認）
    - AI要約とネクストアクション提案
- **カレンダー**: リマインダーの確認と管理
- **設定**: テンプレート管理など

## ディレクトリ構成

- `client/`: React フロントエンド
- `server/`: Express + tRPC バックエンド
- `shared/`: 共通型定義・定数
- `drizzle/`: データベーススキーマ

## トラブルシューティング

- **起動しない場合**: Node.jsのバージョンを確認してください。`package.json` の依存関係を再インストール (`rm -rf node_modules && npm install`) してみてください。
- **ログインできない場合**: サーバーログを確認し、`devLogin` ミューテーションがエラーになっていないか確認してください。

## システム仕様詳細

詳細な機能要件、DBスキーマ、API設計については以下のドキュメントを参照してください。

👉 **[システム仕様書 (SYSTEM_SPECIFICATION.md)](./SYSTEM_SPECIFICATION.md)**

### 技術スタック概要

- **Frontend**: React (Vite), Tailwind CSS (v3), shadcn/ui
- **Backend**: Node.js (Express), tRPC
- **Database**: MySQL (Drizzle ORM)
- **AI Integration**: OpenAI API, Monica AI, Dify

