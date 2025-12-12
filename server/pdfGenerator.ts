import { Recording, ExtractionResult, IntentTemplate } from "../drizzle/schema";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * 面談タイプの日本語ラベル
 */
const meetingTypeLabels: Record<string, string> = {
  initial: "初回面談",
  followup: "フォローアップ",
  proposal: "提案",
};

/**
 * テンプレートのプレースホルダーを実際のデータで置換
 */
export function renderTemplate(
  template: string,
  recording: Recording,
  extraction: ExtractionResult | null
): string {
  const extractionData = extraction?.extractionData || {};

  const replacements: Record<string, string> = {
    "{{confirmationDate}}": format(new Date(), "yyyy年M月d日 HH:mm", { locale: ja }),
    "{{staffName}}": recording.staffName,
    "{{customerName}}": recording.customerName,
    "{{meetingType}}": meetingTypeLabels[recording.meetingType] || recording.meetingType,
    "{{recordedAt}}": format(new Date(recording.recordedAt), "yyyy年M月d日 HH:mm", { locale: ja }),
    "{{insurancePurpose}}": extractionData.insurancePurpose?.value || "（未記入）",
    "{{familyStructure}}": extractionData.familyStructure?.value || "（未記入）",
    "{{incomeExpenses}}": extractionData.incomeExpenses?.value || "（未記入）",
    "{{existingContracts}}": extractionData.existingContracts?.value || "（未記入）",
    "{{desiredConditions}}": extractionData.desiredConditions?.value || "（未記入）",
  };

  let result = template;
  for (const [placeholder, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"), value);
  }

  return result;
}

/**
 * MarkdownをHTMLに変換（シンプルな実装）
 */
export function markdownToHtml(markdown: string): string {
  const escaped = escapeHtml(markdown);
  let html = escaped
    // Headers
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Horizontal rule
    .replace(/^---$/gm, "<hr>")
    // Line breaks
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");

  return `<p>${html}</p>`;
}

/**
 * HTMLをPDF用のスタイル付きHTMLに変換
 */
export function generatePdfHtml(content: string, title: string): string {
  const htmlContent = markdownToHtml(content);

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    body {
      font-family: "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif;
      font-size: 12pt;
      line-height: 1.8;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      font-size: 24pt;
      color: #1a1a2e;
      border-bottom: 3px solid #6366f1;
      padding-bottom: 10px;
      margin-bottom: 30px;
    }
    h2 {
      font-size: 16pt;
      color: #1a1a2e;
      border-left: 4px solid #6366f1;
      padding-left: 12px;
      margin-top: 30px;
      margin-bottom: 15px;
    }
    h3 {
      font-size: 14pt;
      color: #374151;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    p {
      margin: 10px 0;
    }
    strong {
      color: #1a1a2e;
    }
    hr {
      border: none;
      border-top: 1px solid #e5e7eb;
      margin: 30px 0;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 10pt;
      color: #6b7280;
      text-align: center;
    }
  </style>
</head>
<body>
  ${htmlContent}
  <div class="footer">
    生成日時: ${format(new Date(), "yyyy年M月d日 HH:mm:ss", { locale: ja })}
  </div>
</body>
</html>`;
}

/**
 * データスナップショットを作成
 */
export function createDataSnapshot(
  recording: Recording,
  extraction: ExtractionResult | null,
  template: IntentTemplate
): Record<string, unknown> {
  return {
    recording: {
      id: recording.id,
      staffName: recording.staffName,
      customerName: recording.customerName,
      meetingType: recording.meetingType,
      recordedAt: recording.recordedAt,
      productCategory: recording.productCategory,
    },
    extraction: extraction ? {
      id: extraction.id,
      extractionData: extraction.extractionData,
      overallConfidence: extraction.overallConfidence,
    } : null,
    template: {
      id: template.id,
      name: template.name,
    },
    generatedAt: new Date().toISOString(),
  };
}
