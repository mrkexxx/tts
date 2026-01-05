
import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceName, ProsodySettings } from "../types";

export async function generateSpeech(
  text: string,
  voice: VoiceName,
  settings: ProsodySettings,
  manualApiKey?: string
): Promise<string> {
  // Ưu tiên key thủ công, sau đó đến environment key
  const apiKey = manualApiKey || (typeof process !== 'undefined' ? process.env.API_KEY : undefined);
  
  if (!apiKey) {
    throw new Error("API Key chưa được cài đặt. Vui lòng nhập API Key ở mục 'Cấu hình Hệ thống'.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
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
      throw new Error("Không có dữ liệu âm thanh trả về từ API.");
    }
    return base64Audio;
  } catch (error: any) {
    console.error("Gemini TTS Error:", error);
    if (error.status === 401 || error.status === 403) {
      throw new Error("API Key không chính xác hoặc không có quyền truy cập.");
    }
    throw error;
  }
}
