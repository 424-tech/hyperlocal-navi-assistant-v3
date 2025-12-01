
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
      className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${
        activeView === targetView ? 'text-cyan-400' : 'text-gray-400 hover:text-cyan-300'
      }`}
    >
      {icon}
      <span className="text-xs mt-1">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col">
      {showInstructions && <Instructions onClose={() => setShowInstructions(false)} />}
      <ManualLocationModal 
        isOpen={isManualLocationModalOpen}
        onClose={() => setIsManualLocationModalOpen(false)}
        onSave={handleSaveManualLocation}
        currentLocation={manualLocation}
      />
      <header className="bg-gray-800/50 backdrop-blur-sm shadow-lg p-4 text-center sticky top-0 z-10 flex justify-between items-center">
        <h1 className="text-xl font-bold tracking-wider text-cyan-400 flex-grow text-center">{t.appName}</h1>
        <button 
          onClick={() => setLanguage(prev => prev === 'en' ? 'or' : 'en')}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-xs font-bold border border-gray-600 transition-colors"
        >
          {language === 'en' ? 'ଓଡ଼ିଆ' : 'English'}
        </button>
      </header>
      
      <main className="flex-grow p-4 md:p-6 overflow-auto">
        {renderView()}
      </main>

      <nav className="sticky bottom-0 left-0 right-0 bg-gray-800/80 backdrop-blur-md border-t border-gray-700 shadow-lg flex justify-around z-10">
        <NavItem activeView={view} targetView="home" icon={<NavHomeIcon />} label={t.navHome} />
        <NavItem activeView={view} targetView="planner" icon={<NavRouteIcon />} label={t.navPlanner} />
        <NavItem activeView={view} targetView="updates" icon={<NavUpdatesIcon />} label={t.navUpdates} />
        <NavItem activeView={view} targetView="chat" icon={<NavChatIcon />} label={t.navChat} />
      </nav>
    </div>
  );
};

export default App;
