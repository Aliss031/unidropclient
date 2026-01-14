
import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_INSTRUCTION = `
You are the SwiftCollect AI Assistant, a helpful customer support representative for a parcel collection system.
Users will ask about tracking, hub locations, how to use the QR code, or general delivery issues.
Be concise, friendly, and professional. 
SwiftCollect features:
- QR codes: Generated in the app for quick scan collection.
- PIN: A 6-digit code provided for manual collection if scanners are offline.
- Hubs: Physical locations or lockers where parcels are delivered.
- Statuses: Pending, In Transit, Ready for Collection, Collected.

If you don't know an answer, suggest they contact human support at support@swiftcollect.com.
`;

export async function getChatResponse(message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[] = []) {
  const apiKey = import.meta.env.GEMINI_API_KEY || import.meta.env.API_KEY;
  
  if (!apiKey) {
    console.error("Gemini API key not found");
    return "I'm having trouble connecting to my brain right now. Please configure your API key!";
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const chat = model.startChat({
      history: history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: h.parts,
      })),
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    return text || "I'm sorry, I couldn't process that. Please try again.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm having trouble connecting to my brain right now. Please try again later!";
  }
}
