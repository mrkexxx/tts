
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { VoiceName, ProsodySettings, HistoryItem, UsageStats } from './types';
import { VOICES } from './constants';
import VoiceSelector from './components/VoiceSelector';
import ProsodyControls from './components/ProsodyControls';
import { generateSpeech } from './services/geminiService';
import { decodeBase64, createWavBlob } from './utils/audioUtils';

const DAILY_LIMIT = 50000;
const MAX_CHARS_PER_PART = 5000;

const App: React.FC = () => {
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>(VoiceName.Kore);
  const [settings, setSettings] = useState<ProsodySettings>({
    speed: 1.0,
    pitch: 'Trung bình',
    volume: 1.0,
    emotion: 'Tự nhiên'
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [estimatedSeconds, setEstimatedSeconds] = useState(0);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [apiError, setApiError] = useState<string | null>(null);
  
  // API Key Management State
  const [manualApiKey, setManualApiKey] = useState<string>('');
  const [isApiPanelOpen, setIsApiPanelOpen] = useState(false);
  
  const [previewingId, setPreviewingId] = useState<VoiceName | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  
  const [usage, setUsage] = useState<UsageStats>({
    daily: { count: 0, date: new Date().toISOString().split('T')[0] },
    monthly: { count: 0, month: new Date().toISOString().slice(0, 7) }
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(new Audio());
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // Load API Key
    const savedKey = localStorage.getItem('gemini_manual_api_key');
    if (savedKey) setManualApiKey(savedKey);

    const savedHistory = localStorage.getItem('gemini_tts_history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed.map((item: any) => ({ ...item, audioUrl: undefined, blob: undefined })));
      } catch (e) { console.error(e); }
    }

    const savedUsage = localStorage.getItem('gemini_tts_usage');
    if (savedUsage) {
      try {
        const parsed: UsageStats = JSON.parse(savedUsage);
        const today = new Date().toISOString().split('T')[0];
        setUsage(prev => ({
          ...parsed,
          daily: parsed.daily.date === today ? parsed.daily : { count: 0, date: today }
        }));
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('gemini_tts_usage', JSON.stringify(usage));
  }, [usage]);

  useEffect(() => {
    const historyToSave = history.map(({ blob, audioUrl, ...rest }) => rest);
    localStorage.setItem('gemini_tts_history', JSON.stringify(historyToSave));
  }, [history]);

  const saveApiKey = () => {
    localStorage.setItem('gemini_manual_api_key', manualApiKey);
    setIsApiPanelOpen(false);
    alert('Đã lưu API Key thành công!');
  };

  const onTimeUpdate = () => { if (audioRef.current) setAudioCurrentTime(audioRef.current.currentTime); };
  const onLoadedMetadata = () => { if (audioRef.current) setAudioDuration(audioRef.current.duration); };
  const onAudioEnded = () => setIsPlaying(false);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setAudioCurrentTime(time);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const splitText = (input: string, limit: number): string[] => {
    const chunks: string[] = [];
    let current = input.trim();
    while (current.length > 0) {
      if (current.length <= limit) { chunks.push(current); break; }
      let splitAt = current.lastIndexOf('. ', limit);
      if (splitAt === -1) splitAt = current.lastIndexOf('\n', limit);
      if (splitAt === -1) splitAt = current.lastIndexOf(' ', limit);
      if (splitAt === -1) splitAt = limit;
      chunks.push(current.substring(0, splitAt).trim());
      current = current.substring(splitAt).trim();
    }
    return chunks;
  };

  const handleDownload = useCallback((item: HistoryItem) => {
    if (!item.blob) return;
    const url = URL.createObjectURL(item.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `voice-studio-${item.id}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const handlePreviewVoice = async (voiceId: VoiceName) => {
    if (previewingId) return;
    setPreviewingId(voiceId);
    setApiError(null);
    try {
      const base64Audio = await generateSpeech("Hello, AI Voice Studio.", voiceId, { ...settings, speed: 1.0, emotion: 'Tự nhiên' }, manualApiKey);
      const audioBytes = decodeBase64(base64Audio);
      const wavBlob = createWavBlob(audioBytes);
      const url = URL.createObjectURL(wavBlob);
      if (previewAudioRef.current) {
        previewAudioRef.current.src = url;
        previewAudioRef.current.onended = () => { setPreviewingId(null); URL.revokeObjectURL(url); };
        previewAudioRef.current.play();
      }
    } catch (error: any) {
      setPreviewingId(null);
      setApiError(error.message || "Lỗi kết nối API.");
    }
  };

  const handleGenerate = async () => {
    if (!text.trim() || isGenerating) return;
    setApiError(null);
    const textLen = text.length;
    if (usage.daily.count + textLen > DAILY_LIMIT) { 
      setApiError(`Hạn mức hôm nay đã đạt giới hạn (${DAILY_LIMIT} ký tự).`); 
      return; 
    }

    const chunks = splitText(text, MAX_CHARS_PER_PART);
    setIsGenerating(true);
    setProgress(0);
    setGenerationProgress({ current: 0, total: chunks.length });
    
    const initialEstimatedTime = Math.ceil(1 + (textLen / 500) + (chunks.length * 2));
    setEstimatedSeconds(initialEstimatedTime);

    timerRef.current = window.setInterval(() => {
      setEstimatedSeconds(prev => (prev > 1 ? prev - 1 : 1));
      setProgress(prev => (prev < 90 ? prev + (90 - prev) * 0.02 : prev));
    }, 1000);

    try {
      const newHistoryItems: HistoryItem[] = [];
      let totalUsageIncrement = 0;
      
      for (let i = 0; i < chunks.length; i++) {
        setGenerationProgress(prev => ({ ...prev, current: i + 1 }));
        const base64Audio = await generateSpeech(chunks[i], selectedVoice, settings, manualApiKey);
        const audioBytes = decodeBase64(base64Audio);
        const wavBlob = createWavBlob(audioBytes);
        const url = URL.createObjectURL(wavBlob);
        
        const newItem: HistoryItem = {
          id: `${Date.now()}-${i}`,
          text: (chunks.length > 1 ? `[PHẦN ${i+1}] ` : '') + chunks[i].slice(0, 100) + (chunks[i].length > 100 ? "..." : ""),
          timestamp: Date.now(),
          voice: selectedVoice,
          audioUrl: url,
          blob: wavBlob
        };
        newHistoryItems.push(newItem);
        totalUsageIncrement += chunks[i].length;
        
        if (i === chunks.length - 1) {
          setCurrentAudio(url);
          setIsPlaying(true);
        }
        setProgress(Math.round(((i + 1) / chunks.length) * 100));
      }
      
      setHistory(prev => [...newHistoryItems.reverse(), ...prev].slice(0, 30));
      setUsage(prev => ({ 
        ...prev,
        daily: { ...prev.daily, count: prev.daily.count + totalUsageIncrement }
      }));
    } catch (error: any) { 
      setApiError(error.message || "Xảy ra lỗi trong quá trình xử lý.");
    } finally {
      if (timerRef.current) window.clearInterval(timerRef.current);
      setIsGenerating(false);
      setEstimatedSeconds(0);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex flex-col text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm backdrop-blur-md bg-white/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Gemini Voice Studio</h1>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${manualApiKey ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}></span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {manualApiKey ? 'Cấu hình hoàn tất' : 'Chưa nhập API Key'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsApiPanelOpen(!isApiPanelOpen)}
              className={`p-2 rounded-xl border transition-all ${isApiPanelOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-indigo-600'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cột Trái (4/12) */}
        <aside className="lg:col-span-4 space-y-8 sticky top-24">
           {isApiPanelOpen && (
             <section className="p-6 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-100 text-white animate-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-black uppercase tracking-widest">Cài đặt API Key</h3>
                  <button onClick={() => setIsApiPanelOpen(false)} className="text-white/50 hover:text-white">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="relative">
                    <input 
                      type="password" 
                      value={manualApiKey}
                      onChange={(e) => setManualApiKey(e.target.value)}
                      placeholder="Nhập API Key của bạn..."
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-white/20 placeholder-white/40"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveApiKey} className="flex-1 bg-white text-indigo-600 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight hover:bg-indigo-50 transition-colors">Lưu Key</button>
                    <button onClick={() => { setManualApiKey(''); localStorage.removeItem('gemini_manual_api_key'); }} className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/60 hover:text-white transition-colors">Xóa</button>
                  </div>
                  <p className="text-[9px] text-indigo-200 leading-relaxed font-medium">Lưu ý: API Key sẽ được lưu an toàn tại bộ nhớ trình duyệt (localStorage) của bạn.</p>
                </div>
             </section>
           )}

           <section className="space-y-4">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-5 h-px bg-slate-200"></span>
                Thư viện giọng đọc
              </h2>
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="max-h-[350px] overflow-y-auto custom-scrollbar p-4">
                  <VoiceSelector selectedVoice={selectedVoice} onVoiceChange={setSelectedVoice} onPreview={handlePreviewVoice} previewingId={previewingId} />
                </div>
              </div>
           </section>
           
           <section className="space-y-4">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-5 h-px bg-slate-200"></span>
                Cấu hình chuyên sâu
              </h2>
              <ProsodyControls settings={settings} onChange={setSettings} />
           </section>

           {apiError && (
             <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 animate-in slide-in-from-bottom-2">
               <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               <p className="text-xs font-medium text-red-700 leading-relaxed">{apiError}</p>
             </div>
           )}
        </aside>

        {/* Cột Phải (8/12) */}
        <div className="lg:col-span-8 space-y-6">
          <section className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col min-h-[480px] overflow-hidden focus-within:ring-2 focus-within:ring-indigo-50 transition-all">
            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Trình biên tập nội dung</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold text-slate-400">{text.length.toLocaleString()} kí tự</span>
                <button onClick={() => setText('')} className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase transition-colors">Dọn sạch</button>
              </div>
            </div>
            
            <textarea
              className="w-full flex-1 p-8 outline-none text-xl text-slate-700 bg-white placeholder-slate-300 resize-none leading-relaxed custom-scrollbar"
              placeholder="Nhập hoặc dán nội dung vào đây..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            
            <div className="p-6 bg-slate-50/80 border-t border-slate-100">
              {!isGenerating ? (
                <button
                  onClick={handleGenerate}
                  disabled={!text.trim()}
                  className={`w-full py-5 rounded-2xl font-black text-lg shadow-xl transition-all flex items-center justify-center gap-3 ${
                    !text.trim() 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-[0.98] shadow-indigo-100'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  TẠO BẢN THU NGAY
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-end px-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-indigo-600 uppercase mb-1 flex items-center gap-2 italic">
                        Processing Segment {generationProgress.current}/{generationProgress.total}...
                      </span>
                      <span className="text-2xl font-black text-slate-800 tabular-nums">{Math.round(progress)}%</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-slate-400 uppercase mb-1">Dự báo xong sau</span>
                      <span className="text-xl font-black text-indigo-600">~{estimatedSeconds}s</span>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden p-0.5 shadow-inner">
                     <div className="h-full bg-indigo-600 rounded-full transition-all duration-700 shadow-sm" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {/* Player (2/5) */}
            <section className={`md:col-span-2 bg-slate-950 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden transition-all duration-500 border border-slate-900 ${currentAudio ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
              <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none">
                <div className="flex gap-1.5 items-end h-24">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className={`w-1.5 bg-indigo-500 rounded-full transition-all duration-300 ${isPlaying ? 'animate-pulse' : 'h-1'}`} style={{ height: isPlaying ? `${Math.random() * 80 + 20}%` : '4px' }} />
                  ))}
                </div>
              </div>
              <div className="relative z-10 space-y-8 text-center">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bản thu hiện thời</span>
                </div>
                
                <audio ref={audioRef} src={currentAudio || undefined} onTimeUpdate={onTimeUpdate} onLoadedMetadata={onLoadedMetadata} onEnded={onAudioEnded} className="hidden" />
                
                <div className="flex flex-col items-center gap-8">
                  <button onClick={togglePlay} className="w-20 h-20 bg-white text-slate-900 rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all">
                    {isPlaying ? <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                  </button>
                  <div className="w-full space-y-3">
                    <div className="flex justify-between text-[11px] font-bold text-indigo-400 tabular-nums">
                      <span>{formatTime(audioCurrentTime)}</span>
                      <span>{formatTime(audioDuration)}</span>
                    </div>
                    <input type="range" min="0" max={audioDuration || 0} step="0.1" value={audioCurrentTime} onChange={handleSeek} className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-indigo-400" />
                  </div>
                </div>
                
                <button 
                  onClick={() => history[0] && handleDownload(history[0])} 
                  className="w-full py-4 bg-white/5 hover:bg-indigo-600 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-white/10 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Tải Xuống .WAV
                </button>
              </div>
            </section>

            {/* History (3/5) */}
            <section className="md:col-span-3 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col min-h-[400px] overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-widest">Thư viện bản lưu</h3>
                <button onClick={() => {setHistory([]); setCurrentAudio(null)}} className="text-[9px] font-black text-slate-300 hover:text-red-500 uppercase transition-colors">Xóa hết</button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 py-16">
                    <svg className="w-8 h-8 opacity-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Trống</span>
                  </div>
                ) : (
                  history.map((item) => (
                    <div key={item.id} className={`p-4 rounded-2xl transition-all border ${currentAudio === item.audioUrl ? 'bg-indigo-50 border-indigo-100 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter bg-indigo-50 px-2 py-0.5 rounded-full">{item.voice}</span>
                        <span className="text-[9px] font-bold text-slate-400">{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-1 mb-4 italic">"{item.text}"</p>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => { 
                            if (item.audioUrl) {
                              setCurrentAudio(item.audioUrl); 
                              setIsPlaying(true); 
                              if (audioRef.current) { 
                                audioRef.current.src = item.audioUrl; 
                                audioRef.current.play(); 
                              } 
                            }
                          }} 
                          className="flex-1 py-2 bg-white rounded-xl text-[9px] font-black text-indigo-600 border border-slate-100 uppercase shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-slate-50"
                        >
                          Phát lại
                        </button>
                        <button onClick={() => handleDownload(item)} className="p-2 bg-white rounded-xl text-slate-400 border border-slate-100 hover:text-indigo-600 transition-all shadow-sm">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
      
      <footer className="max-w-7xl mx-auto w-full px-6 py-10 border-t border-slate-200 text-center">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Gemini AI Voice Studio &bull; Pro Studio 2025</p>
      </footer>
    </div>
  );
};

export default App;
