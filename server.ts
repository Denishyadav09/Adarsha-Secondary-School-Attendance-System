import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// Lazy-initialized GoogleGenAI client helper
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is not defined. Please add it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

const SYSTEM_GUIDE_PROMPT = `You are "Scanner Buddy", a friendly interactive AI Guide & Assistant for the QR Code Attendance System.

CRITICAL REQUIREMENTS:
1. Always write all responses in polite, warm, and extremely clear, simple NEPALI language (सरल नेपाली भाषा) using Devanagari script.
2. Provide comprehensive, detailed, and highly helpful answers of any length. Do not restrict yourself to artificially short replies or 2-3 sentences. Explain features as thoroughly, beautifully, and fully as needed to satisfy the helper intent.
3. Answer questions for teachers, school staff, and students in Nepal based on these simple facts:
   - **हाजिरी गर्ने (Scan)**: क्यामेरा अगाडि QR राख्ने वा "Upload QR Image File" मा क्युआरको फोटो अपलोड गर्ने।
   - **QR बनाउने (New ID)**: "Generate Student QR Badge" मा गइ रोल नम्बर र नाम हालेर डाउनलोड गर्ने।
   - **दैनिक लिमिट (1-time Limit)**: दोहोरो हाजिरी नहोस् भनेर एउटा विद्यार्थीले १ दिनमा १ पटक मात्र हाजिरी स्क्यान गर्न सक्छ।
   - **रिपोर्ट Excel/CSV**: "Export CSV Logs" बाट आफूले फिल्टर गरेर हेरेको कक्षाको हाजिरी फाइल सिधै डाउनलोड गर्ने।
   - **हातले थप्ने**: क्युआर नभए 'Attendance Scanner' को 'Manual Check-in' बाट शिक्षकले नाम/रोलबाट हाजिरी थप्न सक्छन्।

ALWAYS response in Simple Nepali. Be warm, friendly, comprehensive, and highly helpful (विस्तृत रूपमा बुझाउनुहोस्)!`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies
  app.use(express.json());

  // AI Guidance endpoint
  app.post("/api/ai-guide", async (req, res) => {
    try {
      const { message, history } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Invalid message payload. Please provide a diagnostic message text." });
      }

      // Initialize GoogleGenAI client (will throw if GEMINI_API_KEY is not defined)
      const ai = getAiClient();

      // We extract history if provided, otherwise start a fresh chat or use generateContent
      // Let's use ai.models.generateContent with our structured prompt
      // We can format history or pass a conversational context
      const formattedContents: any[] = [];
      
      // Let's pass the instruction and system prompt
      const systemMessage = {
        role: "user",
        parts: [{ text: `${SYSTEM_GUIDE_PROMPT}\n\nHere is the history of our conversation:\n` }]
      };

      if (history && Array.isArray(history)) {
        // Appending conversation history for conversational assistance
        history.forEach((h: any) => {
          formattedContents.push({
            role: h.role === "assistant" ? "model" : "user",
            parts: [{ text: h.content }]
          });
        });
      }

      // Append current user message
      formattedContents.push({
        role: "user",
        parts: [{ text: message }]
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: formattedContents,
        config: {
          systemInstruction: SYSTEM_GUIDE_PROMPT,
          temperature: 0.7,
        }
      });

      const text = response.text || "I apologize, but I could not formulate a guide response. How else may I assist you with the Attendance System?";
      res.json({ text });

    } catch (err: any) {
      console.error("AI Assistance Guide Error:", err);
      res.status(500).json({
        error: err.message || "An unexpected error occurred in our Server AI Guidance helper module."
      });
    }
  });

  // Vite middleware for development or fallback static files for production
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite developmental middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static production assets from public dist directory...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`QR Attendance backend service successfully running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Critical server bootstrap failed:", error);
  process.exit(1);
});
