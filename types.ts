
export enum VoiceName {
  Kore = 'Kore',
  Puck = 'Puck',
  Charon = 'Charon',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr'
}

export enum Language {
  Vietnamese = 'vi-VN',
  English = 'en-US'
}

export interface VoiceOption {
  id: VoiceName;
  name: string;
  gender: 'Male' | 'Female' | 'Nam' | 'Nữ';
  description: string;
}

export interface ProsodySettings {
  speed: number;
  pitch: string;
  volume: number;
  emotion: string;
  language: Language;
}

export interface UsageStats {
  daily: {
    count: number;
    date: string; // YYYY-MM-DD
  };
  monthly: {
    count: number;
    month: string; // YYYY-MM
  };
}

export interface HistoryItem {
  id: string;
  text: string;
  timestamp: number;
  voice: VoiceName;
  language: Language;
  audioUrl?: string;
  blob?: Blob;
}
