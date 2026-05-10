export async function onRequestPost({ request, env }) {
  try {
    const { label, content } = await request.json();
    
    // Cloudflareの環境変数からAPIキーを取得
    const rawKey = env.CUSTOM_GEMINI_API_KEY || env.GEMINI_API_KEY || env["Gemini API Key"];
    const key = rawKey?.trim();

    if (!key) {
      console.error("API Key missing in env");
      return new Response(JSON.stringify({ error: "APIキーが設定されていません。Settings（左メニュー画面）のSecretsで 'CUSTOM_GEMINI_API_KEY' という名前でご自身の Gemini APIキー を設定してください。" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    console.log(`API Key extracted (length: ${key.length})`);

    // モデル名を最新のもの（gemini-3.1-pro-preview）に修正
    const aiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${key}`;
    const prompt = `
        You are an assistant for a store Area Manager. 
        Summarize the following text for a "${label}" section in a business report.
        
        Guidelines:
        - Output Language: Japanese
        - Keep it concise, professional, and easy to read.
        - Use "です/ます" (polite) style.
        - Fix any typos or grammatical errors.
        - Do not lose key facts or numbers.
        - If the input is just keywords, expand them into natural sentences.
      `;

    // REST API経由でGeminiを呼び出す（Cloudflare Workers環境用）
    const response = await fetch(aiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt + "\n\nInput Text:\n" + content }]
        }]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
       throw new Error(data?.error?.message || "通信エラーが発生しました");
    }

    const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error("要約結果が空でした。");
    }

    return new Response(JSON.stringify({ text: generatedText }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "サーバーエラーが発生しました。" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
