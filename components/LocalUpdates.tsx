import React, { useState, useEffect } from 'react';
import { getLocalUpdates } from '../services/geminiService';
import { GeolocationState, GroundingChunk, Language, UserTrafficReport } from '../types';
import { LoadingSpinner, ReportIcon, UserIcon, SpeakerIcon, StopIcon, SourceIcon } from './Icons';
import { translations } from '../translations';
import { db } from '../services/firebase';
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";

interface LocalUpdatesProps {
  location: GeolocationState;
  manualLocation: string | null;
  language: Language;
}

const LocalUpdates: React.FC<LocalUpdatesProps> = ({ location, manualLocation, language }) => {
  const [loading, setLoading] = useState(true);
  const [updates, setUpdates] = useState<{ text: string; groundingChunks: GroundingChunk[] } | null>(null);
  const [userReports, setUserReports] = useState<UserTrafficReport[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const t = translations[language];

  // Load User Reports from Firebase (Real-time)
  useEffect(() => {
    if (!db) {
        // Fallback or empty if DB not connected
        return;
    }

    // Query the last 20 reports, newest first
    const q = query(collection(db, "reports"), orderBy("timestamp", "desc"), limit(20));
    
    // Subscribe to updates
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const reports: UserTrafficReport[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            reports.push({
                id: doc.id,
                // Convert Firestore timestamp to JS milliseconds
                timestamp: data.timestamp?.toMillis() || Date.now(), 
                severity: data.severity,
                location: data.location,
                description: data.description,
                originalText: data.originalText,
                reporterName: data.reporterName,
                verificationCount: data.verificationCount
            });
        });
        setUserReports(reports);
    });

    return () => unsubscribe();
  }, []);

  // Fetch API Updates (Gemini)
  useEffect(() => {
    const fetchUpdates = async () => {
      setLoading(true);
      const locationToFetch = manualLocation 
          || (location.latitude && location.longitude ? { latitude: location.latitude, longitude: location.longitude } : null);
      const result = await getLocalUpdates(locationToFetch, language);
      setUpdates(result);
      setLoading(false);
    };

    fetchUpdates();
  }, [location.latitude, location.longitude, manualLocation, language]);

  // Handle Text-to-Speech
  const handleSpeak = () => {
    if (!updates || !updates.text) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(updates.text);
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.includes('IN') || v.lang.includes('hi'));
    if (preferredVoice) utterance.voice = preferredVoice;
    
    utterance.rate = 0.9; 
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const getTimeAgo = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 60000);
    if (diff < 1) return t.justNow;
    if (diff < 60) return `${diff} ${t.minsAgo}`;
    const hours = Math.floor(diff / 60);
    return `${hours} ${t.hrsAgo}`;
  };

  const getSeverityStyle = (sev: string) => {
    switch(sev) {
        case 'heavy': return { 
            border: 'border-l-4 border-l-red-500', 
            badge: 'bg-red-100 text-red-800', 
            icon: '🔴' 
        };
        case 'accident': return { 
            border: 'border-l-4 border-l-red-600', 
            badge: 'bg-red-600 text-white font-bold animate-pulse', 
            icon: '⚠️' 
        };
        case 'closure': return { 
            border: 'border-l-4 border-l-orange-500', 
            badge: 'bg-orange-100 text-orange-800', 
            icon: '⛔' 
        };
        case 'moderate': return { 
            border: 'border-l-4 border-l-yellow-500', 
            badge: 'bg-yellow-100 text-yellow-800', 
            icon: '🟠' 
        };
        default: return { 
            border: 'border-l-4 border-l-green-500', 
            badge: 'bg-green-100 text-green-800', 
            icon: '🟢' 
        };
    }
  };

  const validChunks = updates?.groundingChunks?.filter(chunk => chunk.web?.uri || chunk.maps?.uri) || [];

  return (
    <div className="animate-fadeIn space-y-6 pb-20 max-w-2xl mx-auto">
      
      {/* 1. THE TICKER */}
      <div className="bg-red-50 border-y border-red-200 overflow-hidden relative h-10 flex items-center">
         <div className="whitespace-nowrap animate-marquee text-sm font-bold text-red-700 px-4">
             ⚠️  {loading ? t.fetchingUpdates : (userReports.length > 0 ? `${t.statusCritical}: ${userReports[0].description}` : t.noUpdates)}
         </div>
      </div>
      <style>{`
        .animate-marquee { display: inline-block; animation: marquee 15s linear infinite; }
        @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
      `}</style>

      {/* 2. DAILY BRIEFING CARD */}
      <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-md">
         <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
             <div>
                 <h2 className="text-xl font-bold text-blue-900">
                     {t.updatesHeader}
                 </h2>
                 <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">{new Date().toLocaleDateString()} • {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
             </div>
             <button 
                onClick={handleSpeak}
                className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition-all border shadow-sm ${isSpeaking ? 'bg-red-500 border-red-600 text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
             >
                 {isSpeaking ? <><StopIcon /> {t.stopReading}</> : <><SpeakerIcon /> {t.readAloud}</>}
             </button>
         </div>

         <div className="p-6 min-h-[140px]">
             {loading ? (
                <div className="flex flex-col items-center justify-center py-6">
                    <LoadingSpinner />
                    <p className="mt-3 text-sm text-slate-500 font-medium animate-pulse">{t.fetchingUpdates}</p>
                </div>
             ) : updates ? (
                <div>
                     <div className="prose prose-slate prose-p:text-slate-800 prose-p:font-medium prose-p:leading-relaxed prose-headings:text-blue-800 max-w-none">
                         <div className="whitespace-pre-wrap">{updates.text}</div>
                     </div>
                     
                     {validChunks.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                             <span className="text-xs text-slate-400 uppercase tracking-wide font-bold flex items-center gap-1"><SourceIcon /> Sources:</span>
                             {validChunks.map((chunk, i) => (
                                 <a 
                                    key={i} 
                                    href={chunk.web?.uri || chunk.maps?.uri} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 hover:border-blue-300 transition-colors truncate max-w-[150px] font-medium"
                                 >
                                     {chunk.web?.title || chunk.maps?.title || 'External Link'}
                                 </a>
                             ))}
                        </div>
                     )}
                </div>
             ) : (
                 <p className="text-slate-400 italic text-center py-4">{t.noUpdates}</p>
             )}
         </div>
      </div>

      {/* 3. CAMPUS WISDOM */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4 border-b border-blue-200 pb-2">
              {t.wisdomHeader}
          </h3>
          <div className="space-y-4">
              <div className="flex gap-4 items-start">
                  <span className="text-xl bg-white p-2 rounded-full shadow-sm">🩺</span>
                  <p className="text-sm text-slate-700 font-medium leading-relaxed pt-1">{t.wisdomOPD}</p>
              </div>
              <div className="flex gap-4 items-start">
                  <span className="text-xl bg-white p-2 rounded-full shadow-sm">🚑</span>
                  <p className="text-sm text-slate-700 font-medium leading-relaxed pt-1">{t.wisdomEmergency}</p>
              </div>
              <div className="flex gap-4 items-start">
                  <span className="text-xl bg-white p-2 rounded-full shadow-sm">🅿️</span>
                  <p className="text-sm text-slate-700 font-medium leading-relaxed pt-1">{t.wisdomParking}</p>
              </div>
          </div>
      </div>

      {/* 4. COMMUNITY REPORTS */}
      <div>
         <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 pl-1 mt-8">
             {t.yourReports}
         </h3>
         
         {!db && (
             <div className="mb-4 bg-orange-50 text-orange-800 text-xs p-3 rounded-lg border border-orange-200">
                 Database not connected. Reports are currently disabled.
             </div>
         )}

         {userReports.length > 0 ? (
            <div className="space-y-3">
                {userReports.map(report => {
                    const style = getSeverityStyle(report.severity);
                    return (
                        <div key={report.id} className={`bg-white rounded-lg p-4 shadow-sm border border-slate-200 ${style.border} relative`}>
                             <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                     <span className="text-xl">{style.icon}</span>
                                     <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${style.badge}`}>
                                         {report.severity}
                                     </span>
                                </div>
                                <span className="text-xs text-slate-400 font-mono font-medium">
                                    {getTimeAgo(report.timestamp)}
                                </span>
                             </div>

                             <h4 className="font-bold text-slate-900 mt-2 text-lg">{report.location}</h4>
                             <p className="text-slate-600 text-sm mt-1 leading-snug">{report.description}</p>
                             
                             <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs border border-slate-200">
                                    <UserIcon />
                                </div>
                                <span className="text-xs text-blue-600 font-bold">{report.reporterName}</span>
                             </div>
                        </div>
                    );
                })}
            </div>
         ) : (
             <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                 <div className="text-slate-300 mb-2"><ReportIcon /></div>
                 <p className="text-slate-500 text-sm font-medium">{t.noUserReports}</p>
             </div>
         )}
      </div>
    </div>
  );
};

export default LocalUpdates;