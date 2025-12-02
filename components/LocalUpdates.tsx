
import React, { useState, useEffect } from 'react';
import { getLocalUpdates } from '../services/geminiService';
import { GeolocationState, GroundingChunk, Language, UserTrafficReport } from '../types';
import { LoadingSpinner, SourceIcon, UpdatesIcon, ReportIcon, TrashIcon } from './Icons';
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

  const getSeverityColor = (sev: string) => {
    switch(sev) {
        case 'heavy': return 'text-red-400 border-red-900 bg-red-900/20';
        case 'accident': return 'text-red-500 border-red-900 bg-red-900/30 font-bold';
        case 'closure': return 'text-orange-500 border-orange-900 bg-orange-900/20';
        case 'moderate': return 'text-yellow-400 border-yellow-900 bg-yellow-900/20';
        default: return 'text-green-400 border-green-900 bg-green-900/20';
    }
  };

  return (
    <div className="animate-fadeIn space-y-8">
      
      {/* User Reports Section */}
      <div>
         <h2 className="text-xl font-bold mb-4 text-center flex items-center justify-center gap-2 text-cyan-400">
            <ReportIcon /> {t.yourReports}
         </h2>
         {userReports.length > 0 ? (
            <div className="space-y-3">
                {userReports.map(report => (
                    <div key={report.id} className={`p-3 rounded-lg border ${getSeverityColor(report.severity)} relative group`}>
                         <div className="flex justify-between items-start">
                             <div>
                                <span className="uppercase text-xs font-bold tracking-wider opacity-80">{report.severity}</span>
                                <h4 className="font-bold text-lg">{report.location}</h4>
                                <p className="text-sm mt-1 opacity-90">{report.description}</p>
                                <div className="text-xs mt-2 opacity-60">{new Date(report.timestamp).toLocaleString()}</div>
                             </div>
                             <button 
                                onClick={() => deleteReport(report.id)}
                                className="text-gray-400 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                             >
                                <TrashIcon />
                             </button>
                         </div>
                    </div>
                ))}
            </div>
         ) : (
             <p className="text-center text-gray-500 text-sm italic">{t.noUserReports}</p>
         )}
      </div>

      <hr className="border-gray-700" />

      {/* Global Updates Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4 text-center flex items-center justify-center gap-3">
            <UpdatesIcon /> {t.updatesHeader}
        </h2>
        <p className="text-center text-gray-400 mb-6">{t.updatesSub}</p>

        {loading ? (
            <div className="flex justify-center items-center h-40">
            <div className="text-center">
                <LoadingSpinner />
                <p className="mt-2 text-gray-400">{t.fetchingUpdates}</p>
            </div>
            </div>
        ) : updates ? (
            <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
            <div className="prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: updates.text.replace(/\n/g, '<br />') }} />
            <GroundingSources chunks={updates.groundingChunks} />
            </div>
        ) : (
            <p className="text-center text-red-400">{t.noUpdates}</p>
        )}
      </div>
    </div>
  );
};

export default LocalUpdates;
