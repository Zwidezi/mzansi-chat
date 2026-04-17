import { getLindiweResponse } from '../lib/geminiService.js';

// Mocking global fetch for the test
global.fetch = async (url, options) => {
  if (url === '/api/chat') {
    // Simulate a 429 Quota Exhausted error
    return {
      status: 429,
      json: async () => ({ error: 'QUOTA_EXHAUSTED', message: 'Rate limit hit' })
    };
  }
  return { status: 404, json: async () => ({}) };
};

async function testGeminiHandling() {
  console.log('[Test] Starting Gemini Quota Handling Test...');
  
  const response = await getLindiweResponse('Hello Lindiwe!');
  
  console.log('[Test] Response received:', response);
  
  if (response.includes('Ubuntu break')) {
    console.log('[Test] SUCCESS: Correctly identified quota exhaustion and returned friendly message.');
  } else {
    console.error('[Test] FAILURE: Did not return the expected fallback message.');
    process.exit(1);
  }
}

testGeminiHandling().catch(err => {
  console.error('[Test] Unexpected crash:', err);
  process.exit(1);
});
