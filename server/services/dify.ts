import { ExtractionData } from "../../drizzle/schema";
import { monicaService } from "./monica";

interface DifyConfig {
  baseUrl?: string;
  apiKeyAudio?: string;
  apiKeyWorkflow?: string;
}

const config: DifyConfig = {
  baseUrl: process.env.DIFY_API_BASE_URL,
  apiKeyAudio: process.env.DIFY_API_KEY_AUDIO,
  apiKeyWorkflow: process.env.DIFY_API_KEY_WORKFLOW,
};

export class DifyService {
  constructor() { }

  async transcribeAudio(fileBuffer: Buffer, fileName: string): Promise<string> {
    console.log(`[Dify] Transcribing audio file: ${fileName} (Dummy Implementation)`);

    // APIキーがない場合やダミーモードでの動作
    // 実際の実装では axios 等で Dify API を叩く

    // ダミーの文字起こしを返す
    return `【営業担当】本日はお時間いただきありがとうございます。保険の見直しをご希望とのことですね。
【顧客】はい、最近子供が生まれたので、今の保険で十分か不安になりまして。
【営業担当】おめでとうございます！お子様が生まれると生活環境も変わりますからね。現在はどのような保険に入られていますか？
【顧客】独身時代に入った医療保険だけです。死亡保障などは特にありません。
【営業担当】承知しました。それでは、万が一の時のご家族の生活費や、将来の学資金などをシミュレーションしてみましょう。
【顧客】お願いします。あまり保険料が高くなりすぎるのは困るのですが...月1万円くらいで収まりますか？
【営業担当】ご予算月1万円ですね。承知しました。その範囲で最大限の保障が得られるプランをご提案します。`;
  }

  async runWorkflow(inputs: Record<string, any>): Promise<{ extractionData: ExtractionData, overallConfidence: number }> {
    console.log(`[Dify] Running workflow with inputs (using Monica fallback):`, inputs);

    try {
      const systemPrompt = `あなたはプロフェッショナルな保険営業アシスタントです。
提供される営業会話の文字起こしテキストから、意向確認書に必要な重要情報を抽出し、指定のJSON形式で出力してください。

## 抽出項目と定義
1. **insurancePurpose (保険加入・見直しの目的)**: 何のために保険を検討しているか（例: 死亡保障、老後資金、医療保障など）
2. **familyStructure (家族構成)**: 本人および家族の情報（例: 配偶者、子供の有無・年齢など）
3. **incomeExpenses (収支・資産状況)**: 年収、月々の支出、予算感、住宅ローンなど
4. **existingContracts (既契約の状況)**: 現在加入している保険の内容
5. **desiredConditions (希望条件)**: 保険料、保障期間、支払方法などの要望

## 出力フォーマット (JSON)
{
  "insurancePurpose": { "value": "抽出した内容", "confidence": 80 },
  "familyStructure": { "value": "抽出した内容", "confidence": 90 },
  "incomeExpenses": { "value": "抽出した内容", "confidence": 70 },
  "existingContracts": { "value": "抽出した内容", "confidence": 85 },
  "desiredConditions": { "value": "抽出した内容", "confidence": 75 }
}

※ "confidence" (信頼度) は、情報が明確に語られているかどうかに基づいて 0〜100 の数値で評価してください。情報が全くない場合は value を "不明"、confidence を 0 としてください。`;

      const userMessage = `以下の会話から情報を抽出してください:\n\n${inputs.transcription}`;

      const response = await monicaService.chatCompletion(systemPrompt, userMessage);

      // JSONパースの試行
      let data: any = {};
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          data = JSON.parse(jsonMatch[0]);
        } else {
          data = JSON.parse(response);
        }
      } catch (e) {
        console.warn("[Dify] Failed to parse JSON from Monica response, falling back to mock data:", e);
        // パース失敗時はモックデータを返す（フォールバック）
        return {
          extractionData: {
            insurancePurpose: { value: "情報抽出エラー", confidence: 0 },
            familyStructure: { value: "情報抽出エラー", confidence: 0 },
            incomeExpenses: { value: "情報抽出エラー", confidence: 0 },
            existingContracts: { value: "情報抽出エラー", confidence: 0 },
            desiredConditions: { value: "情報抽出エラー", confidence: 0 },
          },
          overallConfidence: 0
        };
      }

      // データの正規化
      const extractionData: ExtractionData = {
        insurancePurpose: data.insurancePurpose || { value: "不明", confidence: 0 },
        familyStructure: data.familyStructure || { value: "不明", confidence: 0 },
        incomeExpenses: data.incomeExpenses || { value: "不明", confidence: 0 },
        existingContracts: data.existingContracts || { value: "不明", confidence: 0 },
        desiredConditions: data.desiredConditions || { value: "不明", confidence: 0 },
      };

      // 全体信頼度の計算
      const confidences = [
        extractionData.insurancePurpose?.confidence,
        extractionData.familyStructure?.confidence,
        extractionData.incomeExpenses?.confidence,
        extractionData.existingContracts?.confidence,
        extractionData.desiredConditions?.confidence,
      ].filter((c): c is number => c !== undefined);

      const overallConfidence = confidences.length > 0
        ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)
        : 0;

      return { extractionData, overallConfidence };

    } catch (error) {
      console.error("[Dify] Workflow execution failed:", error);
      throw error;
    }
  }
}

export const difyService = new DifyService();
