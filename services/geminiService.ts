
import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceName, ProsodySettings } from "../types";

export async function generateSpeech(
  text: string,
  voice: VoiceName,
  settings: ProsodySettings
): Promise<string> {
  // Sử dụng API_KEY trực tiếp từ môi trường theo quy định
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prosodyPrompt = `
    HƯỚNG DẪN: 
    1. Tự động nhận diện ngôn ngữ của văn bản bên dưới.
    2. Đọc văn bản một cách tự nhiên nhất theo ngôn ngữ đó.
    3. Áp dụng các đặc tính âm sắc sau:
       - Cảm xúc/Phong thái: ${settings.emotion}
       - Tốc độ đọc: ${settings.speed}x (mặc định là 1.0)
       - Cao độ: ${settings.pitch}
    
    VĂN BẢN CẦN CHUYỂN ĐỔI: 
    ${text}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prosodyPrompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("Không có dữ liệu âm thanh trả