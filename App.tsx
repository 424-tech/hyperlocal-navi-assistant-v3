
import React, { useState } from 'react';
import Home from './components/Home';
import RoutePlanner from './components/RoutePlanner';
import ChatBot from './components/ChatBot';
import LocalUpdates from './components/LocalUpdates';
import Instructions from './components/Instructions';
import ManualLocationModal from './components/ManualLocationModal';
import useGeolocation from './hooks/useGeolocation';
import { isScbCampusLocation } from './services/geminiService';
import { translations } from './translations';
import { Language } from './types';

type View = 'home' | 'planner' | 'chat' | 'updates';

const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [showInstructions, setShowInstructions] = useState(false);
  const { location, error: geoError, loading: geoLoading } = useGeolocation();
  const [manualLocation, setManualLocation] = useState<string | null>(null);
  const [isManualLocationModalOpen, setIsManualLocationModalOpen] = useState(false);
  const [isScbContext, setIsScbContext] = useState(true);
  const [language, setLanguage] = useState<Language>('en');

  const t = translations[language];

  const handleSaveManualLocation = async (newLocation: string) => {
    const trimmedLocation = newLocation.trim();
    setManualLocation(trimmedLocation === '' ? null : trimmedLocation);
    setIsManualLocationModalOpen(false);
    if (trimmedLocation === '') setIsScbContext(true);
    else {
      const isScb = await isScbCampusLocation(trimmedLocation);
      setIsScbContext(isScb);
    }
  };

  const renderView = () => {
    switch (view) {
      case 'planner': return <RoutePlanner location={location} manualLocation={manualLocation} language={language} />;
      case 'chat': return <div className="p-4 md:p-8 h-full"><ChatBot language={language} /></div>;
      case 'updates': return <LocalUpdates location={location} manualLocation={manualLocation} language={language} />;
      case 'home':
      default: return <div className="p-4 md:p-8"><Home setView={setView} geoStatus={{error: geoError, loading: geoLoading}} onShowInstructions={() => setShowInstructions(true)} manualLocation={manualLocation} onEnterLocationManually={() => setIsManualLocationModalOpen(true)} isScbContext={isScbContext} language={language} /></div>;
    }
  };

  return (
    <div className="h-full w-full bg-slate-100 flex items-center justify-center font-display overflow-hidden">
      {showInstructions && <Instructions onClose={() => setShowInstructions(false)} />}
      <ManualLocationModal isOpen={isManualLocationModalOpen} onClose={() => setIsManualLocationModalOpen(false)} onSave={handleSaveManualLocation} currentLocation={manualLocation} />
      
      {/* Main App Container: Responsive Max Width */}
      <div className="h-full w-full max-w-4xl bg-white shadow-2xl flex flex-col relative overflow-hidden md:h-[95vh] md:rounded-[3rem] md:border md:border-slate-200">
        
        {/* Dynamic Header */}
        {view !== 'updates' && view !== 'planner' && (
          <header className="bg-white/95 backdrop-blur-md border-b border-slate-100 px-6 pt-10 pb-5 text-center z-10 flex justify-between items-center flex-shrink-0">
            <div className="flex-1 text-left">
               <h1 className="text-xl md:text-2xl font-black tracking-tight text-[#5B92A7]">{t.appName}</h1>
               <p className="text-[9px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Hyperlocal Navigation System</p>
            </div>
            <button 
              onClick={() => setLanguage(prev => prev === 'en' ? 'or' : 'en')} 
              className="bg-slate-50 px-4 py-2 rounded-xl text-[10px] md:text-xs font-black border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {language === 'en' ? 'ଓଡ଼ିଆ' : 'ENGLISH'}
            </button>
          </header>
        )}
        
        {/* Main View Port */}
        <main className="flex-grow overflow-y-auto no-scrollbar bg-white relative">
          {renderView()}
        </main>

        {/* Navigation Bar */}
        <nav className="bg-white/95 backdrop-blur-3xl border-t border-slate-100 pb-safe pt-3 px-8 shadow-[0_-15px_50px_-15px_rgba(0,0,0,0.08)] z-40 flex-shrink-0">
          <div className="flex justify-between items-end pb-5 max-w-2xl mx-auto">
              <NavBtn active={view === 'home'} onClick={() => setView('home')} icon="home" label="Home" />
              <NavBtn active={view === 'planner'} onClick={() => setView('planner')} icon="map" label="Map" />
              <NavBtn active={view === 'updates'} onClick={() => setView('updates')} icon="forum" label="Board" />
              <NavBtn active={view === 'chat'} onClick={() => setView('chat')} icon="help_center" label="Help" />
          </div>
        </nav>
      </div>
    </div>
  );
};

const NavBtn = ({ active, onClick, icon, label }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center gap-2 w-16 md:w-20 transition-all duration-500 group ${active ? 'text-[#5B92A7]' : 'text-slate-300 hover:text-slate-500'}`}>
        <div className={`transition-all duration-300 flex items-center justify-center ${active ? 'bg-[#5B92A7]/10 w-16 h-10 rounded-full mb-0.5' : 'w-10 h-10 mb-1 group-hover:-translate-y-1'}`}>
            <span className={`material-symbols-outlined text-[28px] md:text-[32px] ${active ? 'fill-[1]' : ''}`}>{icon}</span>
        </div>
        <span className={`text-[10px] md:text-xs tracking-tight ${active ? 'font-black' : 'font-bold'}`}>{label}</span>
    </button>
);

export default App;
