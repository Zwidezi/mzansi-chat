export const getLindiweResponse = async (userMessage, chatHistory = []) => {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userMessage, chatHistory })
    });
    
    const data = await res.json();
    if (data.error) {
       console.error("Server AI Error:", data.error);
       return "Eish! My connection is weak because the server is missing its Gemini API Key. Sharp!";
    }
    return data.text;
  } catch (error) {
    console.error("Lindiwe AI Error:", error);
    return "Sharp! Something went wrong communicating with the server. Check your connection.";
  }
};
