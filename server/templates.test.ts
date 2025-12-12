import { describe, expect, it, beforeEach } from "vitest";
import { renderTemplate, markdownToHtml, generatePdfHtml, createDataSnapshot } from "./pdfGenerator";
import type { Recording, ExtractionResult, IntentTemplate } from "../drizzle/schema";

describe("PDF Generator", () => {
  const mockRecording: Recording = {
    id: 1,
    userId: 1,
    recordedAt: new Date("2024-01-15T10:30:00Z"),
    staffName: "山田太郎",
    customerName: "佐藤花子",
    meetingType: "initial",
    status: "completed",
    productCategory: "life",
    durationSeconds: 1800,
    audioUrl: null,
    transcription: "テスト文字起こし",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockExtraction: ExtractionResult = {
    id: 1,
    recordingId: 1,
    extractionData: {
      insurancePurpose: { value: "老後の生活資金確保", confidence: 85 },
      familyStructure: { value: "配偶者と子供2人", confidence: 90 },
      incomeExpenses: { value: "年収600万円、月々の支出30万円", confidence: 75 },
      existingContracts: { value: "なし", confidence: 95 },
      desiredConditions: { value: "月額1万円以内", confidence: 80 },
    },
    overallConfidence: 85,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTemplate: IntentTemplate = {
    id: 1,
    name: "テストテンプレート",
    description: "テスト用",
    content: `# 意向確認書

**顧客名**: {{customerName}}
**担当者**: {{staffName}}
**面談タイプ**: {{meetingType}}

## 保険目的
{{insurancePurpose}}

## 家族構成
{{familyStructure}}
`,
    isDefault: 1,
    createdBy: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe("renderTemplate", () => {
    it("should replace placeholders with recording data", () => {
      const result = renderTemplate(mockTemplate.content, mockRecording, mockExtraction);

      expect(result).toContain("佐藤花子");
      expect(result).toContain("山田太郎");
      expect(result).toContain("初回面談");
    });

    it("should replace placeholders with extraction data", () => {
      const result = renderTemplate(mockTemplate.content, mockRecording, mockExtraction);

      expect(result).toContain("老後の生活資金確保");
      expect(result).toContain("配偶者と子供2人");
    });

    it("should handle missing extraction data", () => {
      const result = renderTemplate(mockTemplate.content, mockRecording, null);

      expect(result).toContain("（未記入）");
    });
  });

  describe("markdownToHtml", () => {
    it("should convert headers", () => {
      const result = markdownToHtml("# Title\n## Subtitle");

      expect(result).toContain("<h1>Title</h1>");
      expect(result).toContain("<h2>Subtitle</h2>");
    });

    it("should convert bold text", () => {
      const result = markdownToHtml("**bold text**");

      expect(result).toContain("<strong>bold text</strong>");
    });

    it("should convert horizontal rules", () => {
      const result = markdownToHtml("---");

      expect(result).toContain("<hr>");
    });
  });

  describe("generatePdfHtml", () => {
    it("should generate valid HTML document", () => {
      const result = generatePdfHtml("# Test Content", "Test Title");

      expect(result).toContain("<!DOCTYPE html>");
      expect(result).toContain("<title>Test Title</title>");
      expect(result).toContain("<h1>Test Content</h1>");
    });

    it("should include Japanese font styles", () => {
      const result = generatePdfHtml("テスト", "テスト");

      expect(result).toContain("Hiragino");
      expect(result).toContain("Yu Gothic");
    });
  });

  describe("createDataSnapshot", () => {
    it("should create snapshot with recording data", () => {
      const result = createDataSnapshot(mockRecording, mockExtraction, mockTemplate);

      expect(result.recording).toBeDefined();
      expect((result.recording as any).customerName).toBe("佐藤花子");
      expect((result.recording as any).staffName).toBe("山田太郎");
    });

    it("should create snapshot with extraction data", () => {
      const result = createDataSnapshot(mockRecording, mockExtraction, mockTemplate);

      expect(result.extraction).toBeDefined();
      expect((result.extraction as any).overallConfidence).toBe(85);
    });

    it("should create snapshot with template info", () => {
      const result = createDataSnapshot(mockRecording, mockExtraction, mockTemplate);

      expect(result.template).toBeDefined();
      expect((result.template as any).name).toBe("テストテンプレート");
    });

    it("should include generation timestamp", () => {
      const result = createDataSnapshot(mockRecording, mockExtraction, mockTemplate);

      expect(result.generatedAt).toBeDefined();
    });

    it("should handle null extraction", () => {
      const result = createDataSnapshot(mockRecording, null, mockTemplate);

      expect(result.extraction).toBeNull();
    });
  });
});
