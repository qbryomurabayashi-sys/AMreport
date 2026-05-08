import { GoogleGenAI, Type } from '@google/genai';
import { StoreData } from '../types';

export async function generateFieldCoaching(fieldName: string, content: string): Promise<{ suggestion: string; coaching: string }> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `
あなたはエリアマネージャーの業務報告書作成をサポートするAIメンターです。
項目「${fieldName}」に入力された以下のテキストを評価・添削してください。

【入力テキスト】
${content}

【指示】
1. 簡潔さの徹底: 提案(suggestion)もコーチング(coaching)も、長文を避け、要点のみを簡潔に伝えてください。
2. 入力が極端に少ない、または具体性がない場合（例：「特になし」「頑張る」など）は、厳しいが愛のある短いコーチングコメントを返し、suggestionは元のテキストのままとするか、少しだけ膨らませたヒントにしてください。
3. 入力が十分な場合は、5W1HとSMARTの法則に基づき、より定量的で説得力のあるプロフェッショナルな文章に書き換えたものをsuggestionとして提案してください。ただし、冗長な表現は削ってください。
4. coachingには、なぜそのように書き換えたのか、または今後どういう点に気をつけて書くべきかのアドバイスを1〜2文で簡潔に記載してください。
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // 高速なFlashモデルに変更
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestion: { type: Type.STRING, description: "添削・推敲後の提案テキスト（簡潔に）" },
            coaching: { type: Type.STRING, description: "入力内容に対するフィードバックやアドバイス（1〜2文で簡潔に）" }
          },
          required: ["suggestion", "coaching"]
        }
      }
    });
    return JSON.parse(response.text || '{"suggestion":"","coaching":""}');
  } catch (error) {
    console.error('Gemini API Error:', error);
    return { suggestion: content, coaching: 'エラーが発生しました。APIキーやネットワーク接続を確認してください。' };
  }
}

export async function generateSummaryAndCoaching(storeData: StoreData): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const prompt = `
あなたは優秀なエリアマネージャーのメンターであり、業務報告書の添削と要約を行うAIです。
以下の店舗報告書の内容を読み、以下の指示に従って出力してください。

【指示】
1. 簡潔さの徹底: 要約もコーチングも、長文を避け、箇条書きなどを活用して要点のみを簡潔に伝えてください。
2. 情報量の判定:
入力された情報が極端に少ない、または具体性が全くない場合（例：「特になし」「頑張る」「売上を上げる」などの一言のみ、あるいは空欄ばかり）は、要約を行わず、以下のように厳しくも愛のある短いフィードバックを返してください。
「情報が少なすぎます。AIに頼る前に、まずはご自身の言葉で現状と課題を具体的に書き出してみましょう。誰が、いつ、何を、どうするのかを意識してください。」

3. 5W1HとSMARTの法則に基づく要約:
情報が十分な場合は、報告内容を5W1H（誰が、いつ、どこで、何を、なぜ、どのように）を明確にし、可能な限り定量的でSMART（Specific, Measurable, Achievable, Relevant, Time-bound）な表現に変換して要約してください。冗長な表現は削り、箇条書きで分かりやすくまとめてください。

4. 文章のコーチング:
ただダメ出しをするのではなく、「この部分は〇〇という数字を入れるとより説得力が増します」といった、次回の報告書作成に活かせる具体的なアドバイス（コーチング）を箇条書きで2〜3点、簡潔に提供してください。

【報告内容】
店舗名: ${storeData.name}
第${storeData.quarter}Q アクションプラン: ${storeData.actionPlan}
先月の振り返り: ${storeData.lastMonthReflection}
今月の課題解決・取り組み: ${storeData.thisMonthInitiatives}
販促: ${storeData.promotion}
学び・反省点や成果: ${storeData.learningAndResults}
重点項目: ${storeData.priorityItems}
設備: ${storeData.equipment}
成長が見られたスタッフ: ${storeData.staffGrowth}
懸念が見えたスタッフ: ${storeData.staffConcerns}
その他トピックス: ${storeData.otherTopics}

【マネジメント実行事実】
ミーティング件数: ${storeData.meetings.length}件
個別面談件数: ${storeData.interviews.length}件
技術指導件数: ${storeData.guidances.length}件

【トラブル・人事情報】
事故/クレーム件数: ${storeData.complaints.length}件
入社退職者数: ${storeData.hrChanges.length}件
休職者数: ${storeData.leaves.length}件
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // 高速なFlashモデルに変更
      contents: prompt,
    });
    return response.text || '要約の生成に失敗しました。';
  } catch (error) {
    console.error('Gemini API Error:', error);
    return 'エラーが発生しました。APIキーやネットワーク接続を確認してください。';
  }
}
