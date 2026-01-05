
export enum VoiceName {
  Kore = 'Kore',
  Puck = 'Puck',
  Charon = 'Charon',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr'
}

export interface VoiceOption {
  id: VoiceName;
  name: string;
  gender: 'Nam' | 'Nữ';
  description: string;
}

export interface ProsodySettings {
  speed: number;
  pitch: string;
  volume: number;
  emotion: string;
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
  audioUrl?: string;
  blob?: Blob;
}
