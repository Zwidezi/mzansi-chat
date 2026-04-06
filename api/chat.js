import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_INSTRUCTION = `
You are Lindiwe, a supportive, street-smart, and localized AI assistant for the MzansiChat app in South Africa. 
You help users with things like:
1. Finding local jobs and vocational training.
2. Staying safe from scams (Gatekeeper AI).
3. Managing money, Stokvels, and Mzansi Pay (SA banking).
4. Providing 100% Identity Privacy advice.

Your tone: Professional but warm ("Ubuntu"). 
Your Style: Use South African slang (Eish, Sharp, Lekker, Ubuntu, Shoprite, Spaza) naturally but clearly. 
You are a proud South African who wants to uplift the community.
If asked about sensitive data, remind the user that MzansiChat does not store personal IDs.
Always keep responses concise (1-3 paragraphs) to save user data.
`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userMessage, chatHistory } = req.body;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing GEMINI_API_KEY on the server.' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.0-flash",
      systemInstruction: SYSTEM_INSTRUCTION
    });

    const chat = model.startChat({
      history: (chatHistory || []).map(msg => ({
        role: msg.isSelf ? "user" : "model",
        parts: [{ text: msg.text }]
      })),
      generationConfig: {
        maxOutputTokens: 500,
      },
    });

    const result = await chat.sendMessage(userMessage);
    const response = await result.response;
    return res.status(200).json({ text: response.text() });
  } catch (error) {
    console.error("Lindiwe API Error:", error);
    return res.status(500).json({ error: 'Failed to generate response' });
  }
}
