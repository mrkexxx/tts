
import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceName, ProsodySettings, Language } from "../types";

export async function generateSpeech(
  text: string,
  voice: VoiceName,
  settings: ProsodySettings,
  apiKey?: string
): Promise<string> {
  // Ưu tiên sử dụng apiKey được truyền vào (từ ô nhập liệu), nếu không có thì dùng process.env.API_KEY
  const finalApiKey = apiKey || process.env.API_KEY;
  
  if (!finalApiKey) {
    throw new Error("API Key is missing. Please configure it in settings.");
  }

  const ai = new GoogleGenAI({ apiKey: finalApiKey });
  
  const languageName = settings.language === Language.Vietnamese ? 'Vietnamese' : 'English';
  
  const prosodyPrompt = `
    Read the following text in ${languageName} with these specific characteristics:
    - Emotion: ${settings.emotion}
    - Speaking Speed: ${settings.speed}x (where 1.0 is normal)
    - Pitch: ${settings.pitch}
    
    Text: ${text}
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
      throw new Error("No audio data returned from Gemini");
    }
    return base64Audio;
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    throw error;
  }
}
