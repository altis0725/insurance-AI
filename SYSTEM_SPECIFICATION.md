# 保険営業音声録音・AI分析システム - システム仕様書

**バージョン**: 1.0.0  
**最終更新日**: 2025年12月13日  
**作成者**: Manus AI

---

## 1. システム概要

本システムは、保険営業担当者が顧客との面談を録音し、AIによる自動文字起こし・情報抽出を行い、意向確認書を生成するためのWebアプリケーションです。Limitless Pendantのような音声記録・AI分析サービスを参考に、スマートフォン対応のモバイルファーストUIを採用しています。

### 1.1 主要機能

| 機能カテゴリ | 機能名 | 説明 |
|-------------|--------|------|
| 録音管理 | ライフログ | 営業録音の一覧表示・検索・フィルタリング（日付・カテゴリ・ステータス詳細検索対応） |
| 録音管理 | 録音詳細 | 文字起こし表示、音声再生（モック）、話者認識UI |
| AI分析 | コンプライアンス | 必須説明事項の確認、NGワード（禁止用語）の自動検出 |
| AI分析 | 情報抽出 | 保険目的、家族構成、収支、既契約、希望条件の自動抽出 |
| AI分析 | 信頼度スコア | 各抽出項目の確からしさを0-100%で表示 |
| AI分析 | Ask AI | 録音内容に関する自然言語での質問応答 |
| AI分析 | スマートサマリー | 1日の録音を自動要約 |
| 編集機能 | 手動編集 | 文字起こし・抽出結果の修正、変更履歴の記録 |
| 出力機能 | 意向確認書PDF | テンプレートベースのPDF生成 |
| 管理機能 | テンプレート管理 | 意向確認書テンプレートのCRUD、インポート/エクスポート |
| 管理機能 | カレンダー | 期限付きリマインダーのカレンダー表示・管理 |


### 1.2 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| バックエンド | Node.js, Express 4, tRPC 11 |
| データベース | MySQL (TiDB互換) |
| ORM | Drizzle ORM |
| 認証 | Manus OAuth / Local Dev Auth |
| AI/LLM | Manus Built-in LLM API |
| ルーティング | wouter |
| 状態管理 | TanStack Query (React Query) |

---

## 2. データベース設計

### 2.1 ER図（概念）

```
users (1) ──────< (N) recordings
                      │
                      ├──< (N) extraction_results
                      │
                      ├──< (N) change_history
                      │
                      ├──< (N) reminders
                      │
                      └──< (N) intent_documents >── (1) intent_templates
```

### 2.2 テーブル定義

#### users（ユーザー）
| カラム | 型 | 説明 |
|--------|-----|------|
| id | INT (PK) | ユーザーID |
| openId | VARCHAR(64) | Manus OAuth識別子 |
| name | TEXT | ユーザー名 |
| email | VARCHAR(320) | メールアドレス |
| role | ENUM('user', 'admin') | ロール |
| createdAt | TIMESTAMP | 作成日時 |
| updatedAt | TIMESTAMP | 更新日時 |
| lastSignedIn | TIMESTAMP | 最終ログイン日時 |

#### recordings（録音）
| カラム | 型 | 説明 |
|--------|-----|------|
| id | INT (PK) | 録音ID |
| recordedAt | TIMESTAMP | 録音日時 |
| staffName | VARCHAR(100) | 営業担当者名 |
| customerName | VARCHAR(100) | 顧客名 |
| meetingType | ENUM('initial', 'followup', 'proposal') | 面談種別 |
| status | ENUM('pending', 'processing', 'completed', 'error') | 処理ステータス |
| productCategory | ENUM('life', 'medical', 'savings', 'investment') | 商品カテゴリ |
| durationSeconds | INT | 録音時間（秒） |
| audioUrl | VARCHAR(500) | 音声ファイルURL |
| transcription | TEXT | 文字起こしテキスト |
| createdAt | TIMESTAMP | 作成日時 |
| updatedAt | TIMESTAMP | 更新日時 |

#### extraction_results（AI抽出結果）
| カラム | 型 | 説明 |
|--------|-----|------|
| id | INT (PK) | 抽出結果ID |
| recordingId | INT (FK) | 録音ID |
| extractionData | JSON | 抽出データ（下記参照） |
| overallConfidence | INT | 全体信頼度（0-100） |
| createdAt | TIMESTAMP | 作成日時 |
| updatedAt | TIMESTAMP | 更新日時 |

**extractionData JSON構造:**
```json
{
  "insurancePurpose": { "value": "老後の生活資金確保", "confidence": 85 },
  "familyStructure": { "value": "配偶者と子供2人", "confidence": 90 },
  "incomeExpenses": { "value": "年収600万円、月々の支出30万円", "confidence": 75 },
  "existingContracts": { "value": "なし", "confidence": 95 },
  "desiredConditions": { "value": "月額1万円以内", "confidence": 80 }
}
```

#### change_history（変更履歴）
| カラム | 型 | 説明 |
|--------|-----|------|
| id | INT (PK) | 履歴ID |
| recordingId | INT (FK) | 録音ID |
| editorId | INT (FK) | 編集者ID |
| editorName | VARCHAR(100) | 編集者名 |
| changeType | ENUM('transcription', 'extraction') | 変更種別 |
| oldValue | TEXT | 変更前の値 |
| newValue | TEXT | 変更後の値 |
| memo | TEXT | 変更理由・メモ |
| changedAt | TIMESTAMP | 変更日時 |

#### reminders（リマインダー）
| カラム | 型 | 説明 |
|--------|-----|------|
| id | INT (PK) | リマインダーID |
| recordingId | INT (FK) | 関連録音ID（任意） |
| userId | INT (FK) | ユーザーID |
| title | VARCHAR(200) | タイトル |
| description | TEXT | 詳細 |
| dueDate | TIMESTAMP | 期限日時 |
| priority | ENUM('low', 'medium', 'high') | 優先度 |
| status | ENUM('pending', 'completed', 'cancelled') | ステータス |
| createdAt | TIMESTAMP | 作成日時 |
| updatedAt | TIMESTAMP | 更新日時 |

#### intent_templates（意向確認テンプレート）
| カラム | 型 | 説明 |
|--------|-----|------|
| id | INT (PK) | テンプレートID |
| name | VARCHAR(200) | テンプレート名 |
| description | TEXT | 説明 |
| content | TEXT | テンプレート本文（Markdown + プレースホルダー） |
| isDefault | INT | デフォルトフラグ（0/1） |
| createdBy | INT (FK) | 作成者ID |
| createdAt | TIMESTAMP | 作成日時 |
| updatedAt | TIMESTAMP | 更新日時 |

#### intent_documents（意向確認書）
| カラム | 型 | 説明 |
|--------|-----|------|
| id | INT (PK) | 文書ID |
| recordingId | INT (FK) | 録音ID |
| templateId | INT (FK) | テンプレートID |
| pdfUrl | VARCHAR(500) | PDF URL |
| dataSnapshot | JSON | 生成時データスナップショット |
| generatedBy | INT (FK) | 生成者ID |
| generatedByName | VARCHAR(100) | 生成者名 |
| generatedAt | TIMESTAMP | 生成日時 |

#### compliance_results（コンプライアンスチェック結果）
| カラム | 型 | 説明 |
|--------|-----|------|
| id | INT (PK) | ID |
| recordingId | INT (FK) | 録音ID |
| isCompliant | TINYINT | 適合フラグ (0/1) |
| complianceData | JSON | チェック詳細（必須項目、NGワード検出結果） |
| createdAt | TIMESTAMP | 作成日時 |
| updatedAt | TIMESTAMP | 更新日時 |

---

## 3. API設計

### 3.1 tRPCルーター構成

```
appRouter
├── auth
│   ├── me (query) - 現在のユーザー情報取得
│   ├── logout (mutation) - ログアウト
│   └── devLogin (mutation) - 開発用ローカルログイン
│
├── system
│   └── health (query) - ヘルスチェック
│
├── recordings
│   ├── list (query) - 録音一覧取得（フィルター・ページネーション対応）
│   ├── getById (query) - 録音詳細取得
│   ├── updateTranscription (mutation) - 文字起こし更新
│   ├── upload (mutation) - 音声アップロード
│   └── process (mutation) - AI処理実行（文字起こし・抽出・コンプラチェック）
│
├── extractions
│   ├── getByRecordingId (query) - 抽出結果取得
│   └── update (mutation) - 抽出結果更新
│
├── compliance
│   └── getByRecordingId (query) - コンプライアンス結果取得
│
├── history
│   └── getByRecordingId (query) - 変更履歴取得
│
├── ask
│   └── query (mutation) - AIへの質問
│
├── summary
│   └── daily (query) - 1日の要約生成
│
├── reminders
│   ├── list (query) - リマインダー一覧取得
│   ├── getById (query) - 詳細取得
│   ├── create (mutation) - 作成
│   ├── update (mutation) - 更新
│   ├── delete (mutation) - 削除
│   └── generateFromRecording (mutation) - 録音からAI生成
│
├── templates
│   ├── list (query) - テンプレート一覧取得
│   ├── getById (query) - 詳細取得
│   ├── create (mutation) - 作成
│   ├── update (mutation) - 更新
│   ├── delete (mutation) - 削除
│   ├── setDefault (mutation) - デフォルト設定
│   ├── import (mutation) - インポート
│   └── seedDefault (mutation) - デフォルトシード
│
├── intentDocuments
│   ├── list (query) - 録音別履歴取得
│   ├── preview (query) - プレビュー生成
│   └── save (mutation) - 保存
│
└── seed
    └── run (mutation) - モックデータ投入
```

### 3.2 主要APIの入出力

#### recordings.list
```typescript
// Input
{
  status?: "pending" | "processing" | "completed" | "error";
  meetingType?: "initial" | "followup" | "proposal";
  search?: string;
  page?: number;
  limit?: number;
}

// Output
{
  recordings: Recording[];
  total: number;
  page: number;
  totalPages: number;
}
```

#### ai.ask
```typescript
// Input
{
  question: string;
  recordingIds?: number[];
}

// Output
{
  answer: string;
  sources: { recordingId: number; customerName: string; excerpt: string }[];
}
```

---

## 4. フロントエンド構成

### 4.1 ページ構成

| パス | コンポーネント | 説明 |
|------|---------------|------|
| / | Home.tsx | ダッシュボード（統計、サマリー、最近の録音） |
| /recordings | RecordingList.tsx | ライフログ一覧 |
| /recordings/:id | RecordingDetail.tsx | 録音詳細・編集 |
| /recordings/:id/intent | IntentDocument.tsx | 意向確認書プレビュー・PDF出力 |
| /ask | Ask.tsx | AIチャット |
| /reminders | Reminders.tsx | リマインダー管理 |
| /settings | Settings.tsx | 設定 |
| /settings/templates | Templates.tsx | テンプレート管理 |

### 4.2 共通コンポーネント

| コンポーネント | 説明 |
|---------------|------|
| BottomNav.tsx | ボトムナビゲーション（5タブ） |
| DashboardLayout.tsx | ダッシュボードレイアウト |
| ui/* | shadcn/uiコンポーネント群 |

### 4.3 デザインシステム

- **カラーパレット**: ラベンダー/紫系（Limitless Pendant風）
- **プライマリカラー**: `oklch(0.65 0.15 280)` (紫)
- **フォント**: Noto Sans JP, system-ui
- **レイアウト**: モバイルファースト、ボトムナビゲーション
- **インタラクション**: タッチフレンドリー（44px以上のタップターゲット）

---

## 5. テンプレートシステム

### 5.1 プレースホルダー一覧

| プレースホルダー | 説明 | データソース |
|-----------------|------|-------------|
| `{{confirmationDate}}` | 確認日時 | 生成時の日時 |
| `{{staffName}}` | 担当者名 | recording.staffName |
| `{{customerName}}` | 顧客名 | recording.customerName |
| `{{meetingType}}` | 面談種別 | recording.meetingType（日本語変換） |
| `{{insurancePurpose}}` | 保険目的 | extraction.insurancePurpose.value |
| `{{familyStructure}}` | 家族構成 | extraction.familyStructure.value |
| `{{incomeExpenses}}` | 収支状況 | extraction.incomeExpenses.value |
| `{{existingContracts}}` | 既存契約 | extraction.existingContracts.value |
| `{{desiredConditions}}` | 希望条件 | extraction.desiredConditions.value |

### 5.2 テンプレート形式

テンプレートはMarkdown形式で記述し、PDF生成時にHTMLに変換されます。

```markdown
# 意向確認書

**顧客名**: {{customerName}}様
**担当者**: {{staffName}}

## 保険目的
{{insurancePurpose}}
```

---

## 6. 現在の制限事項（モック実装）

| 機能 | 現状 | 本番実装時の対応 |
|------|------|-----------------|
| 音声録音 | モックデータのみ | Whisper API連携、S3アップロード |
| 音声再生 | 進捗バーのモック | 実際の音声ファイル再生 |
| 文字起こし | 固定テキスト | Whisper APIによるリアルタイム文字起こし |
| AI抽出 | 固定データ | LLMによる実際の情報抽出 |
| PDF出力 | ブラウザ印刷経由 | サーバーサイドPDF生成（puppeteer等） |
| 話者認識 | モックデータ | 話者分離AI（diarization）の導入 |

---

## 7. 今後の課題・改善案

### 7.1 優先度：高

| 課題 | 詳細 | 推定工数 |
|------|------|---------|
| 音声録音機能 | スマホマイクからの直接録音、S3アップロード | 3-5日 |
| Whisper API連携 | 実際の音声ファイルの文字起こし | 2-3日 |
| LLM情報抽出 | 文字起こしからの自動情報抽出ロジック | 3-5日 |
| サーバーサイドPDF | puppeteerまたはPDFKit使用 | 2-3日 |

### 7.2 優先度：中

| 課題 | 詳細 | 推定工数 |
|------|------|---------|
| 話者分離（Diarization） | 誰が話しているかの自動認識 | 5-7日 |
| プッシュ通知 | リマインダーの期限通知 | 2-3日 |
| 一括PDF出力 | 複数録音の一括処理 | 1-2日 |
| 電子署名機能 | 意向確認書への署名 | 3-5日 |
| オフライン対応 | PWA化、オフライン録音 | 5-7日 |

### 7.3 優先度：低

| 課題 | 詳細 | 推定工数 |
|------|------|---------|
| 関連ライフログ検索 | 類似会話の自動提案 | 3-5日 |
| 会社ロゴ挿入 | テンプレートへのロゴ画像追加 | 1日 |
| ダークモード | テーマ切り替え対応 | 1-2日 |
| 多言語対応 | i18n対応 | 3-5日 |
| 分析ダッシュボード | 営業成績・傾向分析 | 5-7日 |

### 7.4 技術的負債

| 項目 | 詳細 | 対応方針 |
|------|------|---------|
| テストカバレッジ | 現在29テスト、E2Eテストなし | Playwright導入 |
| エラーハンドリング | 一部で汎用エラー表示 | エラー種別ごとのUI改善 |
| パフォーマンス | 大量データ時の最適化未実施 | 仮想スクロール、ページネーション改善 |
| セキュリティ | 入力バリデーション強化 | Zod schemaの厳格化 |

---

## 8. 開発環境セットアップ

### 8.1 必要環境

- Node.js 22.x
- pnpm 10.x
- MySQL 8.x または TiDB

### 8.2 セットアップ手順

```bash
# 依存関係インストール
pnpm install

# 環境変数設定
cp .env.example .env
# DATABASE_URL等を設定

# データベースマイグレーション
pnpm db:push

# 開発サーバー起動
pnpm dev
```

### 8.3 ログイン方法（開発環境）

標準の開発サーバー (`localhost:3000` or `3001`) にアクセスすると、自動的に `/login` にリダイレクトされます。
「Dev Login」ボタンをクリックすることで、開発用ユーザーとしてローカルログインが可能です（外部OAuthはバイパスされます）。

### 8.4 テスト実行

```bash
# ユニットテスト
pnpm test

# 型チェック
pnpm check
```

---

## 9. ファイル構成

```
insurance_demo_app/
├── client/
│   ├── src/
│   │   ├── components/     # UIコンポーネント
│   │   │   ├── ui/         # shadcn/ui
│   │   │   └── BottomNav.tsx
│   │   ├── pages/          # ページコンポーネント
│   │   │   ├── Home.tsx
│   │   │   ├── RecordingList.tsx
│   │   │   ├── RecordingDetail.tsx
│   │   │   ├── IntentDocument.tsx
│   │   │   ├── Ask.tsx
│   │   │   ├── Reminders.tsx
│   │   │   ├── Settings.tsx
│   │   │   └── Templates.tsx
│   │   ├── lib/
│   │   │   └── trpc.ts     # tRPCクライアント
│   │   ├── App.tsx         # ルーティング
│   │   ├── main.tsx        # エントリーポイント
│   │   └── index.css       # グローバルスタイル
│   └── index.html
├── server/
│   ├── _core/              # フレームワーク基盤
│   ├── db.ts               # データベースヘルパー
│   ├── routers.ts          # tRPCルーター
│   ├── pdfGenerator.ts     # PDF生成ユーティリティ
│   └── *.test.ts           # テストファイル
├── drizzle/
│   └── schema.ts           # データベーススキーマ
├── shared/
│   └── const.ts            # 共有定数
├── package.json
├── todo.md                 # 開発TODO
└── SYSTEM_SPECIFICATION.md # 本ドキュメント
```

---

## 10. 参考資料

- [Limitless Pendant](https://www.limitless.ai/) - UI/UXの参考
- [tRPC Documentation](https://trpc.io/docs)
- [Drizzle ORM](https://orm.drizzle.team/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

**本ドキュメントは開発引き継ぎ用に作成されました。不明点があれば、コードベースおよびtodo.mdを参照してください。**
