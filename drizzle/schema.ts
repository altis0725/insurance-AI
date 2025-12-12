import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 録音データテーブル
 * 営業担当者と顧客の会話録音情報を管理
 */
export const recordings = mysqlTable("recordings", {
  id: int("id").autoincrement().primaryKey(),
  /** ユーザーID（所有者） */
  userId: int("userId").notNull(),
  /** 録音日時（UTC） */
  recordedAt: timestamp("recordedAt").notNull(),
  /** 営業担当者名 */
  staffName: varchar("staffName", { length: 100 }).notNull(),
  /** 顧客名 */
  customerName: varchar("customerName", { length: 100 }).notNull(),
  /** ミーティングタイプ: initial=初回, followup=フォローアップ, proposal=提案 */
  meetingType: mysqlEnum("meetingType", ["initial", "followup", "proposal"]).notNull(),
  /** 処理ステータス: pending=未処理, processing=処理中, completed=完了, error=エラー */
  status: mysqlEnum("status", ["pending", "processing", "completed", "error"]).default("pending").notNull(),
  /** 商品カテゴリ: life=生命保険, medical=医療保険, savings=貯蓄型, investment=投資型 */
  productCategory: mysqlEnum("productCategory", ["life", "medical", "savings", "investment"]),
  /** 録音時間（秒） */
  durationSeconds: int("durationSeconds").notNull(),
  /** 音声ファイルURL（モック用） */
  audioUrl: varchar("audioUrl", { length: 500 }),
  /** 文字起こしテキスト */
  transcription: text("transcription"),
  /** 作成日時 */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** 更新日時 */
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Recording = typeof recordings.$inferSelect;
export type InsertRecording = typeof recordings.$inferInsert;

/**
 * AI抽出結果の型定義
 */
export interface ExtractionData {
  /** 保険目的 */
  insurancePurpose?: {
    value: string;
    confidence: number;
  };
  /** 家族構成 */
  familyStructure?: {
    value: string;
    confidence: number;
  };
  /** 収支情報 */
  incomeExpenses?: {
    value: string;
    confidence: number;
  };
  /** 既契約情報 */
  existingContracts?: {
    value: string;
    confidence: number;
  };
  /** 希望条件 */
  desiredConditions?: {
    value: string;
    confidence: number;
  };
}

/**
 * AI抽出結果テーブル
 * 録音から自動抽出された情報を保存
 */
export const extractionResults = mysqlTable("extraction_results", {
  id: int("id").autoincrement().primaryKey(),
  /** 関連する録音ID */
  recordingId: int("recordingId").notNull(),
  /** 抽出データ（JSON形式） */
  extractionData: json("extractionData").$type<ExtractionData>().notNull(),
  /** 全体の信頼度スコア（0-100） */
  overallConfidence: int("overallConfidence").notNull(),
  /** 作成日時 */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** 更新日時 */
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExtractionResult = typeof extractionResults.$inferSelect;
export type InsertExtractionResult = typeof extractionResults.$inferInsert;

/**
 * 変更履歴テーブル
 * 文字起こしやAI抽出結果の編集履歴を記録
 */
export const changeHistory = mysqlTable("change_history", {
  id: int("id").autoincrement().primaryKey(),
  /** 関連する録音ID */
  recordingId: int("recordingId").notNull(),
  /** 編集者のユーザーID */
  editorId: int("editorId").notNull(),
  /** 編集者名 */
  editorName: varchar("editorName", { length: 100 }).notNull(),
  /** 変更タイプ: transcription=文字起こし, extraction=AI抽出結果 */
  changeType: mysqlEnum("changeType", ["transcription", "extraction"]).notNull(),
  /** 変更前の値 */
  oldValue: text("oldValue"),
  /** 変更後の値 */
  newValue: text("newValue"),
  /** 変更理由・メモ */
  memo: text("memo"),
  /** 変更日時 */
  changedAt: timestamp("changedAt").defaultNow().notNull(),
});

export type ChangeHistory = typeof changeHistory.$inferSelect;
export type InsertChangeHistory = typeof changeHistory.$inferInsert;

/**
 * リマインダーテーブル
 * 会話から抽出された重要事項やタスクを管理
 */
export const reminders = mysqlTable("reminders", {
  id: int("id").autoincrement().primaryKey(),
  /** 関連する録音ID（任意） */
  recordingId: int("recordingId"),
  /** ユーザーID */
  userId: int("userId").notNull(),
  /** リマインダータイトル */
  title: varchar("title", { length: 200 }).notNull(),
  /** 詳細内容 */
  description: text("description"),
  /** 期限日時 */
  dueDate: timestamp("dueDate"),
  /** 優先度: low=低, medium=中, high=高 */
  priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium").notNull(),
  /** ステータス: pending=未完了, completed=完了, cancelled=キャンセル */
  status: mysqlEnum("reminderStatus", ["pending", "completed", "cancelled"]).default("pending").notNull(),
  /** 作成日時 */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** 更新日時 */
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = typeof reminders.$inferInsert;


/**
 * 意向確認テンプレートテーブル
 * PDF出力用のテンプレートを管理
 */
export const intentTemplates = mysqlTable("intent_templates", {
  id: int("id").autoincrement().primaryKey(),
  /** テンプレート名 */
  name: varchar("name", { length: 200 }).notNull(),
  /** テンプレート説明 */
  description: text("description"),
  /** テンプレート本文（プレースホルダー付きHTML/Markdown） */
  content: text("content").notNull(),
  /** デフォルトテンプレートかどうか */
  isDefault: int("isDefault").default(0).notNull(),
  /** 作成者ID */
  createdBy: int("createdBy"),
  /** 作成日時 */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** 更新日時 */
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IntentTemplate = typeof intentTemplates.$inferSelect;
export type InsertIntentTemplate = typeof intentTemplates.$inferInsert;

/**
 * 意向確認書テーブル
 * 生成された意向確認書の履歴を管理
 */
export const intentDocuments = mysqlTable("intent_documents", {
  id: int("id").autoincrement().primaryKey(),
  /** 関連する録音ID */
  recordingId: int("recordingId").notNull(),
  /** 使用したテンプレートID */
  templateId: int("templateId").notNull(),
  /** 生成されたPDFのURL */
  pdfUrl: varchar("pdfUrl", { length: 500 }),
  /** 生成時のデータスナップショット（JSON） */
  dataSnapshot: json("dataSnapshot").$type<Record<string, unknown>>(),
  /** 生成者ID */
  generatedBy: int("generatedBy").notNull(),
  /** 生成者名 */
  generatedByName: varchar("generatedByName", { length: 100 }).notNull(),
  /** 生成日時 */
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
});


/**
 * コンプライアンスチェック用データ型
 */
export interface ComplianceData {
  mandatoryItems: {
    item: string;   // 必須説明項目（例: クーリングオフの説明）
    detected: boolean;
    reason?: string; // 検出理由・該当箇所
  }[];
  ngWords: {
    word: string;   // NGワード（例: 「絶対儲かる」）
    detected: boolean;
    context?: string; // 前後の文脈
  }[];
}

/**
 * コンプライアンスチェック結果テーブル
 * 録音データに対するコンプライアンスチェックの結果を保存
 */
export const complianceResults = mysqlTable("compliance_results", {
  id: int("id").autoincrement().primaryKey(),
  /** 関連する録音ID */
  recordingId: int("recordingId").notNull(),
  /** チェック結果データ（JSON形式） */
  complianceData: json("complianceData").$type<ComplianceData>().notNull(),
  /** 適合しているか（NGなし、必須項目あり） 1=適合, 0=不適合 */
  isCompliant: int("isCompliant").notNull(),
  /** 作成日時 */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** 更新日時 */
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ComplianceResult = typeof complianceResults.$inferSelect;
export type InsertComplianceResult = typeof complianceResults.$inferInsert;
