
import React from 'react';
import { EMOTIONS, PITCH_OPTIONS } from '../constants';
import { ProsodySettings } from '../types';

interface ProsodyControlsProps {
  settings: ProsodySettings;
  onChange: (settings: ProsodySettings) => void;
}

const emotionIcons: Record<string, string> = {
  'Tự nhiên': '🗣️',
  'Vui vẻ': '😊',
  'Nghiêm túc/Tin tức': '📢',
  'Buồn': '😢',
  'Tức giận': '😠',
  'Thì thầm': '🤫',
  'Hào hứng': '🤩'
};

const ProsodyControls: React.FC<ProsodyControlsProps> = ({ settings, onChange }) => {
  const handleChange = (key: keyof ProsodySettings, value: any) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        Cấu hình giọng đọc chuyên sâu
      </h3>

      <div className="space-y-6">
        {/* Emotion Grid */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-slate-600 uppercase tracking-tight">Cảm xúc & Phong thái</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {EMOTIONS.map((emotion) => (
              <button
                key={emotion}
                onClick={() => handleChange('emotion', emotion)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-1 ${
                  settings.emotion === emotion
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'
                }`}
              >
                <span className="text-xl">{emotionIcons[emotion] || '🎙️'}</span>
                <span className="text-[11px] font-bold text-center leading-tight">{emotion}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Pitch Selection */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-slate-600 uppercase tracking-tight">Cao độ (Pitch)</label>
          <div className="flex bg-slate-100 p-1 rounded-xl overflow-hidden">
            {PITCH_OPTIONS.map((pitch) => (
              <button
                key={pitch}
                onClick={() => handleChange('pitch', pitch)}
                className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all ${
                  settings.pitch === pitch
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {pitch}
              </button>
            ))}
          </div>
        </div>

        {/* Speed Control */}
        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-slate-600 uppercase tracking-tight">Tốc độ đọc</label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">x{settings.speed.toFixed(1)}</span>
              <button 
                onClick={() => handleChange('speed', 1.0)}
                className="text-[10px] text-slate-400 hover:text-blue-500 uppercase font-bold"
              >
                Mặc định
              </button>
            </div>
          </div>
          <div className="relative flex items-center group">
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={settings.speed}
              onChange={(e) => handleChange('speed', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
          <div className="flex justify-between text-[10px] font-bold text-slate-400 px-1">
            <span>CHẬM (0.5x)</span>
            <span>NHANH (2.0x)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProsodyControls;
