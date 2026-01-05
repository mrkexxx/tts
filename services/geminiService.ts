
import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceName, ProsodySettings } from "../types";

export async function generateSpeech(
  text: string,
  voice: VoiceName,
  settings: ProsodySettings,
  apiKey?: string
): Promise<string> {
  const finalApiKey = apiKey || process.env.API_KEY;
  
  if (!finalApiKey) {
    throw new Error("API Key is missing. Please configure it in settings.");
  }

  const ai = new GoogleGenAI({ apiKey: finalApiKey });
  
  const prosodyPrompt = `
    Instructions: Detect the language of the text below and read it naturally.
    - Emotion/Style: ${settings.emotion}
    - Speaking Speed: ${settings.speed}x (1.0 is default)
    - Pitch Level: ${settings.pitch}
    
    Text to read: 
    ${text}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prosodyPrompt }] }],
      config: {
        // responseModalities must be exactly [Modality.AUDIO]
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
