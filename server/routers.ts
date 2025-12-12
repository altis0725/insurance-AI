
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { difyService } from "./services/dify";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { monicaService } from "./services/monica";
import { complianceService } from "./services/compliance";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import {
  getRecordings,
  getRecordingById,
  updateRecording,
  getExtractionResultByRecordingId,
  updateExtractionResult,
  getChangeHistoryByRecordingId,
  createChangeHistory,
  seedMockData,
  getReminders,
  getReminderById,
  createReminder,
  updateReminder,
  deleteReminder,
  getIntentTemplates,
  getIntentTemplateById,
  getDefaultIntentTemplate,
  createIntentTemplate,
  updateIntentTemplate,
  deleteIntentTemplate,
  setDefaultTemplate,
  getIntentDocuments,
  createIntentDocument,
  seedDefaultTemplate,
  createRecording,
  createExtractionResult,
  getComplianceResultByRecordingId,
  createComplianceResult,
  updateComplianceResult,
} from "./db";
import { renderTemplate, generatePdfHtml, createDataSnapshot } from "./pdfGenerator";
import { ExtractionData } from "../drizzle/schema";

const sanitizeFileName = (fileName: string): string => {
  const base = path.basename(fileName);
  const valid = base.match(/^[A-Za-z0-9._-]+$/);
  if (!base || !valid) {
    throw new Error("Invalid file name");
  }
  return base;
};

// Zod schemas for validation
const recordingFiltersSchema = z.object({
  staffName: z.string().optional(),
  customerName: z.string().optional(),
  meetingType: z.enum(["initial", "followup", "proposal"]).optional(),
  status: z.enum(["pending", "processing", "completed", "error"]).optional(),
  productCategory: z.enum(["life", "medical", "savings", "investment"]).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
});

const recordingListParamsSchema = z.object({
  filters: recordingFiltersSchema.optional(),
  sortBy: z.enum(["recordedAt", "staffName", "customerName", "status"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.number().min(1).optional(),
  pageSize: z.number().min(1).max(100).optional(),
});

const extractionDataSchema = z.object({
  insurancePurpose: z.object({
    value: z.string(),
    confidence: z.number().min(0).max(100),
  }).optional(),
  familyStructure: z.object({
    value: z.string(),
    confidence: z.number().min(0).max(100),
  }).optional(),
  incomeExpenses: z.object({
    value: z.string(),
    confidence: z.number().min(0).max(100),
  }).optional(),
  existingContracts: z.object({
    value: z.string(),
    confidence: z.number().min(0).max(100),
  }).optional(),
  desiredConditions: z.object({
    value: z.string(),
    confidence: z.number().min(0).max(100),
  }).optional(),
});

// Main application router
export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    devLogin: publicProcedure.mutation(async ({ ctx }) => {
      if (process.env.NODE_ENV !== "development") {
        throw new Error("Dev login only available in development mode");
      }

      // Create or get dev user
      const devUser = {
        openId: "dev-user",
        name: "Dev User",
        email: "dev@example.com",
        loginMethod: "local",
      };

      await import("./db").then(db => db.upsertUser({
        openId: devUser.openId,
        name: devUser.name,
        email: devUser.email,
        loginMethod: devUser.loginMethod,
        lastSignedIn: new Date(),
      }));

      // Create session
      const { sdk } = await import("./_core/sdk");
      const sessionToken = await sdk.createSessionToken(devUser.openId, {
        name: devUser.name,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(ctx.req);
      // Ensure cookie options are suitable for local dev (might need to relax secure flag if not https)
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      return { success: true };
    }),
  }),

  // 録音データ関連のルーター
  recordings: router({
    // 録音一覧取得
    list: protectedProcedure
      .input(recordingListParamsSchema)
      .query(async ({ ctx, input }) => {
        return getRecordings(input, ctx.user.id);
      }),

    // 録音詳細取得
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const recording = await getRecordingById(input.id, ctx.user.id);
        if (!recording) {
          return null;
        }
        const extraction = await getExtractionResultByRecordingId(input.id);
        const history = await getChangeHistoryByRecordingId(input.id);
        return { recording, extraction, history };
      }),

    // 文字起こし更新
    updateTranscription: protectedProcedure
      .input(z.object({
        id: z.number(),
        transcription: z.string(),
        memo: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const recording = await getRecordingById(input.id, ctx.user.id);
        if (!recording) {
          throw new Error("Recording not found");
        }

        // 変更履歴を記録
        await createChangeHistory({
          recordingId: input.id,
          editorId: ctx.user.id,
          editorName: ctx.user.name ?? "不明",
          changeType: "transcription",
          oldValue: recording.transcription ?? "",
          newValue: input.transcription,
          memo: input.memo,
        });

        // 録音データを更新
        await updateRecording(input.id, { transcription: input.transcription });

        return { success: true };
      }),


    // 音声ファイルアップロード
    upload: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        fileBase64: z.string(),
        duration: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const safeFileName = sanitizeFileName(input.fileName);

        // Base64デコード
        const buffer = Buffer.from(input.fileBase64.split(',')[1], 'base64');
        const uploadDir = path.join(process.cwd(), 'client', 'public', 'uploads');

        // ディレクトリが存在しない場合は作成
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, safeFileName);
        const resolvedUploadDir = path.resolve(uploadDir);
        const resolvedFilePath = path.resolve(filePath);
        if (!resolvedFilePath.startsWith(resolvedUploadDir + path.sep)) {
          throw new Error("Invalid upload path");
        }

        fs.writeFileSync(resolvedFilePath, buffer);

        // 録音レコード作成
        const recordingId = await createRecording({
          userId: ctx.user.id,
          recordedAt: new Date(),
          staffName: ctx.user.name || "Unknown",
          customerName: "新規顧客", // 後でAIが更新するかも
          meetingType: "initial",
          status: "pending",
          productCategory: "life",
          durationSeconds: input.duration || 0,
          audioUrl: `/uploads/${safeFileName}`,
          transcription: "",
        });

        return { success: true, recordingId };
      }),

    // AI処理実行 (Dify)
    process: protectedProcedure
      .input(z.object({
        id: z.number(),
        skipTranscription: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const recording = await getRecordingById(input.id, ctx.user.id);
        if (!recording) {
          throw new Error("Recording not found");
        }
        if (!input.skipTranscription && !recording.audioUrl) {
          throw new Error("No audio file for transcription");
        }

        // ステータスを処理中に更新
        await updateRecording(input.id, { status: "processing" });

        try {
          let transcription = recording.transcription || "";

          // 文字起こしを実行する場合（skipTranscriptionがfalseまたは未指定）
          if (!input.skipTranscription) {
            const filePath = path.join(process.cwd(), 'client', 'public', recording.audioUrl!);
            if (!fs.existsSync(filePath)) {
              throw new Error(`Audio file not found at ${filePath}`);
            }
            const fileBuffer = fs.readFileSync(filePath);

            // 1. Difyで文字起こし
            transcription = await difyService.transcribeAudio(fileBuffer, path.basename(recording.audioUrl!));

            // 2. 録音データ更新（文字起こし）
            await updateRecording(input.id, { transcription });
          }

          // 3. Difyワークフローで情報抽出
          const extractionResult = await difyService.runWorkflow({
            transcription,
            // 必要に応じて他の入力も追加
          });

          // 4.抽出結果保存/更新
          const existingExtraction = await getExtractionResultByRecordingId(input.id);
          if (existingExtraction) {
            await updateExtractionResult(existingExtraction.id, {
              extractionData: extractionResult.extractionData,
              overallConfidence: extractionResult.overallConfidence
            });
          } else {
            await createExtractionResult({
              recordingId: input.id,
              extractionData: extractionResult.extractionData,
              overallConfidence: extractionResult.overallConfidence
            });
          }

          // 5. コンプライアンスチェック実行
          const complianceData = await complianceService.checkCompliance(transcription);
          const isCompliant = (
            complianceData.mandatoryItems.every(i => i.detected) &&
            complianceData.ngWords.filter(w => w.detected).length === 0
          ) ? 1 : 0;

          const existingCompliance = await getComplianceResultByRecordingId(input.id);
          if (existingCompliance) {
            await updateComplianceResult(existingCompliance.id, {
              complianceData,
              isCompliant
            });
          } else {
            await createComplianceResult({
              recordingId: input.id,
              complianceData,
              isCompliant
            });
          }

          // 完了ステータスへ
          await updateRecording(input.id, { status: "completed" });

          return { success: true };
        } catch (error) {
          console.error("Processing failed:", error);
          await updateRecording(input.id, { status: "error" });
          throw error;
        }
      }),

  }),

  // AI抽出結果関連のルーター
  extractions: router({
    // 抽出結果取得
    getByRecordingId: protectedProcedure
      .input(z.object({ recordingId: z.number() }))
      .query(async ({ ctx, input }) => {
        const recording = await getRecordingById(input.recordingId, ctx.user.id);
        if (!recording) {
          throw new Error("Recording not found");
        }
        return getExtractionResultByRecordingId(input.recordingId);
      }),

    // 抽出結果更新
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        recordingId: z.number(),
        extractionData: extractionDataSchema,
        memo: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const recording = await getRecordingById(input.recordingId, ctx.user.id);
        if (!recording) {
          throw new Error("Recording not found");
        }
        const existing = await getExtractionResultByRecordingId(input.recordingId);
        if (!existing) {
          throw new Error("Extraction result not found");
        }
        if (existing.id !== input.id) {
          throw new Error("Extraction result does not belong to the specified recording");
        }

        // 変更履歴を記録
        await createChangeHistory({
          recordingId: input.recordingId,
          editorId: ctx.user.id,
          editorName: ctx.user.name ?? "不明",
          changeType: "extraction",
          oldValue: JSON.stringify(existing.extractionData),
          newValue: JSON.stringify(input.extractionData),
          memo: input.memo,
        });

        // 全体の信頼度を再計算
        const data = input.extractionData as ExtractionData;
        const confidences = [
          data.insurancePurpose?.confidence,
          data.familyStructure?.confidence,
          data.incomeExpenses?.confidence,
          data.existingContracts?.confidence,
          data.desiredConditions?.confidence,
        ].filter((c): c is number => c !== undefined);

        const overallConfidence = confidences.length > 0
          ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)
          : 0;

        // 抽出結果を更新
        await updateExtractionResult(input.id, {
          extractionData: input.extractionData as ExtractionData,
          overallConfidence,
        });

        return { success: true };
      }),
  }),

  // コンプライアンスチェック関連のルーター
  compliance: router({
    getByRecordingId: protectedProcedure
      .input(z.object({ recordingId: z.number() }))
      .query(async ({ ctx, input }) => {
        const recording = await getRecordingById(input.recordingId, ctx.user.id);
        if (!recording) {
          throw new Error("Recording not found");
        }
        return getComplianceResultByRecordingId(input.recordingId);
      }),
  }),

  // 変更履歴関連のルーター
  history: router({
    // 録音IDで履歴取得
    getByRecordingId: protectedProcedure
      .input(z.object({ recordingId: z.number() }))
      .query(async ({ ctx, input }) => {
        const recording = await getRecordingById(input.recordingId, ctx.user.id);
        if (!recording) {
          throw new Error("Recording not found");
        }
        return getChangeHistoryByRecordingId(input.recordingId);
      }),
  }),

  // モックデータ投入（開発用）
  seed: router({
    run: adminProcedure.mutation(async () => {
      await seedMockData();
      return { success: true };
    }),
  }),

  // スマートサマリー生成
  summary: router({
    daily: protectedProcedure
      .input(z.object({ date: z.date().optional() }))
      .query(async ({ ctx, input }) => {
        const targetDate = input.date || new Date();
        const recordings = await getRecordings(
          {
            pageSize: 20,
            filters: { status: "completed" },
            sortBy: "recordedAt",
            sortOrder: "desc"
          },
          ctx.user.id
        );

        if (recordings.data.length === 0) {
          return {
            date: targetDate,
            summary: "本日の録音データはありません。",
            keyPoints: [],
            totalRecordings: 0,
            totalDuration: 0,
          };
        }

        const context = recordings.data.map(r => {
          return `顧客: ${r.customerName}, 面談タイプ: ${r.meetingType}\n文字起こし: ${r.transcription || "なし"}`;
        }).join("\n\n");

        try {
          const systemPrompt = `あなたは保険営業アシスタントです。以下の録音データを基に、1日の要約を作成してください。\n\n以下のJSON形式で回答してください:\n{\n  "summary": "全体の要約（100文字程度）",\n  "keyPoints": ["ポイント1", "ポイント2", "ポイント3"]\n}\n\n録音データ:\n${context}`;
          const content = await monicaService.chatCompletion(systemPrompt, "本日の営業活動を要約してください。");

          let summaryData = { summary: "", keyPoints: [] as string[] };
          try {
            const rawContent = content;
            const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              summaryData = JSON.parse(jsonMatch[0]);
            }
          } catch {
            const rawContent = content;
            summaryData = {
              summary: typeof rawContent === 'string'
                ? rawContent
                : "要約を生成できませんでした。",
              keyPoints: []
            };
          }

          const totalDuration = recordings.data.reduce((acc, r) => acc + r.durationSeconds, 0);

          return {
            date: targetDate,
            summary: summaryData.summary,
            keyPoints: summaryData.keyPoints,
            totalRecordings: recordings.data.length,
            totalDuration,
          };
        } catch (error) {
          console.error("Summary generation error:", error);
          return {
            date: targetDate,
            summary: "要約の生成に失敗しました。",
            keyPoints: [],
            totalRecordings: recordings.data.length,
            totalDuration: recordings.data.reduce((acc, r) => acc + r.durationSeconds, 0),
          };
        }
      }),
  }),

  // AI質問機能
  ask: router({
    query: protectedProcedure
      .input(z.object({ question: z.string() }))
      .mutation(async ({ ctx, input }) => {
        // 録音データを取得
        const recordings = await getRecordings(
          { pageSize: 10, filters: { status: "completed" } },
          ctx.user.id
        );

        // 録音データのコンテキストを作成
        const context = recordings.data.map(r => {
          return `[録音ID: ${r.id}] 顧客: ${r.customerName}, 担当: ${r.staffName}, 日時: ${r.recordedAt}, 面談タイプ: ${r.meetingType}\n文字起こし: ${r.transcription || "なし"}`;
        }).join("\n\n");

        try {
          const systemPrompt = `あなたは保険営業アシスタントです。以下の録音データを基に、ユーザーの質問に日本語で答えてください。\n\n録音データ:\n${context}`;
          const answer = await monicaService.chatCompletion(systemPrompt, input.question) || "回答を生成できませんでした。";

          // 関連録音を抽出（簡易版）
          const relatedRecordings = recordings.data.slice(0, 3).map(r => ({
            id: r.id,
            customerName: r.customerName,
            recordedAt: r.recordedAt,
          }));

          return {
            answer,
            relatedRecordings,
          };
        } catch (error) {
          console.error("LLM error:", error);
          return {
            answer: "申し訳ありません。AIからの回答を取得できませんでした。",
            relatedRecordings: [],
          };
        }
      }),
  }),

  // リマインダー機能
  reminders: router({
    list: protectedProcedure
      .input(z.object({
        status: z.enum(["pending", "completed", "cancelled"]).optional(),
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const fromDate = input?.fromDate ? new Date(input.fromDate) : undefined;
        const toDate = input?.toDate ? new Date(input.toDate) : undefined;
        return getReminders(ctx.user.id, input?.status, fromDate, toDate);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getReminderById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        recordingId: z.number().optional(),
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        dueDate: z.date().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createReminder({
          userId: ctx.user.id,
          recordingId: input.recordingId,
          title: input.title,
          description: input.description,
          dueDate: input.dueDate,
          priority: input.priority || "medium",
        });
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        dueDate: z.date().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        status: z.enum(["pending", "completed", "cancelled"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateReminder(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteReminder(input.id);
        return { success: true };
      }),

    // AIで録音からリマインダーを生成
    generateFromRecording: protectedProcedure
      .input(z.object({ recordingId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const recording = await getRecordingById(input.recordingId, ctx.user.id);
        if (!recording) {
          throw new Error("録音が見つかりません");
        }

        if (!recording.transcription) {
          return { reminders: [] };
        }

        try {
          const systemPrompt = `あなたは保険営業アシスタントです。以下の会話からフォローアップが必要な重要事項を抽出してください。\n\n以下のJSON形式で回答してください（最大3件まで）:\n{\n  "reminders": [\n    {\n      "title": "タスクのタイトル",\n      "description": "詳細内容",\n      "priority": "low" | "medium" | "high"\n    }\n  ]\n}\n\n会話内容:\n${recording.transcription}`;

          const rawContent = await monicaService.chatCompletion(systemPrompt, "この会話からフォローアップが必要な事項を抽出してください。");
          const content = typeof rawContent === 'string' ? rawContent : "{}";
          const jsonMatch = content.match(/\{[\s\S]*\}/);

          let reminderData: { reminders: Array<{ title: string; description?: string; priority?: "low" | "medium" | "high" }> } = { reminders: [] };
          if (jsonMatch) {
            try {
              reminderData = JSON.parse(jsonMatch[0]);
            } catch {
              reminderData = { reminders: [] };
            }
          }

          // リマインダーをデータベースに保存
          const createdReminders = [];
          for (const reminder of reminderData.reminders) {
            const id = await createReminder({
              userId: ctx.user.id,
              recordingId: input.recordingId,
              title: reminder.title,
              description: reminder.description,
              priority: reminder.priority || "medium",
            });
            createdReminders.push({ id, ...reminder });
          }

          return { reminders: createdReminders };
        } catch (error) {
          console.error("Reminder generation error:", error);
          return { reminders: [] };
        }
      }),
  }),

  // 意向確認テンプレート機能
  templates: router({
    list: protectedProcedure.query(async () => {
      return getIntentTemplates();
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getIntentTemplateById(input.id);
      }),

    getDefault: protectedProcedure.query(async () => {
      return getDefaultIntentTemplate();
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(200),
        description: z.string().optional(),
        content: z.string().min(1),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createIntentTemplate({
          name: input.name,
          description: input.description,
          content: input.content,
          isDefault: input.isDefault ? 1 : 0,
          createdBy: ctx.user.id,
        });
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        content: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateIntentTemplate(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteIntentTemplate(input.id);
        return { success: true };
      }),

    setDefault: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await setDefaultTemplate(input.id);
        return { success: true };
      }),

    // テンプレートのインポート（JSON形式）
    import: protectedProcedure
      .input(z.object({
        templates: z.array(z.object({
          name: z.string(),
          description: z.string().optional(),
          content: z.string(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const importedIds: number[] = [];
        for (const template of input.templates) {
          const id = await createIntentTemplate({
            name: template.name,
            description: template.description,
            content: template.content,
            isDefault: 0,
            createdBy: ctx.user.id,
          });
          importedIds.push(id);
        }
        return { importedIds, count: importedIds.length };
      }),

    // デフォルトテンプレートのシード
    seedDefault: protectedProcedure.mutation(async () => {
      await seedDefaultTemplate();
      return { success: true };
    }),
  }),

  // 意向確認書生成機能
  intentDocuments: router({
    list: protectedProcedure
      .input(z.object({ recordingId: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const recordingId = input?.recordingId;
        if (!recordingId) {
          throw new Error("recordingId is required");
        }
        const recording = await getRecordingById(recordingId, ctx.user.id);
        if (!recording) {
          throw new Error("録音が見つかりません");
        }
        return getIntentDocuments(recordingId);
      }),

    // 意向確認書のプレビュー生成
    preview: protectedProcedure
      .input(z.object({
        recordingId: z.number(),
        templateId: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const recording = await getRecordingById(input.recordingId, ctx.user.id);
        if (!recording) {
          throw new Error("録音が見つかりません");
        }

        let template;
        if (input.templateId) {
          template = await getIntentTemplateById(input.templateId);
        } else {
          template = await getDefaultIntentTemplate();
        }

        if (!template) {
          throw new Error("テンプレートが見つかりません");
        }

        const extraction = await getExtractionResultByRecordingId(input.recordingId);
        const renderedContent = renderTemplate(template.content, recording, extraction);
        const htmlContent = generatePdfHtml(renderedContent, `意向確認書 - ${recording.customerName}様`);

        return {
          html: htmlContent,
          markdown: renderedContent,
          template: {
            id: template.id,
            name: template.name,
          },
          recording: {
            id: recording.id,
            customerName: recording.customerName,
            staffName: recording.staffName,
          },
        };
      }),

    // 意向確認書の保存（履歴作成）
    save: protectedProcedure
      .input(z.object({
        recordingId: z.number(),
        templateId: z.number(),
        pdfUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const recording = await getRecordingById(input.recordingId, ctx.user.id);
        if (!recording) {
          throw new Error("録音が見つかりません");
        }

        const template = await getIntentTemplateById(input.templateId);
        if (!template) {
          throw new Error("テンプレートが見つかりません");
        }

        const extraction = await getExtractionResultByRecordingId(input.recordingId);
        const dataSnapshot = createDataSnapshot(recording, extraction, template);

        const id = await createIntentDocument({
          recordingId: input.recordingId,
          templateId: input.templateId,
          pdfUrl: input.pdfUrl,
          dataSnapshot,
          generatedBy: ctx.user.id,
          generatedByName: ctx.user.name || "不明",
        });

        return { id };
      }),
  }),
});

export type AppRouter = typeof appRouter;
