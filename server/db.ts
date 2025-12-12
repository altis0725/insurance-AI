import { eq, desc, like, and, sql, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, recordings, extractionResults, changeHistory, reminders, intentTemplates, intentDocuments, complianceResults, InsertRecording, InsertExtractionResult, InsertChangeHistory, InsertReminder, InsertIntentTemplate, InsertComplianceResult, ExtractionData, ComplianceData } from "../drizzle/schema";

// ... existing code ...

// ========== Compliance Result Functions ==========

export async function getComplianceResultByRecordingId(recordingId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select()
    .from(complianceResults)
    .where(eq(complianceResults.recordingId, recordingId))
    .limit(1);
  return result[0] ?? null;
}

export async function createComplianceResult(data: InsertComplianceResult) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(complianceResults).values(data);
  return result[0].insertId;
}

export async function updateComplianceResult(id: number, data: Partial<InsertComplianceResult>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(complianceResults).set(data).where(eq(complianceResults.id, id));
}

import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ========== User Functions ==========

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ========== Recording Functions ==========

export interface RecordingFilters {
  staffName?: string;
  customerName?: string;
  meetingType?: "initial" | "followup" | "proposal";
  status?: "pending" | "processing" | "completed" | "error";
  productCategory?: "life" | "medical" | "savings" | "investment";
  dateFrom?: Date;
  dateTo?: Date;
}

export interface RecordingListParams {
  filters?: RecordingFilters;
  sortBy?: "recordedAt" | "staffName" | "customerName" | "status";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function getRecordings(params: RecordingListParams = {}, userId?: number) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  if (!userId) {
    throw new Error("userId is required to list recordings");
  }

  const { filters = {}, sortBy = "recordedAt", sortOrder = "desc", page = 1, pageSize = 50 } = params;

  const conditions = [];
  conditions.push(eq(recordings.userId, userId));

  if (filters.staffName) {
    conditions.push(like(recordings.staffName, `%${filters.staffName}%`));
  }
  if (filters.customerName) {
    conditions.push(like(recordings.customerName, `%${filters.customerName}%`));
  }
  if (filters.meetingType) {
    conditions.push(eq(recordings.meetingType, filters.meetingType));
  }
  if (filters.status) {
    conditions.push(eq(recordings.status, filters.status));
  }
  if (filters.productCategory) {
    conditions.push(eq(recordings.productCategory, filters.productCategory));
  }
  if (filters.dateFrom) {
    conditions.push(gte(recordings.recordedAt, filters.dateFrom));
  }
  if (filters.dateTo) {
    conditions.push(lte(recordings.recordedAt, filters.dateTo));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db.select()
      .from(recordings)
      .where(whereClause)
      .orderBy(sortOrder === "desc" ? desc(recordings[sortBy]) : recordings[sortBy])
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)` })
      .from(recordings)
      .where(whereClause)
  ]);

  return {
    data,
    total: countResult[0]?.count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((countResult[0]?.count ?? 0) / pageSize)
  };
}

export async function getRecordingById(id: number, userId?: number) {
  const db = await getDb();
  if (!db) return null;

  const whereClause = userId ? and(eq(recordings.id, id), eq(recordings.userId, userId)) : eq(recordings.id, id);
  const result = await db.select().from(recordings).where(whereClause).limit(1);
  return result[0] ?? null;
}

export async function createRecording(data: InsertRecording) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(recordings).values(data);
  return result[0].insertId;
}

export async function updateRecording(id: number, data: Partial<InsertRecording>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(recordings).set(data).where(eq(recordings.id, id));
}

// ========== Extraction Result Functions ==========

export async function getExtractionResultByRecordingId(recordingId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select()
    .from(extractionResults)
    .where(eq(extractionResults.recordingId, recordingId))
    .limit(1);
  return result[0] ?? null;
}

export async function createExtractionResult(data: InsertExtractionResult) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(extractionResults).values(data);
  return result[0].insertId;
}

export async function updateExtractionResult(id: number, data: Partial<InsertExtractionResult>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(extractionResults).set(data).where(eq(extractionResults.id, id));
}

// ========== Change History Functions ==========

export async function getChangeHistoryByRecordingId(recordingId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select()
    .from(changeHistory)
    .where(eq(changeHistory.recordingId, recordingId))
    .orderBy(desc(changeHistory.changedAt));
}

export async function createChangeHistory(data: InsertChangeHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(changeHistory).values(data);
  return result[0].insertId;
}

// ========== Seed Mock Data ==========

export async function seedMockData() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if data already exists
  const existing = await db.select().from(recordings).limit(1);
  if (existing.length > 0) {
    console.log("Mock data already exists, skipping seed");
    return;
  }

  // Sample recordings
  const mockRecordings: InsertRecording[] = [
    {
      userId: 1,
      recordedAt: new Date("2025-12-01T10:30:00Z"),
      staffName: "田中太郎",
      customerName: "山田花子",
      meetingType: "initial",
      status: "completed",
      productCategory: "life",
      durationSeconds: 1845,
      audioUrl: "/mock/audio1.mp3",
      transcription: `【営業担当】本日はお時間いただきありがとうございます。田中と申します。
【顧客】山田です。よろしくお願いします。
【営業担当】早速ですが、今回保険をご検討されているきっかけを教えていただけますか？
【顧客】はい、実は来年子供が生まれる予定でして、家族のための保障を考え始めました。
【営業担当】おめでとうございます。お子様が生まれるとなると、やはり万が一の時の備えは大切ですね。
【顧客】そうなんです。今は私の収入だけで生活していて、妻は専業主婦なので、私に何かあった時が心配で。
【営業担当】なるほど。現在のご年収はおいくらくらいでしょうか？
【顧客】年収は約600万円です。住宅ローンが月々12万円あります。
【営業担当】承知しました。既に加入されている保険はありますか？
【顧客】会社の団体保険で死亡保障が1000万円ついています。あとは医療保険に月5000円くらいで入っています。
【営業担当】ありがとうございます。ご希望の保険料の目安はございますか？
【顧客】できれば月々2万円以内に抑えたいと思っています。`,
    },
    {
      userId: 1,
      recordedAt: new Date("2025-12-02T14:00:00Z"),
      staffName: "佐藤美咲",
      customerName: "鈴木一郎",
      meetingType: "followup",
      status: "completed",
      productCategory: "medical",
      durationSeconds: 2100,
      audioUrl: "/mock/audio2.mp3",
      transcription: `【営業担当】鈴木様、先日はありがとうございました。佐藤です。
【顧客】こちらこそ。前回の提案を家族と相談しました。
【営業担当】いかがでしたでしょうか？
【顧客】医療保険については前向きに検討しています。ただ、がん保険も気になっていまして。
【営業担当】なるほど。ご家族にがんの既往歴がある方はいらっしゃいますか？
【顧客】父が5年前に胃がんを患いました。幸い早期発見で今は元気ですが。
【営業担当】そうでしたか。それでしたら、がん保険も併せてご検討されるのは良いかもしれません。
【顧客】保険料はどのくらいになりますか？
【営業担当】医療保険とがん保険を合わせて、月々8000円程度でご提案できます。
【顧客】それなら予算内ですね。詳しい内容を教えてください。`,
    },
    {
      userId: 1,
      recordedAt: new Date("2025-12-03T09:15:00Z"),
      staffName: "田中太郎",
      customerName: "高橋健二",
      meetingType: "proposal",
      status: "completed",
      productCategory: "savings",
      durationSeconds: 2400,
      audioUrl: "/mock/audio3.mp3",
      transcription: `【営業担当】高橋様、本日は具体的なプランをお持ちしました。
【顧客】お待ちしていました。
【営業担当】前回お伺いした、お子様の教育資金と老後の備えを両立できるプランです。
【顧客】はい、子供が今5歳と3歳なので、大学進学の時期に合わせて準備したいと思っています。
【営業担当】こちらの学資保険は、お子様が18歳になった時に300万円をお受け取りいただけます。
【顧客】返戻率はどのくらいですか？
【営業担当】約105%です。月々の保険料は12,500円となります。
【顧客】なるほど。老後の方はどうなっていますか？
【営業担当】個人年金保険で、65歳から10年間、毎年60万円をお受け取りいただけるプランです。
【顧客】妻の分も同じように加入できますか？
【営業担当】はい、奥様の分も同条件でご加入いただけます。`,
    },
    {
      userId: 1,
      recordedAt: new Date("2025-12-04T16:30:00Z"),
      staffName: "伊藤裕子",
      customerName: "渡辺真理",
      meetingType: "initial",
      status: "processing",
      productCategory: "investment",
      durationSeconds: 1500,
      audioUrl: "/mock/audio4.mp3",
      transcription: `【営業担当】渡辺様、本日はご来店ありがとうございます。伊藤と申します。
【顧客】渡辺です。資産運用について相談したくて。
【営業担当】承知しました。現在の資産状況を教えていただけますか？
【顧客】預金が約2000万円あります。定期預金に入れていますが、金利が低くて。
【営業担当】そうですね。現在の定期預金の金利は非常に低い水準です。
【顧客】投資は初めてなので、リスクが低いものから始めたいです。
【営業担当】変額保険という選択肢はいかがでしょうか。保険機能と資産運用を兼ね備えています。
【顧客】元本保証はありますか？
【営業担当】運用実績によって変動しますが、死亡保障は最低保証があります。`,
    },
    {
      userId: 1,
      recordedAt: new Date("2025-12-05T11:00:00Z"),
      staffName: "佐藤美咲",
      customerName: "中村優子",
      meetingType: "followup",
      status: "pending",
      productCategory: "life",
      durationSeconds: 1200,
      audioUrl: "/mock/audio5.mp3",
      transcription: null,
    },
  ];

  for (const rec of mockRecordings) {
    await db.insert(recordings).values(rec);
  }

  // Get inserted recording IDs
  const insertedRecordings = await db.select().from(recordings);

  // Sample extraction results
  const mockExtractions: { recordingId: number; data: ExtractionData; confidence: number }[] = [
    {
      recordingId: insertedRecordings[0].id,
      data: {
        insurancePurpose: { value: "死亡保障（家族保護）", confidence: 95 },
        familyStructure: { value: "本人、妻（専業主婦）、子供1人（出産予定）", confidence: 88 },
        incomeExpenses: { value: "年収600万円、住宅ローン月12万円", confidence: 92 },
        existingContracts: { value: "団体保険（死亡1000万円）、医療保険（月5000円）", confidence: 90 },
        desiredConditions: { value: "月額保険料2万円以内", confidence: 85 },
      },
      confidence: 90,
    },
    {
      recordingId: insertedRecordings[1].id,
      data: {
        insurancePurpose: { value: "医療保障、がん保障", confidence: 92 },
        familyStructure: { value: "父（がん既往歴あり）", confidence: 78 },
        incomeExpenses: { value: "記載なし", confidence: 30 },
        existingContracts: { value: "記載なし", confidence: 30 },
        desiredConditions: { value: "医療保険+がん保険で月8000円程度", confidence: 88 },
      },
      confidence: 72,
    },
    {
      recordingId: insertedRecordings[2].id,
      data: {
        insurancePurpose: { value: "教育資金準備、老後資金準備", confidence: 96 },
        familyStructure: { value: "本人、妻、子供2人（5歳、3歳）", confidence: 94 },
        incomeExpenses: { value: "記載なし", confidence: 25 },
        existingContracts: { value: "記載なし", confidence: 25 },
        desiredConditions: { value: "学資保険300万円（18歳受取）、個人年金（65歳から10年間60万円/年）", confidence: 91 },
      },
      confidence: 78,
    },
    {
      recordingId: insertedRecordings[3].id,
      data: {
        insurancePurpose: { value: "資産運用（低リスク志向）", confidence: 89 },
        familyStructure: { value: "記載なし", confidence: 20 },
        incomeExpenses: { value: "預金2000万円", confidence: 95 },
        existingContracts: { value: "定期預金", confidence: 85 },
        desiredConditions: { value: "元本保証希望、変額保険に興味", confidence: 75 },
      },
      confidence: 73,
    },
  ];

  for (const ext of mockExtractions) {
    await db.insert(extractionResults).values({
      recordingId: ext.recordingId,
      extractionData: ext.data,
      overallConfidence: ext.confidence,
    });
  }

  // Sample change history
  const mockHistory: InsertChangeHistory[] = [
    {
      recordingId: insertedRecordings[0].id,
      editorId: 1,
      editorName: "管理者",
      changeType: "extraction",
      oldValue: JSON.stringify({ insurancePurpose: { value: "死亡保障", confidence: 90 } }),
      newValue: JSON.stringify({ insurancePurpose: { value: "死亡保障（家族保護）", confidence: 95 } }),
      memo: "より具体的な目的に修正",
    },
    {
      recordingId: insertedRecordings[1].id,
      editorId: 1,
      editorName: "管理者",
      changeType: "transcription",
      oldValue: "【営業担当】鈴木様、先日はありがとうございました。",
      newValue: "【営業担当】鈴木様、先日はありがとうございました。佐藤です。",
      memo: "担当者名を追加",
    },
  ];

  for (const hist of mockHistory) {
    await db.insert(changeHistory).values(hist);
  }

  console.log("Mock data seeded successfully");
}

// ========== Reminder Functions ==========

export async function getReminders(userId: number, status?: "pending" | "completed" | "cancelled", fromDate?: Date, toDate?: Date) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(reminders.userId, userId)];

  if (status) {
    conditions.push(eq(reminders.status, status));
  }

  if (fromDate) {
    conditions.push(gte(reminders.dueDate, fromDate));
  }

  if (toDate) {
    conditions.push(lte(reminders.dueDate, toDate));
  }

  return db.select()
    .from(reminders)
    .where(and(...conditions))
    .orderBy(desc(reminders.createdAt));
}

export async function getReminderById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(reminders).where(eq(reminders.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createReminder(data: InsertReminder) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(reminders).values(data);
  return result[0].insertId;
}

export async function updateReminder(id: number, data: Partial<InsertReminder>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(reminders).set(data).where(eq(reminders.id, id));
}

export async function deleteReminder(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(reminders).where(eq(reminders.id, id));
}


// ========== Intent Template Functions ==========

export async function getIntentTemplates() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(intentTemplates).orderBy(desc(intentTemplates.createdAt));
}

export async function getIntentTemplateById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(intentTemplates).where(eq(intentTemplates.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getDefaultIntentTemplate() {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(intentTemplates).where(eq(intentTemplates.isDefault, 1)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createIntentTemplate(data: InsertIntentTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(intentTemplates).values(data);
  return result[0].insertId;
}

export async function updateIntentTemplate(id: number, data: Partial<InsertIntentTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(intentTemplates).set(data).where(eq(intentTemplates.id, id));
}

export async function deleteIntentTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(intentTemplates).where(eq(intentTemplates.id, id));
}

export async function setDefaultTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // まず全てのテンプレートのデフォルトを解除
  await db.update(intentTemplates).set({ isDefault: 0 });
  // 指定したテンプレートをデフォルトに設定
  await db.update(intentTemplates).set({ isDefault: 1 }).where(eq(intentTemplates.id, id));
}

// ========== Intent Document Functions ==========

export async function getIntentDocuments(recordingId?: number) {
  const db = await getDb();
  if (!db) return [];

  if (recordingId) {
    return db.select().from(intentDocuments)
      .where(eq(intentDocuments.recordingId, recordingId))
      .orderBy(desc(intentDocuments.generatedAt));
  }

  return db.select().from(intentDocuments).orderBy(desc(intentDocuments.generatedAt));
}

export async function getIntentDocumentById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(intentDocuments).where(eq(intentDocuments.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createIntentDocument(data: typeof intentDocuments.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(intentDocuments).values(data);
  return result[0].insertId;
}

// ========== Seed Default Template ==========

export async function seedDefaultTemplate() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if default template already exists
  const existing = await db.select().from(intentTemplates).limit(1);
  if (existing.length > 0) {
    console.log("Intent template already exists, skipping seed");
    return;
  }

  const defaultTemplate = `# 意向確認書

## 基本情報

**確認日時**: {{confirmationDate}}
**担当者名**: {{staffName}}
**顧客名**: {{customerName}}
**面談種別**: {{meetingType}}

---

## お客様の意向確認結果

### 1. 保険加入の目的
{{insurancePurpose}}

### 2. ご家族構成
{{familyStructure}}

### 3. 収支状況
{{incomeExpenses}}

### 4. 既存のご契約
{{existingContracts}}

### 5. ご希望条件
{{desiredConditions}}

---

## 確認事項

上記の内容について、お客様のご意向を確認いたしました。

**確認担当者**: {{staffName}}
**確認日**: {{confirmationDate}}

---

*本書は保険募集に関する意向確認の記録として作成されました。*
`;

  await db.insert(intentTemplates).values({
    name: "標準意向確認書テンプレート",
    description: "保険営業における標準的な意向確認書のテンプレートです。",
    content: defaultTemplate,
    isDefault: 1,
  });

  console.log("Default intent template seeded successfully");
}
