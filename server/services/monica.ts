import OpenAI from "openai";

export class MonicaService {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({
            baseURL: process.env.MONICA_API_BASE_URL || "https://openapi.monica.im/v1",
            apiKey: process.env.MONICA_API_KEY || "dummy-key", // ユーザーが設定するまでダミー
        });
    }

    async chatCompletion(systemPrompt: string, userMessage: string, model: string = "gpt-5"): Promise<string> {
        try {
            const completion = await this.openai.chat.completions.create({
                model: model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage },
                ],
            });
            return completion.choices[0].message.content || "";
        } catch (error) {
            console.error("[Monica] Chat completion failed:", error);
            throw error;
        }
    }
}

export const monicaService = new MonicaService();
