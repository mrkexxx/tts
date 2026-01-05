
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { VoiceName, ProsodySettings, HistoryItem, UsageStats } from './types';
import { VOICES } from './constants';
import VoiceSelector from './components/VoiceSelector';
import ProsodyControls from './components/ProsodyControls';
import { generateSpeech } from './services/geminiService';
import { decodeBase64, createWavBlob } from './utils/audioUtils';
import { GoogleGenAI } from "@google/genai";

const DAILY_LIMIT = 50000;
const MONTHLY_LIMIT = 1000000;
const MAX_CHARS_PER_PART = 10000;

const App: React.FC = () => {
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>(VoiceName.Kore);
  const [settings, setSettings] = useState<ProsodySettings>({
    speed: 1.0,
    pitch: 'Medium',
    volume: 1.0,
    emotion: 'Tự nhiên'
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [previewingId, setPreviewingId] = useState<VoiceName | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  const [manualApiKey, setManualApiKey] = useState('');
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [apiConnectionStatus, setApiConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [apiErrorMessage, setApiErrorMessage] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState<'checking' | 'connected' | 'not_found'>('checking');

  const [usage, setUsage] = useState<UsageStats>({
    daily: { count: 0, date: new Date().toISOString().split('T')[0] },
    monthly: { count: 0, month: new Date().toISOString().slice(0, 7) }
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(new Audio());

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_voice_api_key');
    if (savedKey) {
      setManualApiKey(savedKey);
      setApiKeyStatus('connected');
    } else if (process.env.API_KEY) {
      setApiKeyStatus('connected');
    } else {
      setApiKeyStatus('not_found');
    }
  }, []);

  useEffect(() => {
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
        const thisMonth = new Date().toISOString().slice(0, 7);

        const currentUsage = {
          daily: parsed.daily.date === today ? parsed.daily : { count: 0, date: today },
          monthly: parsed.monthly.month === thisMonth ? parsed.monthly : { count: 0, month: thisMonth }
        };
        setUsage(currentUsage);
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

  const splitText = (input: string, limit: number): string[] => {
    const chunks: string[] = [];
    let current = input.trim();
    while (current.length > 0) {
      if (current.length <= limit) {
        chunks.push(current);
        break;
      }
      let splitAt = current.lastIndexOf('. ', limit);
      if (splitAt === -1) splitAt = current.lastIndexOf('\n', limit);
      if (splitAt === -1) splitAt = current.lastIndexOf(' ', limit);
      if (splitAt === -1) splitAt = limit;
      chunks.push(current.substring(0, splitAt).trim());
      current = current.substring(splitAt).trim();
    }
    return chunks;
  };

  const handleSaveApiKey = () => {
    if (manualApiKey.trim()) {
      localStorage.setItem('gemini_voice_api_key', manualApiKey.trim());
      setApiKeyStatus('connected');
      handleTestConnection();
    } else {
      localStorage.removeItem('gemini_voice_api_key');
      setApiKeyStatus('not_found');
      setApiConnectionStatus('idle');
    }
  };

  const handleTestConnection = async () => {
    const keyToTest = manualApiKey.trim() || process.env.API_KEY;
    if (!keyToTest) {
      setApiConnectionStatus('error');
      setApiErrorMessage('Vui lòng nhập API Key');
      return;
    }

    setIsTestingKey(true);
    setApiConnectionStatus('idle');
    setApiErrorMessage('');
    
    try {
      const ai = new GoogleGenAI({ apiKey: keyToTest });
      await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "hi",
      });
      setApiConnectionStatus('success');
      setApiKeyStatus('connected');
    } catch (error: any) {
      console.error("Connection Error:", error);
      setApiConnectionStatus('error');
      setApiErrorMessage(error.message || 'Lỗi không xác định');
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleDownload = useCallback((item: HistoryItem) => {
    if (!item.blob) {
      alert("Dữ liệu âm thanh của bản ghi cũ đã hết hạn.");
      return;
    }
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
    const previewText = "Xin chào, tôi là AI Voice Studio.";
    
    setPreviewingId(voiceId);
    try {
      const base64Audio = await generateSpeech(previewText, voiceId, { ...settings, speed: 1.0, emotion: 'Tự nhiên' }, manualApiKey.trim());
      const audioBytes = decodeBase64(base64Audio);
      const wavBlob = createWavBlob(audioBytes);
      const url = URL.createObjectURL(wavBlob);
      if (previewAudioRef.current) {
        previewAudioRef.current.src = url;
        previewAudioRef.current.onended = () => { setPreviewingId(null); URL.revokeObjectURL(url); };
        previewAudioRef.current.play();
      }
      setUsage(prev => ({ daily: { ...prev.daily, count: prev.daily.count + previewText.length }, monthly: { ...prev.monthly, count: prev.monthly.count + previewText.length } }));
    } catch (error) {
      setPreviewingId(null);
      alert("Lỗi kết nối API. Vui lòng kiểm tra lại API Key.");
    }
  };

  const handleGenerate = async () => {
    if (!text.trim() || isGenerating) return;
    const textLen = text.length;
    if (usage.daily.count + textLen > DAILY_LIMIT) {
      alert(`Đã hết hạn mức hôm nay. Còn lại 0 ký tự.`);
      return;
    }

    const chunks = splitText(text, MAX_CHARS_PER_PART);
    setIsGenerating(true);
    setGenerationProgress({ current: 0, total: chunks.length });

    try {
      const newHistoryItems: HistoryItem[] = [];
      let totalUsageIncrement = 0;

      for (let i = 0; i < chunks.length; i++) {
        setGenerationProgress(prev => ({ ...prev, current: i + 1 }));
        const chunk = chunks[i];
        
        const base64Audio = await generateSpeech(chunk, selectedVoice, settings, manualApiKey.trim());
        const audioBytes = decodeBase64(base64Audio);
        const wavBlob = createWavBlob(audioBytes);
        const url = URL.createObjectURL(wavBlob);

        const newItem: HistoryItem = {
          id: `${Math.random().toString(36).substring(7)}-part${i}`,
          text: (chunks.length > 1 ? `[PHẦN ${i + 1}/${chunks.length}] ` : '') + chunk.slice(0, 60) + "...",
          timestamp: Date.now(),
          voice: selectedVoice,
          audioUrl: url,
          blob: wavBlob
        };
        
        newHistoryItems.push(newItem);
        totalUsageIncrement += chunk.length;

        if (i === chunks.length - 1) {
          setCurrentAudio(url);
          if (audioRef.current) { audioRef.current.src = url; audioRef.current.play(); }
        }
      }

      setHistory(prev => [...newHistoryItems.reverse(), ...prev].slice(0, 15));
      setUsage(prev => ({
        daily: { ...prev.daily, count: prev.daily.count + totalUsageIncrement },
        monthly: { ...prev.monthly, count: prev.monthly.count + totalUsageIncrement }
      }));

    } catch (error) {
      alert("Không thể tạo giọng nói. Vui lòng kiểm tra lại API Key hoặc nội dung văn bản.");
    } finally {
      setIsGenerating(false);
      setGenerationProgress({ current: 0, total: 0 });
    }
  };

  const dailyPercent = Math.min((usage.daily.count / DAILY_LIMIT) * 100, 100);

  return (
    <div className="min-h-screen bg-[#fcfcfd] flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-none">Gemini Voice</h1>
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Studio Pro (Smart Split)</span>
            </div>
          </div>
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 flex items-center gap-2"
          >
            <div className={`w-2 h-2 rounded-full ${apiKeyStatus === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-400'}`}></div>
            <span className="text-xs font-bold text-slate-600">Cài đặt API</span>
          </button>
        </div>
      </header>

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Cấu hình API Key</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Kết nối trực tiếp Google Gemini</p>
                 </div>
                 <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white rounded-full text-slate-400 shadow-sm border border-transparent hover:border-slate-100 transition-all">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                 </button>
              </div>
              
              <div className="p-8 space-y-8">
                 <div className="space-y-4">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Nhập Google Gemini API Key</label>
                    <div className="space-y-3">
                       <input 
                         type="text" 
                         value={manualApiKey}
                         onChange={(e) => setManualApiKey(e.target.value)}
                         placeholder="Nhập API Key tại đây..."
                         className="w-full py-4 px-5 bg-white border-2 border-slate-200 rounded-2xl text-black focus:outline-none focus:border-blue-500 transition-all shadow-sm"
                       />
                       <p className="text-[10px] text-slate-400 px-1 italic">API Key được lưu cục bộ trên trình duyệt (Local Storage).</p>
                    </div>
                    <div className="flex gap-3">
                       <button onClick={handleSaveApiKey} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95">Lưu & Kiểm tra</button>
                    </div>
                    {apiConnectionStatus === 'success' && (
                       <div className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2">
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-100">
                             <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                          </div>
                          <div><p className="text-sm font-black text-green-700">KẾT NỐI THÀNH CÔNG</p><p className="text-[10px] text-green-600 font-bold uppercase tracking-tight">API Key hợp lệ</p></div>
                       </div>
                    )}
                    {apiConnectionStatus === 'error' && (
                       <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2">
                          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center"><svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12"/></svg></div>
                          <div><p className="text-sm font-black text-red-700">LỖI KẾT NỐI</p><p className="text-[10px] text-red-600 font-bold uppercase line-clamp-2">{apiErrorMessage || 'API Key không hợp lệ'}</p></div>
                       </div>
                    )}
                 </div>
              </div>
              <div className="p-8 bg-slate-50/50 border-t border-slate-100">
                 <button onClick={() => setShowSettings(false)} className="w-full py-4 bg-white border-2 border-slate-200 rounded-2xl font-bold text-slate-700 hover:border-slate-800 hover:text-slate-800 transition-all shadow-sm active:scale-95">Hoàn tất & Đóng</button>
              </div>
           </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <section className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col">
            <div className="px-8 py-4 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Văn bản chuyển đổi</span>
                {text.length > MAX_CHARS_PER_PART && (
                  <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 animate-pulse">
                    TỰ ĐỘNG CHIA LÀM {Math.ceil(text.length / MAX_CHARS_PER_PART)} PHẦN
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black">{text.length.toLocaleString()} KÝ TỰ</div>
                <button onClick={() => setText('')} className="text-[10px] font-bold text-slate-300 hover:text-red-500 transition-colors uppercase">Xóa sạch</button>
              </div>
            </div>
            <textarea
              className="w-full h-80 p-8 focus:outline-none text-xl text-black bg-white placeholder-slate-300 resize-none leading-relaxed"
              placeholder="Nhập hoặc dán nội dung văn bản của bạn tại đây..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
            />
          </section>

          <section className="space-y-6">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Thư viện giọng đọc</h2>
            <VoiceSelector selectedVoice={selectedVoice} onVoiceChange={setSelectedVoice} onPreview={handlePreviewVoice} previewingId={previewingId} />
          </section>

          <section className="space-y-6">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Cấu hình âm sắc</h2>
            <ProsodyControls settings={settings} onChange={setSettings} />
          </section>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="sticky top-24 space-y-6">
            <button
              onClick={handleGenerate}
              disabled={!text.trim() || isGenerating}
              className={`w-full py-6 rounded-[1.5rem] font-black text-xl flex flex-col items-center justify-center gap-1 transition-all transform shadow-2xl ${
                !text.trim() || isGenerating ? 'bg-slate-100 text-slate-300 shadow-none' : 'bg-blue-600 hover:bg-blue-700 text-white hover:-translate-y-1 shadow-blue-200 active:scale-95'
              }`}
            >
              {isGenerating ? (
                <>
                  <span className="animate-pulse">ĐANG XỬ LÝ {generationProgress.total > 1 ? `PHẦN ${generationProgress.current}/${generationProgress.total}` : '...'}</span>
                  <span className="text-[10px] font-bold opacity-60 uppercase">Vui lòng đợi giây lát</span>
                </>
              ) : (
                'CHUYỂN SANG GIỌNG NÓI'
              )}
            </button>

            {currentAudio && (
              <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl animate-in zoom-in duration-300 border border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trình phát Audio</span>
                  <div className="px-3 py-1 bg-green-500 rounded-full text-[9px] font-black text-white uppercase animate-pulse">Sẵn sàng</div>
                </div>
                <audio ref={audioRef} controls src={currentAudio} className="w-full h-10 filter invert brightness-200 opacity-90" />
                <button onClick={() => history[0] && handleDownload(history[0])} className="w-full mt-6 py-3 bg-white/10 hover:bg-blue-600 rounded-xl text-xs font-bold transition-all border border-white/5">Tải bản thu (.WAV)</button>
              </div>
            )}

            <div className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                   <span className="text-[10px] font-black text-slate-400 uppercase">Hạn mức hằng ngày</span>
                   <span className="text-[10px] font-black text-slate-800">{(DAILY_LIMIT - usage.daily.count).toLocaleString()} CÒN LẠI</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                   <div className="bg-blue-600 h-full transition-all duration-1000" style={{ width: `${dailyPercent}%` }}></div>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col max-h-[500px]">
              <div className="px-8 py-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
                <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Dự án gần đây</h3>
                <button onClick={() => { setHistory([]); setCurrentAudio(null); }} className="text-[10px] font-black text-slate-300 hover:text-red-500 uppercase transition-colors">Xóa sạch</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-200"><p className="text-[10px] font-black uppercase tracking-tighter">Trống</p></div>
                ) : (
                  history.map((item) => (
                    <div key={item.id} className={`p-5 rounded-2xl transition-all group relative border ${currentAudio === item.audioUrl ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 hover:bg-white border-transparent hover:border-blue-100'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${item.text.includes('[PHẦN') ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                            {item.voice}
                          </span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-300">{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 italic mb-4">"{item.text}"</p>
                      <div className="flex gap-2">
                        <button onClick={() => { setCurrentAudio(item.audioUrl || null); if (audioRef.current && item.audioUrl) { audioRef.current.src = item.audioUrl; audioRef.current.play(); } }} className="flex-1 py-2 bg-white rounded-lg text-[9px] font-black text-blue-500 border border-slate-200 hover:border-blue-500 transition-all uppercase tracking-tighter">Nghe lại</button>
                        <button onClick={() => handleDownload(item)} className="px-4 py-2 bg-white rounded-lg text-[9px] font-black text-slate-500 border border-slate-200 hover:border-blue-500 hover:text-blue-500 transition-all uppercase tracking-tighter">Tải về</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto w-full px-4 py-12 border-t border-slate-50 text-center">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">Gemini AI Voice Studio &bull; Pro Edition (Standalone)</p>
      </footer>
    </div>
  );
};

export default App;
