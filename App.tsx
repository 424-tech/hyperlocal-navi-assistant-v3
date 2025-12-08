
import React, { useState } from 'react';
import Home from './components/Home';
import RoutePlanner from './components/RoutePlanner';
import ChatBot from './components/ChatBot';
import LocalUpdates from './components/LocalUpdates';
import Instructions from './components/Instructions';
import ManualLocationModal from './components/ManualLocationModal';
import { NavHomeIcon, NavRouteIcon, NavChatIcon, NavUpdatesIcon } from './components/Icons';
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

    if (trimmedLocation === '') {
      setIsScbContext(true); // Reset to default when location is cleared
    } else {
      const isScb = await isScbCampusLocation(trimmedLocation);
      setIsScbContext(isScb);
    }
  };

  const renderView = () => {
    switch (view) {
      case 'planner':
        return <RoutePlanner location={location} manualLocation={manualLocation} language={language} />;
      case 'chat':
        return <ChatBot language={language} />;
      case 'updates':
        return <LocalUpdates location={location} manualLocation={manualLocation} language={language} />;
      case 'home':
      default:
        return <Home 
          setView={setView} 
          geoStatus={{error: geoError, loading: geoLoading}} 
          onShowInstructions={() => setShowInstructions(true)}
          manualLocation={manualLocation}
          onEnterLocationManually={() => setIsManualLocationModalOpen(true)}
          isScbContext={isScbContext}
          language={language}
        />;
    }
  };

  const NavItem = ({ activeView, targetView, icon, label }: { activeView: View, targetView: View, icon: React.ReactNode, label: string }) => (
    <button
      onClick={() => setView(targetView)}
      className={`flex flex-col items-center justify-center w-full pt-3 pb-2 transition-all duration-200 ${
        activeView === targetView 
          ? 'text-blue-700 transform scale-105 font-semibold' 
          : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      {icon}
      <span className="text-[10px] uppercase tracking-wide mt-1">{label}</span>
    </button>
  );

  return (
    <div className="h-full w-full bg-slate-50 text-slate-900 font-sans flex flex-col overflow-hidden relative">
      {showInstructions && <Instructions onClose={() => setShowInstructions(false)} />}
      <ManualLocationModal 
        isOpen={isManualLocationModalOpen}
        onClose={() => setIsManualLocationModalOpen(false)}
        onSave={handleSaveManualLocation}
        currentLocation={manualLocation}
      />
      
      {/* Header: White background, clean shadow */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm p-4 text-center z-10 flex justify-between items-center flex-shrink-0">
        <h1 className="text-xl font-bold tracking-tight text-blue-800 flex-grow text-center">
          {t.appName}
        </h1>
        <button 
          onClick={() => setLanguage(prev => prev === 'en' ? 'or' : 'en')}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-md text-xs font-bold border border-slate-300 text-slate-700 transition-colors shadow-sm"
        >
          {language === 'en' ? 'ଓଡ଼ିଆ' : 'English'}
        </button>
      </header>
      
      {/* Main content */}
      <main className="flex-grow p-4 md:p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
        {renderView()}
      </main>

      {/* Footer: White background, high contrast active state */}
      <nav className="bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex justify-around z-10 flex-shrink-0 pb-safe">
        <NavItem activeView={view} targetView="home" icon={<NavHomeIcon />} label={t.navHome} />
        <NavItem activeView={view} targetView="planner" icon={<NavRouteIcon />} label={t.navPlanner} />
        <NavItem activeView={view} targetView="updates" icon={<NavUpdatesIcon />} label={t.navUpdates} />
        <NavItem activeView={view} targetView="chat" icon={<NavChatIcon />} label={t.navChat} />
      </nav>
    </div>
  );
};

export default App;
