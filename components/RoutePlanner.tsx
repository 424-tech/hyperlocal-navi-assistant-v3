
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
    <div className="mt-4 pt-4 border-t border-gray-700">
      <h4 className="font-semibold text-gray-300 flex items-center gap-2"><SourceIcon /> Sources:</h4>
      <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
        {validChunks.map((chunk, index) => {
          const source = chunk.web || chunk.maps;
          if (!source) return null;
          return (
            <li key={index}>
              <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
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
    className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md flex items-center justify-center transition-colors"
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
            const plan = await planRoute(startLocation, destination, notes, location.latitude && location.longitude ? {latitude: location.latitude, longitude: location.longitude} : null, language);
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
    <div className="animate-fadeIn">
      <div className="flex justify-center mb-6 space-x-4">
        <button
            onClick={() => { setMode('route'); setResult(null); }}
            className={`px-4 py-2 rounded-full font-bold transition-all ${mode === 'route' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
        >
            {t.navMode}
        </button>
        <button
            onClick={() => { setMode('dayPlan'); setResult(null); }}
            className={`px-4 py-2 rounded-full font-bold transition-all ${mode === 'dayPlan' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
        >
            {t.dayMode}
        </button>
      </div>

      <h2 className="text-2xl font-bold mb-4 text-center">
          {mode === 'route' ? t.campusNavTitle : t.itineraryTitle}
      </h2>
      <p className="text-center text-gray-400 mb-6">
          {mode === 'route' ? t.navSub : t.daySub}
      </p>
      
      {!result && (
        <>
          <form onSubmit={handleSubmit} className="space-y-4 transition-all duration-500">
            {mode === 'route' ? (
                <>
                  <div>
                      <label htmlFor="destination" className="block text-sm font-medium text-gray-300 mb-1">{t.destLabel}</label>
                      <input
                      type="text"
                      id="destination"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder={t.destPlace}
                      className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500"
                      />
                  </div>
                  <div>
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-1">{t.notesLabel}</label>
                      <textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t.notesPlace}
                      rows={3}
                      className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500"
                      />
                  </div>
                </>
            ) : (
                <div>
                  <label htmlFor="dayPlan" className="block text-sm font-medium text-gray-300 mb-1">{t.dayPromptLabel}</label>
                  <textarea
                  id="dayPlan"
                  value={dayPlanPrompt}
                  onChange={(e) => setDayPlanPrompt(e.target.value)}
                  placeholder={t.dayPromptPlace}
                  rows={5}
                  className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
              </div>
            )}
            
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center transition-colors disabled:bg-gray-500"
            >
              {loading ? <LoadingSpinner /> : <><SearchIcon /> <span className="ml-2">{mode === 'route' ? t.findPath : t.genPlan}</span></>}
            </button>
          </form>

          {/* Saved Plans List */}
          {savedItems.length > 0 && !loading && (
            <div className="mt-8 pt-6 border-t border-gray-700">
               <h3 className="text-lg font-bold text-gray-300 mb-3 flex items-center gap-2">
                 <FolderIcon /> {t.savedPlans}
               </h3>
               <div className="space-y-3">
                 {savedItems.map(item => (
                   <div key={item.id} onClick={() => handleLoad(item)} className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-3 flex justify-between items-center cursor-pointer transition-colors group">
                      <div>
                        <div className="font-semibold text-cyan-400">{item.name}</div>
                        <div className="text-xs text-gray-500 flex gap-2">
                           <span className="capitalize">{item.mode === 'route' ? 'Navigation' : 'Itinerary'}</span> • 
                           <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => handleDelete(item.id, e)}
                        className="p-2 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
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
        <div className="text-center mt-8 p-4 bg-gray-800/50 rounded-lg">
          <p className="font-semibold">{t.analyzing}</p>
          <p className="text-sm text-gray-400 mt-2">{t.connecting}</p>
        </div>
      )}

      {result && (
        <div className="mt-6 animate-fadeIn space-y-4">
          <Map 
            userLocation={userLocation} 
            // Route props
            steps={result.steps} 
            landmarks={result.landmarks}
            traffic={result.trafficSegments}
            currentStepIndex={currentStepIndex}
            // Planner props
            itineraryLocations={result.locations}
            itineraryLines={result.lines}
            highlightedItineraryIndex={activeItineraryIndex}
          />
          
          {mode === 'route' && result.steps.length > 0 && (
            <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg text-center">
                <p className="font-bold text-lg text-cyan-400">{t.step} {currentStepIndex + 1} / {result.steps.length}</p>
                <p className="mt-2 text-gray-200 text-lg">{result.steps[currentStepIndex].description}</p>
                <div className="flex justify-between mt-4">
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
              <div className="space-y-4">
                  <h3 className="text-xl font-bold text-cyan-400 border-b border-gray-700 pb-2">{t.yourItinerary}</h3>
                  <div className="space-y-0 relative">
                      {/* Vertical line connector */}
                      <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-700"></div>
                      
                      {result.locations.map((loc, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => setActiveItineraryIndex(idx)}
                            className={`relative pl-10 py-3 cursor-pointer transition-colors rounded-r-lg ${activeItineraryIndex === idx ? 'bg-gray-800/80 border-l-4 border-cyan-500' : 'hover:bg-gray-800/30'}`}
                          >
                                {/* Dot */}
                              <div className={`absolute left-2.5 top-5 w-3 h-3 rounded-full border-2 border-gray-900 ${activeItineraryIndex === idx ? 'bg-cyan-400 scale-125' : 'bg-gray-500'}`}></div>
                              
                              <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-bold text-white text-lg">{loc.name}</h4>
                                    <p className="text-sm text-gray-400">{loc.description}</p>
                                  </div>
                                  <div className="text-right flex-shrink-0 ml-2">
                                      <span className="block text-cyan-400 font-mono font-bold">{loc.time}</span>
                                      <span className="block text-xs text-gray-500">{loc.duration}</span>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
                  {result.summaryText && (
                      <div className="mt-4 p-4 bg-gray-800 rounded-lg text-sm text-gray-300 italic border-l-2 border-cyan-700">
                          {result.summaryText}
                      </div>
                  )}
              </div>
          )}
          
          <details className="bg-gray-800/50 rounded-lg p-1">
            <summary className="cursor-pointer p-2 text-gray-300 font-semibold">
                {mode === 'route' ? t.viewSummary : t.viewPlanText}
            </summary>
            <div className="p-4 border-t border-gray-700">
              <div className="prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: (result.text || result.summaryText).replace(/\n/g, '<br />') }} />
              <GroundingSources chunks={result.groundingChunks} />
            </div>
          </details>

          <div className="flex space-x-3">
             <button
              onClick={() => setResult(null)}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center transition-colors"
            >
              {mode === 'route' ? t.planNew : t.createNew}
            </button>
             <button
              onClick={handleSave}
              className="flex-1 bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center transition-colors"
            >
              <SaveIcon /> <span className="ml-2">{t.savePlan}</span>
            </button>
          </div>
        </div>
      )}
       
       {result && mode === 'route' && result.steps.length === 0 && !loading && (
        <div className="mt-8 text-center">
           <p className="text-yellow-400">Could not generate an interactive route. Displaying summary instead.</p>
           <div className="mt-4 p-4 bg-gray-800 border border-gray-700 rounded-lg">
            <div className="prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: (result.text || result.summaryText || '').replace(/\n/g, '<br />') }} />
            <GroundingSources chunks={result.groundingChunks} />
          </div>
           <button
            onClick={() => setResult(null)}
            className="mt-4 w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center transition-colors"
          >
            Start Over
          </button>
        </div>
       )}
    </div>
  );
};

export default RoutePlanner;
