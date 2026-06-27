import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser
app.use(express.json({ limit: "10mb" }));

// Server API Routes first
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { messages, model, systemInstruction } = req.body;

    // Retrieve Gemini API Key: Prefer client-provided header key, fall back to environment key, then default custom key
    const clientKey = req.headers["x-gemini-key"] || req.body.apiKey;
    let apiKey = typeof clientKey === "string" && clientKey.trim() !== "" 
      ? clientKey.trim() 
      : process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.trim() === "") {
      apiKey = "AQ.Ab8RN6L1qXThrCR4DmxxMUWXkimQU7SubYZIKOreaWUSJRPMRA";
    }

    if (!apiKey) {
      return res.status(400).json({
        error: "Missing API Key",
        message: "Gemini API Key is not configured. Please input your Gemini API Key in the settings or configure it in the server environment."
      });
    }

    // Initialize @google/genai with the chosen key and telemetry headers
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const modelName = model || "gemini-3.5-flash";

    // Format chat messages to Gemini SDK contents format
    // role must be 'user' or 'model'
    const formattedContents = (messages || []).map((msg: any) => {
      const role = msg.sender === "ai" || msg.role === "model" || msg.role === "assistant" 
        ? "model" 
        : "user";
      return {
        role: role,
        parts: [{ text: msg.text || msg.content || "" }],
      };
    });

    // Make the API call
    const response = await ai.models.generateContent({
      model: modelName,
      contents: formattedContents,
      config: systemInstruction ? { systemInstruction } : undefined,
    });

    const responseText = response.text || "";

    return res.json({
      text: responseText,
      model: modelName,
    });
  } catch (error: any) {
    console.error("Gemini Proxy Error:", error);
    return res.status(500).json({
      error: "Gemini Service Failure",
      message: error.message || "An error occurred while communicating with Google Gemini API.",
    });
  }
});

// Serve Vite dev server or static frontend production assets
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware integrated.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving compiled static assets from dist/.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`BlackholeAi Server is listening on http://0.0.0.0:${PORT}`);
  });
}

setupVite().catch((err) => {
  console.error("Failed to bootstrap Vite server:", err);
});
