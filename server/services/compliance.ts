import { ComplianceData } from "../../drizzle/schema";
import { monicaService } from "./monica";

export class ComplianceService {
    private mandatoryItems = [
        { id: "cooling_off", label: "クーリングオフの説明", description: "契約の申込みの撤回等に関する事項" },
        { id: "privacy_policy", label: "個人情報の取り扱い", description: "個人情報の利用目的等の説明" },
        { id: "intent_confirm", label: "意向確認", description: "顧客のニーズと提案内容が合致しているかの確認" },
        { id: "important_matters", label: "重要事項説明", description: "契約概要・注意喚起情報の説明" },
    ];

    private ngWords = [
        { word: "絶対儲かる", description: "断定的判断の提供禁止" },
        { word: "元本保証", description: "虚偽の説明禁止（特定商品を除く）" },
        { word: "必ず上がります", description: "将来の不確実な事項への断定" },
        { word: "解約しても損はしない", description: "不利益事実の不告知禁止" },
    ];

    async checkCompliance(transcription: string): Promise<ComplianceData> {
        console.log("[Compliance] Checking compliance...");

        const systemPrompt = `あなたは保険営業のコンプライアンス担当者です。
営業担当者と顧客の会話（文字起こし）を分析し、以下の2点をチェックしてください。

1. **必須説明項目の有無**: 指定された項目が説明されているか。
2. **NGワードの検出**: 法令違反となるNGワードや不適切な表現が含まれていないか。

## チェック対象
【必須説明項目】
${this.mandatoryItems.map(item => `- ${item.label}: ${item.description}`).join('\n')}

【NGワード候補】
${this.ngWords.map(word => `- 「${word.word}」 (${word.description})`).join('\n')}

## 出力フォーマット (JSON)
{
  "mandatoryItems": [
    { "item": "項目名", "detected": true/false, "reason": "検出された説明文または未検出の理由" }
  ],
  "ngWords": [
    { "word": "NGワード", "detected": true/false, "context": "前後の文脈" }
  ]
}

※ NGワードは、候補に完全に一致しなくても、類似する不適切な表現があれば検出してください。
※ 必須項目は、明確に説明されている場合のみ true としてください。`;

        const userMessage = `以下の会話をチェックしてください:\n\n${transcription}`;

        try {
            const response = await monicaService.chatCompletion(systemPrompt, userMessage);

            let data: ComplianceData = { mandatoryItems: [], ngWords: [] };
            try {
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    data = JSON.parse(jsonMatch[0]);
                } else {
                    data = JSON.parse(response);
                }
            } catch (e) {
                console.warn("[Compliance] Failed to parse JSON:", e);
                // Fallback or empty result
                return {
                    mandatoryItems: this.mandatoryItems.map(i => ({ item: i.label, detected: false, reason: "解析エラー" })),
                    ngWords: []
                };
            }

            return data;

        } catch (error) {
            console.error("[Compliance] Check failed:", error);
            throw error;
        }
    }
}

export const complianceService = new ComplianceService();
