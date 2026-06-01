import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Invalid message payload.' });
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
    }

    const ai = new GoogleGenAI({ apiKey: key });
    const formattedContents: any[] = [];

    if (history && Array.isArray(history)) {
      history.forEach((h: any) => {
        formattedContents.push({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        });
      });
    }

    formattedContents.push({ role: 'user', parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: formattedContents,
      config: {
        systemInstruction: SYSTEM_GUIDE_PROMPT,
        temperature: 0.7,
      },
    });

    const text = response.text || 'I apologize, but I could not formulate a response.';
    res.json({ text });
  } catch (err: any) {
    console.error('AI Guide Error:', err);
    res.status(500).json({ error: err.message || 'Unexpected error.' });
  }
}
