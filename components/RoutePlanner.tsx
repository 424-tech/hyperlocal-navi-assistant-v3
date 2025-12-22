
import React, { useState, useEffect } from 'react';
import { planRoute } from '../services/geminiService';
import { GeolocationState, Landmark, Language } from '../types';
import { LoadingSpinner, SearchIcon, SpeakerIcon, StopIcon } from './Icons';
import { Map } from './Map';
import { translations } from '../translations';

const FloorDisplay = ({ floor, instruction }: { floor: number, instruction?: string }) => {
    if (floor === 0) return null;
    return (
        <div className="relative overflow-hidden mt-4 p-5 bg-slate-900 rounded-[2rem] text-white shadow-2xl border border-slate-800 animate-fadeIn">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <div className="relative z-10 flex items-center gap-4">
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Target</span>
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-2xl font-black shadow-lg shadow-blue-900/40">
                        {floor}
                    </div>
                </div>
                <div className="flex-1">
                    <h4 className="text-sm md:text-base font-black text-white">Vertical Navigation Active</h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed font-medium">{instruction || "Proceed to the main elevators."}</p>
                </div>
            </div>
            
            <div className="flex gap-1.5 mt-4">
                {[0,1,2,3,4,5].map(f => (
                    <div key={f} className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${f <= floor ? 'bg-blue-500 shadow-[0_0_8px_#3b82f6]' : 'bg-slate-800'}`}></div>
                ))}
            </div>
        </div>
    );
};

interface RoutePlannerProps {
  location: GeolocationState;
  manualLocation: string | null;
  language: Language;
}

const RoutePlanner: React.FC<RoutePlannerProps> = ({ location, manualLocation, language }) => {
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ text: string, audioWhisper: string, landmarks: Landmark[] } | null>(null);
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);
  const [isWhispering, setIsWhispering] = useState(false);
  const t = translations[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim() || loading) return;
    setLoading(true);
    
    const startLocation = manualLocation || (location.latitude ? 'Current Position' : 'SCB Main Entrance');
    
    try {
        const plan = await planRoute(startLocation, destination, "", location.latitude ? {latitude: location.latitude, longitude: location.longitude!} : null, language);
        // @ts-ignore
        setResult(plan);
        setIsPanelExpanded(false);
    } catch (err) { 
        console.error(err);
    } finally { setLoading(false); }
  };

  const handleWhisper = () => {
    if (!result?.audioWhisper) return;
    if (isWhispering) {
      window.speechSynthesis.cancel();
      setIsWhispering(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(result.audioWhisper);
    utterance.rate = 0.85;
    utterance.onend = () => setIsWhispering(false);
    window.speechSynthesis.speak(utterance);
    setIsWhispering(true);
  };

  useEffect(() => {
    return () => window.speechSynthesis.cancel();
  }, []);

  const targetFloor = result?.landmarks.find(l => l.floor && l.floor > 0);

  return (
    <div className="relative h-full w-full overflow-hidden flex flex-col bg-slate-50">
      {/* Background Map Layer */}
      <div className="absolute inset-0 z-0">
          <Map 
            userLocation={[location.latitude || 20.4814, location.longitude || 85.8808]} 
            landmarks={result?.landmarks}
            destination={result?.landmarks?.slice(-1)[0]?.position ? [result.landmarks.slice(-1)[0].position.lat, result.landmarks.slice(-1)[0].position.lng] : null}
          />
      </div>

      {/* Floating Control Sheet */}
      <div className={`absolute bottom-6 left-4 right-4 md:left-8 md:right-8 z-[40] bg-white/95 backdrop-blur-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] rounded-[2.5rem] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] border border-white/50 flex flex-col overflow-hidden ${
            isPanelExpanded ? 'max-h-[85%] md:max-h-[60%] h-auto' : 'h-[100px] md:h-[110px]'
        }`}
      >
          {/* Handlebar */}
          <div className="w-full flex justify-center py-4 md:py-5 cursor-pointer group flex-shrink-0" onClick={() => setIsPanelExpanded(!isPanelExpanded)}>
              <div className="w-16 h-1.5 bg-slate-200 rounded-full group-hover:bg-blue-400 transition-colors"></div>
          </div>

          <div className="px-6 pb-8 md:px-10 overflow-y-auto flex-grow no-scrollbar">
             {!result ? (
                <div className="space-y-6 md:space-y-8 animate-fadeIn">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-blue-600 text-white rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-blue-200 flex-shrink-0">
                            <span className="material-symbols-outlined text-[28px]">search</span>
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none">{t.planRouteTitle}</h2>
                            <p className="text-[10px] md:text-xs text-slate-400 font-black uppercase tracking-widest mt-1.5">Stardust Engine v2.5</p>
                        </div>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="relative flex gap-3 flex-shrink-0 pb-2">
                        <input 
                            type="text" 
                            value={destination} 
                            onChange={e => setDestination(e.target.value)} 
                            placeholder={t.destPlace} 
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 md:py-5 text-base md:text-lg outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-800 placeholder:text-slate-400"
                        />
                        <button 
                            type="submit" 
                            disabled={loading || !destination.trim()} 
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white font-black w-16 md:w-20 rounded-2xl flex justify-center items-center transition-all shadow-xl active:scale-95 flex-shrink-0"
                        >
                            {loading ? <LoadingSpinner /> : <span className="material-symbols-outlined text-[24px]">arrow_forward</span>}
                        </button>
                    </form>
                </div>
             ) : (
                <div className="space-y-6 animate-slideUp">
                    <div className="flex justify-between items-center bg-slate-50 p-2 rounded-2xl">
                        <div className="flex items-center gap-2 ml-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Waypoints</span>
                        </div>
                        <button 
                            onClick={() => { setResult(null); setIsPanelExpanded(true); setDestination(''); window.speechSynthesis.cancel(); }} 
                            className="text-white font-black text-[10px] bg-slate-900 px-5 py-2.5 rounded-xl hover:bg-black transition-all uppercase tracking-widest"
                        >
                            Reset
                        </button>
                    </div>

                    <button 
                        onClick={handleWhisper}
                        className={`w-full p-5 rounded-[1.75rem] flex items-center justify-between transition-all duration-300 ${isWhispering ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isWhispering ? 'bg-white/20' : 'bg-blue-100'}`}>
                                {isWhispering ? <StopIcon /> : <SpeakerIcon />}
                            </div>
                            <div className="text-left">
                                <span className="text-sm font-black uppercase tracking-tight block">Voice Assistant</span>
                                <span className="text-[10px] md:text-xs opacity-80 font-bold">{isWhispering ? "Whispering instructions..." : "Start guided navigation"}</span>
                            </div>
                        </div>
                        {isWhispering && (
                            <div className="flex gap-1 items-end h-5 px-2">
                                {[1,2,3,4,5].map(i => <div key={i} className={`w-1.5 bg-white rounded-full animate-bounce`} style={{animationDelay: `${i*0.1}s`, height: `${40 + Math.random()*60}%`}}></div>)}
                            </div>
                        )}
                    </button>
                    
                    {targetFloor && <FloorDisplay floor={targetFloor.floor!} instruction={targetFloor.internalLandmark} />}

                    <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
                        <p className="text-slate-700 leading-relaxed font-black text-sm md:text-base italic">
                            "{result.text}"
                        </p>
                    </div>
                </div>
             )}
          </div>
      </div>
      
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};

export default RoutePlanner;
