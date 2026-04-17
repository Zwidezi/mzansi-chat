import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { GoogleGenerativeAI } from '@google/generative-ai';

// Vite plugin to handle /api routes locally (mirrors Vercel serverless functions)
function localApiPlugin() {
  return {
    name: 'local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/chat' && req.method === 'POST') {
          try {
            const body = await new Promise((resolve) => {
              let data = '';
              req.on('data', chunk => data += chunk);
              req.on('end', () => resolve(JSON.parse(data)));
            });

            const apiKey = process.env.GEMINI_API_KEY;

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

            // --- Try Gemini first (works everywhere, including Vercel) ---
            if (apiKey) {
              const genAI = new GoogleGenerativeAI(apiKey);
              const model = genAI.getGenerativeModel({
                model: "gemini-2.0-flash",
                systemInstruction: SYSTEM_INSTRUCTION
              });

              const chat = model.startChat({
                history: (body.chatHistory || []).map(msg => ({
                  role: msg.isSelf ? "user" : "model",
                  parts: [{ text: msg.text }]
                })),
                generationConfig: { maxOutputTokens: 500 },
              });

              // Retry up to 3 times on 429 rate limit errors
              let lastError;
              for (let attempt = 0; attempt < 3; attempt++) {
                try {
                  const result = await chat.sendMessage(body.userMessage);
                  const response = await result.response;
                  console.log('[API] Response from Gemini (cloud)');
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ text: response.text() }));
                  return;
                } catch (err) {
                  lastError = err;
                  const is429 = err.message?.includes('429') || err.message?.includes('quota');
                  if (!is429) break;
                  const retryMatch = err.message?.match(/retryDelay["']:\s*["'](\d+)s["']/);
                  const delay = retryMatch ? parseInt(retryMatch[1]) * 1000 : (attempt + 1) * 10000;
                  console.log(`[API] Gemini 429 rate limited, retrying in ${delay}ms (attempt ${attempt + 1})`);
                  await new Promise(r => setTimeout(r, Math.min(delay, 60000)));
                }
              }
              const isQuota = lastError?.message?.includes('429') || lastError?.message?.includes('quota');
              if (!isQuota) {
                // Non-quota Gemini error — return it
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Gemini error: ' + (lastError?.message || 'Unknown error') }));
                return;
              }
              // Quota hit — fall through to Groq
              console.log('[API] Gemini quota exceeded, trying Groq fallback');
            } else {
              console.log('[API] No Gemini key, trying Groq fallback');
            }

            // --- Fallback 1: Groq (cloud, free, 14K req/day) ---
            const groqKey = process.env.GROQ_API_KEY;
            if (groqKey) {
              try {
                const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${groqKey}`
                  },
                  body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',
                    messages: [
                      { role: 'system', content: SYSTEM_INSTRUCTION.trim() },
                      ...(body.chatHistory || []).map(msg => ({
                        role: msg.isSelf ? 'user' : 'assistant',
                        content: msg.text
                      })),
                      { role: 'user', content: body.userMessage }
                    ],
                    max_tokens: 500,
                    temperature: 0.7
                  }),
                  signal: AbortSignal.timeout(15000)
                });

                if (groqRes.ok) {
                  const groqData = await groqRes.json();
                  const text = groqData.choices?.[0]?.message?.content;
                  if (text) {
                    console.log('[API] Response from Groq (cloud fallback)');
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ text }));
                    return;
                  }
                }
                console.log('[API] Groq failed, trying Ollama fallback');
              } catch (e) {
                console.log('[API] Groq error, trying Ollama fallback');
              }
            } else {
              console.log('[API] No Groq key, trying Ollama fallback');
            }

            // --- Fallback 2: Ollama (local, free, no quota) ---
            const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
            const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2:3b';

            try {
              const ollamaRes = await fetch(`${ollamaUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  model: ollamaModel,
                  stream: false,
                  messages: [
                    { role: 'system', content: SYSTEM_INSTRUCTION.trim() },
                    ...(body.chatHistory || []).map(msg => ({
                      role: msg.isSelf ? 'user' : 'assistant',
                      content: msg.text
                    })),
                    { role: 'user', content: body.userMessage }
                  ],
                  options: { num_predict: 500 }
                }),
                signal: AbortSignal.timeout(30000)
              });

              if (ollamaRes.ok) {
                const ollamaData = await ollamaRes.json();
                if (ollamaData.message?.content) {
                  console.log('[API] Response from Ollama (local fallback)');
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ text: ollamaData.message.content }));
                  return;
                }
              }
            } catch (e) {
              // Ollama not running
            }

            // Neither worked
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Eish! All AI providers are down. Gemini quota exhausted, Groq unavailable, Ollama not running. Try again later or start Ollama locally.' }));
          } catch (error) {
            console.error("Local API Error:", error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to generate response: ' + error.message }));
          }
          return;
        }
        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load all env vars (including non-VITE_ ones) for the local API plugin
  const env = loadEnv(mode, process.cwd(), '');
  process.env = { ...process.env, ...env };

  return {
    plugins: [react(), localApiPlugin()],
    build: {
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
    },
  }
})
