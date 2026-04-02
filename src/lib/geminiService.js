import { GoogleGenerativeAI } from "@google/generative-ai";

// Lindiwe's South African System Instruction
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

export const getLindiweResponse = async (apiKey, userMessage, chatHistory = []) => {
  if (!apiKey) {
    return "Eish! My connection is a bit weak. Please add your Gemini API Key in the settings so I can help you better. Sharp!";
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      systemInstruction: SYSTEM_INSTRUCTION
    });

    const chat = model.startChat({
      history: chatHistory.map(msg => ({
        role: msg.isSelf ? "user" : "model",
        parts: [{ text: msg.text }]
      })),
      generationConfig: {
        maxOutputTokens: 500,
      },
    });

    const result = await chat.sendMessage(userMessage);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Lindiwe AI Error:", error);
    return "Sharp! Something went wrong on my end. Check your internet connection or API Key. In the meantime, stay safe and keep saving those MBs!";
  }
};
