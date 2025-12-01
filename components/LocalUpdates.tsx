
import React, { useState, useEffect } from 'react';
import { getLocalUpdates } from '../services/geminiService';
import { GeolocationState, GroundingChunk, Language } from '../types';
import { LoadingSpinner, SourceIcon, UpdatesIcon } from './Icons';
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
  const t = translations[language];

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

  return (
    <div className="animate-fadeIn">
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
  );
};

export default LocalUpdates;
