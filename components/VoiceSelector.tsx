import React from 'react';
import { VOICES } from '../constants';
import { VoiceName } from '../types';

interface VoiceSelectorProps {
  selectedVoice: VoiceName;
  onVoiceChange: (voice: VoiceName) => void;
  onPreview: (voice: VoiceName) => void;
  previewingId: VoiceName | null;
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({ 
  selectedVoice, 
  onVoiceChange, 
  onPreview,
  previewingId
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {VOICES.map((voice) => (
        <div
          key={voice.id}
          onClick={() => onVoiceChange(voice.id)}
          className={`relative group flex flex-col p-4 rounded-2xl border-2 transition-all cursor-pointer ${
            selectedVoice === voice.id
              ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-50 shadow-md'
              : 'border-slate-200 hover:border-slate-300 bg-white hover:shadow-sm'
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className={`font-bold text-slate-900 transition-colors ${selectedVoice === voice.id ? 'text-blue-700' : ''}`}>
                  {voice.name}
                </span>
                {/* Fixed: removed redundant 'Female' check as it's not a valid member of the gender type 'Nam' | 'Nữ' */}
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-tighter ${
                  voice.gender === 'Nữ' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {voice.gender}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 italic line-clamp-1">{voice.description}</p>
            </div>

            {/* Preview Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPreview(voice.id);
              }}
              disabled={previewingId !== null}
              className={`p-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center ${
                previewingId === voice.id
                  ? 'bg-blue-600 text-white animate-pulse'
                  : 'bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white group-hover:scale-105 active:scale-95'
              }`}
              title="Nghe thử giọng đọc này"
            >
              {previewingId === voice.id ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.983 5.983 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.987 3.987 0 0013 10a3.987 3.987 0 00-1.172-2.828a1 1 0 010-1.415z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
          
          {/* Selected Indicator Checkmark */}
          {selectedVoice === voice.id && (
            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center text-white shadow-sm">
               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
               </svg>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default VoiceSelector;