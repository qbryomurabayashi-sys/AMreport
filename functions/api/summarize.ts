export async function onRequestPost({ request, env }) {
  try {
    const { label, content } = await request.json();
    
    // Cloudflareの環境変数からAPIキーを取得
    const key = env.GEMINI_API_KEY;

    if (!key) {
      return new Response(JSON.stringify({ error: "Cloudflare環境変数のGEMINI_API_KEYが設定されていません。" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const aiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
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
