import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for AI Summarization
  app.post("/api/summarize", async (req, res) => {
    try {
      const { label, content } = req.body;
      // Gemini API Key の候補をいくつか確認し、前後の空白を除去
      const rawKey = process.env.CUSTOM_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env["Gemini API Key"];
      const key = rawKey?.trim();

      if (!key) {
        console.error('API Key missing. Checked GEMINI_API_KEY');
        return res.status(500).json({ error: "設定にAPIキーが見つかりません。AI StudioのSettings（左メニュー画面） > Secrets にて 'CUSTOM_GEMINI_API_KEY' という名前でご自身の Gemini APIキー を設定してください。" });
      }

      console.log(`API Key detected (length: ${key.length})`);
      // GoogleGenAIのコンストラクタはオブジェクトを受け取ります
      const ai = new GoogleGenAI({ apiKey: key });
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

      // 新しいSDKの標準的なメソッドを使用
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt + "\n\nInput Text:\n" + content
      });

      const text = response.text;

      res.json({ text });
    } catch (error: any) {
      console.error('Error in /api/summarize:', error);
      res.status(500).json({ error: error.message || "要約中にエラーが発生しました。" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve static files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
