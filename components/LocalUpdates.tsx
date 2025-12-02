
import React, { useState, useEffect } from 'react';
import { getLocalUpdates } from '../services/geminiService';
import { GeolocationState, GroundingChunk, Language, UserTrafficReport } from '../types';
import { LoadingSpinner, SourceIcon, UpdatesIcon, ReportIcon, TrashIcon, UserIcon } from './Icons';
import { translations } from '../translations';

interface LocalUpdatesProps {
  location: GeolocationState;
  manualLocation: string | null;
  language: Language;
}

const GroundingSources: React.FC<{ chunks: GroundingChunk[] }> = ({ chunks }) => {
  if (chunks.length === 0) return null;

  const validChunks = chunks.filter(chunk => chunk.web?.uri);

  return (
    <div className="mt-4 pt-4 border-t border-gray-700">
      <h4 className="font-semibold text-gray-300 flex items-center gap-2"><SourceIcon /> Sources:</h4>
      <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
        {validChunks.map((chunk, index) => {
          if (!chunk.web) return null;
          return (
            <li key={index}>
              <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                {chunk.web.title || 'Source link'}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const LocalUpdates: React.FC<LocalUpdatesProps> = ({ location, manualLocation, language }) => {
  const [loading, setLoading] = useState(true);
  const [updates, setUpdates] = useState<{ text: string; groundingChunks: GroundingChunk[] } | null>(null);
  const [userReports, setUserReports] = useState<UserTrafficReport[]>([]);
  const t = translations[language];

  // Load User Reports immediately
  useEffect(() => {
    try {
        const stored = localStorage.getItem('scb_navi_user_reports');
        if (stored) {
            setUserReports(JSON.parse(stored));
        }
    } catch(e) { console.error("Error loading reports", e); }
  }, []);

  // Fetch API Updates
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

  const deleteReport = (id: string) => {
    const updated = userReports.filter(r => r.id !== id);
    setUserReports(updated);
    localStorage.setItem('scb_navi_user_reports', JSON.stringify(updated));
  };

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
            badge: 'bg-red-900 text-red-200', 
            icon: '🔴' 
        };
        case 'accident': return { 
            border: 'border-l-4 border-l-red-600 animate-pulse', 
            badge: 'bg-red-600 text-white font-bold', 
            icon: '⚠️' 
        };
        case 'closure': return { 
            border: 'border-l-4 border-l-orange-500', 
            badge: 'bg-orange-600 text-white', 
            icon: '⛔' 
        };
        case 'moderate': return { 
            border: 'border-l-4 border-l-yellow-500', 
            badge: 'bg-yellow-900 text-yellow-200', 
            icon: '🟠' 
        };
        default: return { 
            border: 'border-l-4 border-l-green-500', 
            badge: 'bg-green-900 text-green-200', 
            icon: '🟢' 
        };
    }
  };

  return (
    <div className="animate-fadeIn space-y-8 pb-20">
      
      {/* Community Dashboard Section */}
      <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700">
         <h2 className="text-xl font-bold mb-6 text-center flex items-center justify-center gap-2 text-cyan-400 uppercase tracking-widest">
            <ReportIcon /> {t.yourReports}
         </h2>
         
         {userReports.length > 0 ? (
            <div className="space-y-4">
                {userReports.map(report => {
                    const style = getSeverityStyle(report.severity);
                    return (
                        <div key={report.id} className={`bg-gray-900 rounded-r-lg p-4 shadow-lg ${style.border} relative group`}>
                             <div className="flex justify-between items-start mb-2">
                                <div className={`text-xs px-2 py-1 rounded uppercase tracking-wider ${style.badge}`}>
                                    {style.icon} {report.severity}
                                </div>
                                <span className="text-xs text-gray-500 font-mono">
                                    {getTimeAgo(report.timestamp)}
                                </span>
                             </div>

                             <h4 className="font-bold text-lg text-white mb-1">{report.location}</h4>
                             <p className="text-gray-300 text-sm leading-relaxed mb-3">{report.description}</p>
                             
                             <div className="flex justify-between items-center pt-3 border-t border-gray-800">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs">
                                        <UserIcon />
                                    </div>
                                    <div className="text-xs text-cyan-400 font-semibold">
                                        {report.reporterName || 'Anonymous'}
                                    </div>
                                </div>
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                    <span>✓ {t.verifiedBy} <strong>{report.verificationCount || 1}</strong> {t.users}</span>
                                </div>
                             </div>

                             {/* Delete Button (Only visible on hover/touch) */}
                             <button 
                                onClick={() => deleteReport(report.id)}
                                className="absolute top-2 right-2 text-gray-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete Report"
                             >
                                <TrashIcon />
                             </button>
                        </div>
                    );
                })}
            </div>
         ) : (
             <div className="text-center py-8 bg-gray-900/50 rounded-lg border border-dashed border-gray-700">
                 <p className="text-gray-500 text-sm italic">{t.noUserReports}</p>
             </div>
         )}
      </div>

      <hr className="border-gray-800" />

      {/* Global AI Updates Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4 text-center flex items-center justify-center gap-3 text-gray-200">
            <UpdatesIcon /> {t.updatesHeader}
        </h2>
        <p className="text-center text-gray-500 text-sm mb-6">{t.updatesSub}</p>

        {loading ? (
            <div className="flex justify-center items-center h-40">
            <div className="text-center">
                <LoadingSpinner />
                <p className="mt-2 text-gray-400 animate-pulse">{t.fetchingUpdates}</p>
            </div>
            </div>
        ) : updates ? (
            <div className="p-5 bg-gray-800 border border-gray-700 rounded-lg shadow-inner">
                <div className="prose prose-invert prose-sm max-w-none leading-relaxed text-gray-300" dangerouslySetInnerHTML={{ __html: updates.text.replace(/\n/g, '<br />') }} />
                <GroundingSources chunks={updates.groundingChunks} />
            </div>
        ) : (
            <p className="text-center text-gray-500 bg-gray-800 p-4 rounded">{t.noUpdates}</p>
        )}
      </div>
    </div>
  );
};

export default LocalUpdates;
