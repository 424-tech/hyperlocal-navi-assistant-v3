
import React, { useState, useEffect } from 'react';
import { planRoute, planDayItinerary } from '../services/geminiService';
import { GeolocationState, GroundingChunk, RouteStep, Landmark, TrafficSegment, ItineraryLocation, ItineraryRoute, Language } from '../types';
import { LoadingSpinner, SearchIcon, SourceIcon, ArrowLeftIcon, ArrowRightIcon, SaveIcon, FolderIcon, TrashIcon } from './Icons';
import { Map } from './Map';
import { translations } from '../translations';

interface RoutePlannerProps {
  location: GeolocationState;
  manualLocation: string | null;
  language: Language;
}

const GroundingSources: React.FC<{ chunks: GroundingChunk[] }> = ({ chunks }) => {
  if (!chunks || chunks.length === 0) return null;

  const validChunks = chunks.filter(chunk => chunk.web?.uri || chunk.maps?.uri);

  return (
    <div className="mt-4 pt-4 border-t border-slate-200">
      <h4 className="font-semibold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wide"><SourceIcon /> Sources:</h4>
      <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-slate-600">
        {validChunks.map((chunk, index) => {
          const source = chunk.web || chunk.maps;
          if (!source) return null;
          return (
            <li key={index}>
              <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline hover:text-blue-800">
                {source.title || 'Source link'}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

type PlannerMode = 'route' | 'dayPlan';

type ResultState = {
  // Standard Route
  text: string;
  groundingChunks: GroundingChunk[];
  steps: RouteStep[];
  landmarks: Landmark[];
  trafficSegments: TrafficSegment[];

  // Day Plan
  locations: ItineraryLocation[];
  lines: ItineraryRoute[];
  summaryText: string;
};

// Saved Item Structure
interface SavedItem {
  id: string;
  name: string;
  timestamp: number;
  mode: PlannerMode;
  result: ResultState;
  destination?: string; // context for routes
  notes?: string;       // context for routes
  dayPlanPrompt?: string; // context for day plans
}

interface NavButtonProps {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}

const NavButton: React.FC<NavButtonProps> = ({ onClick, disabled, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="bg-white border border-slate-300 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-700 font-bold py-2 px-4 rounded-lg flex items-center justify-center transition-colors shadow-sm"
  >
    {children}
  </button>
);

const RoutePlanner: React.FC<RoutePlannerProps> = ({ location, manualLocation, language }) => {
  const [mode, setMode] = useState<PlannerMode>('route');
  const [destination, setDestination] = useState('');
  const [notes, setNotes] = useState('');
  const [dayPlanPrompt, setDayPlanPrompt] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [activeItineraryIndex, setActiveItineraryIndex] = useState<number | null>(null);

  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);

  const t = translations[language];

  // Load saved items on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('scb_navi_saved_routes');
      if (stored) {
        setSavedItems(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load saved routes:", e);
    }
  }, []);

  const handleSave = () => {
    if (!result) return;

    const defaultName = mode === 'route' ? `Route to ${destination}` : `Day Plan - ${new Date().toLocaleDateString()}`;
    const name = window.prompt("Enter a name for this plan:", defaultName);

    if (name) {
      const newItem: SavedItem = {
        id: Date.now().toString(),
        name,
        timestamp: Date.now(),
        mode,
        result,
        destination: mode === 'route' ? destination : undefined,
        notes: mode === 'route' ? notes : undefined,
        dayPlanPrompt: mode === 'dayPlan' ? dayPlanPrompt : undefined
      };

      const updatedItems = [newItem, ...savedItems];
      setSavedItems(updatedItems);
      localStorage.setItem('scb_navi_saved_routes', JSON.stringify(updatedItems));
      alert("Plan saved successfully!");
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this saved plan?")) {
      const updatedItems = savedItems.filter(item => item.id !== id);
      setSavedItems(updatedItems);
      localStorage.setItem('scb_navi_saved_routes', JSON.stringify(updatedItems));
    }
  };

  const handleLoad = (item: SavedItem) => {
    setMode(item.mode);
    setResult(item.result);
    // Restore inputs context
    if (item.mode === 'route') {
      setDestination(item.destination || '');
      setNotes(item.notes || '');
    } else {
      setDayPlanPrompt(item.dayPlanPrompt || '');
    }
    // Reset view states
    setCurrentStepIndex(0);
    setActiveItineraryIndex(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    setCurrentStepIndex(0);
    setActiveItineraryIndex(null);

    const startLocation = manualLocation
      || (location.latitude && location.longitude ? 'My Current Location' : 'SCB Medical College Main Gate');

    try {
      if (mode === 'route') {
        if (!destination.trim()) {
          setError("Please enter a destination.");
          setLoading(false);
          return;
        }
        const plan = await planRoute(startLocation, destination, notes, location.latitude && location.longitude ? { latitude: location.latitude, longitude: location.longitude } : null, language);
        setResult({
          ...plan,
          locations: [],
          lines: [],
          summaryText: ''
        });
      } else {
        if (!dayPlanPrompt.trim()) {
          setError("Please describe your day.");
          setLoading(false);
          return;
        }
        const plan = await planDayItinerary(dayPlanPrompt, language);
        setResult({
          text: '',
          groundingChunks: [],
          steps: [],
          landmarks: [],
          trafficSegments: [],
          ...plan
        });
      }
    } catch (err) {
      setError("Failed to generate plan. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const userLocation: [number, number] = location.latitude && location.longitude
    ? [location.latitude, location.longitude]
    : [20.4795, 85.8778]; // Fallback to Cuttack

  return (
    <div className="animate-fadeIn max-w-2xl mx-auto">
      <div className="flex justify-center mb-6 space-x-2 bg-slate-200 p-1 rounded-full w-fit mx-auto">
        <button
          onClick={() => { setMode('route'); setResult(null); }}
          className={`px-5 py-2 rounded-full font-bold text-sm transition-all ${mode === 'route' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {t.navMode}
        </button>
        <button
          onClick={() => { setMode('dayPlan'); setResult(null); }}
          className={`px-5 py-2 rounded-full font-bold text-sm transition-all ${mode === 'dayPlan' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {t.dayMode}
        </button>
      </div>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">
          {mode === 'route' ? t.campusNavTitle : t.itineraryTitle}
        </h2>
        <p className="text-slate-500 mt-1">
          {mode === 'route' ? t.navSub : t.daySub}
        </p>
      </div>

      {!result && (
        <>
          <form onSubmit={handleSubmit} className="space-y-4 transition-all duration-500 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            {mode === 'route' ? (
              <>
                <div>
                  <label htmlFor="destination" className="block text-sm font-semibold text-slate-700 mb-1">{t.destLabel}</label>
                  <input
                    type="text"
                    id="destination"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder={t.destPlace}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-slate-400"
                  />
                </div>
                <div>
                  <label htmlFor="notes" className="block text-sm font-semibold text-slate-700 mb-1">{t.notesLabel}</label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t.notesPlace}
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-slate-400"
                  />
                </div>
              </>
            ) : (
              <div>
                <label htmlFor="dayPlan" className="block text-sm font-semibold text-slate-700 mb-1">{t.dayPromptLabel}</label>
                <textarea
                  id="dayPlan"
                  value={dayPlanPrompt}
                  onChange={(e) => setDayPlanPrompt(e.target.value)}
                  placeholder={t.dayPromptPlace}
                  rows={5}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-slate-400"
                />
              </div>
            )}

            {error && <p className="text-red-600 bg-red-50 p-3 rounded-lg text-sm border border-red-100">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center transition-all shadow-md hover:shadow-lg disabled:bg-slate-300 disabled:shadow-none"
            >
              {loading ? <LoadingSpinner /> : <><SearchIcon /> <span className="ml-2">{mode === 'route' ? t.findPath : t.genPlan}</span></>}
            </button>
          </form>

          {/* Saved Plans List */}
          {savedItems.length > 0 && !loading && (
            <div className="mt-8 pt-6 border-t border-slate-200">
              <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                <FolderIcon /> {t.savedPlans}
              </h3>
              <div className="space-y-3">
                {savedItems.map(item => (
                  <div key={item.id} onClick={() => handleLoad(item)} className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center cursor-pointer transition-all hover:shadow-md hover:border-blue-300 group">
                    <div>
                      <div className="font-bold text-slate-800">{item.name}</div>
                      <div className="text-xs text-slate-500 flex gap-2 mt-1">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium capitalize">{item.mode === 'route' ? 'Navigation' : 'Itinerary'}</span>
                        <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Delete"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {loading && (
        <div className="text-center mt-8 p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
          <p className="font-bold text-slate-800">{t.analyzing}</p>
          <p className="text-sm text-slate-500 mt-2">{t.connecting}</p>
        </div>
      )}

      {result && (
        <div className="mt-6 animate-fadeIn space-y-4">

          <Map
            userLocation={userLocation}
            userLocationAccuracy={location.accuracy}
            steps={result.steps}
            landmarks={result.landmarks}
            traffic={result.trafficSegments}
            currentStepIndex={currentStepIndex}
            itineraryLocations={result.locations}
            itineraryLines={result.lines}
            highlightedItineraryIndex={activeItineraryIndex}
          />

          {mode === 'route' && result.steps.length > 0 && (
            <div className="p-5 bg-white border border-slate-200 shadow-md rounded-xl text-center relative z-10">
              <p className="font-bold text-sm uppercase tracking-wide text-blue-600 mb-1">{t.step} {currentStepIndex + 1} / {result.steps.length}</p>
              <p className="text-slate-800 text-xl font-medium leading-relaxed">{result.steps[currentStepIndex].description}</p>
              <div className="flex justify-between mt-6">
                <NavButton onClick={() => setCurrentStepIndex(i => Math.max(0, i - 1))} disabled={currentStepIndex === 0}>
                  <ArrowLeftIcon /><span className="ml-2">{t.prev}</span>
                </NavButton>
                <NavButton onClick={() => setCurrentStepIndex(i => Math.min(result.steps.length - 1, i + 1))} disabled={currentStepIndex === result.steps.length - 1}>
                  <span className="mr-2">{t.next}</span><ArrowRightIcon />
                </NavButton>
              </div>
            </div>
          )}

          {mode === 'dayPlan' && result.locations.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
              <h3 className="text-xl font-bold text-blue-800 border-b border-slate-100 pb-3 mb-4">{t.yourItinerary}</h3>
              <div className="space-y-0 relative">
                {/* Vertical line connector */}
                <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-200"></div>

                {result.locations.map((loc, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveItineraryIndex(idx)}
                    className={`relative pl-10 py-3 cursor-pointer transition-all rounded-r-lg ${activeItineraryIndex === idx ? 'bg-blue-50 border-l-4 border-blue-500 -ml-[2px]' : 'hover:bg-slate-50'}`}
                  >
                    {/* Dot */}
                    <div className={`absolute left-2.5 top-5 w-3 h-3 rounded-full border-2 border-white shadow-sm z-10 ${activeItineraryIndex === idx ? 'bg-blue-600 scale-125' : 'bg-slate-400'}`}></div>

                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-800 text-lg">{loc.name}</h4>
                        <p className="text-sm text-slate-500">{loc.description}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <span className="block text-blue-600 font-mono font-bold bg-blue-50 px-2 py-0.5 rounded text-sm">{loc.time}</span>
                        <span className="block text-xs text-slate-400 mt-1">{loc.duration}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {result.summaryText && (
                <div className="mt-6 p-4 bg-slate-50 rounded-lg text-sm text-slate-600 italic border-l-4 border-slate-300">
                  {result.summaryText}
                </div>
              )}
            </div>
          )}

          <details className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <summary className="cursor-pointer p-4 text-slate-700 font-bold bg-slate-50 hover:bg-slate-100 transition-colors flex justify-between items-center">
              <span>{mode === 'route' ? t.viewSummary : t.viewPlanText}</span>
              <span className="text-slate-400 text-xs">▼</span>
            </summary>
            <div className="p-5 border-t border-slate-200">
              <div className="prose prose-slate prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: (result.text || result.summaryText).replace(/\n/g, '<br />') }} />
              <GroundingSources chunks={result.groundingChunks} />
            </div>
          </details>

          <div className="flex space-x-3 pt-4">
            <button
              onClick={() => setResult(null)}
              className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-3 px-4 rounded-xl flex items-center justify-center transition-colors shadow-sm"
            >
              {mode === 'route' ? t.planNew : t.createNew}
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center transition-colors shadow-md"
            >
              <SaveIcon /> <span className="ml-2">{t.savePlan}</span>
            </button>
          </div>
        </div>
      )}

      {result && mode === 'route' && result.steps.length === 0 && !loading && (
        <div className="mt-8 text-center">
          <p className="text-orange-600 font-medium bg-orange-50 p-2 rounded-lg inline-block">Could not generate an interactive route. Displaying summary instead.</p>
          <div className="mt-4 p-5 bg-white border border-slate-200 shadow-sm rounded-xl text-left">
            <div className="prose prose-slate prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: (result.text || result.summaryText || '').replace(/\n/g, '<br />') }} />
            <GroundingSources chunks={result.groundingChunks} />
          </div>
          <button
            onClick={() => setResult(null)}
            className="mt-6 w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 px-4 rounded-xl transition-colors"
          >
            Start Over
          </button>
        </div>
      )}
    </div>
  );
};

export default RoutePlanner;
