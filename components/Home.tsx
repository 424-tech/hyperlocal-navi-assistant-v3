
import React from 'react';
import { RoutePlannerIcon, UpdatesIcon, ChatIcon, ReportIcon, HelpIcon, ManualLocationIcon } from './Icons';
import { translations } from '../translations';
import { Language } from '../types';

type View = 'home' | 'planner' | 'chat' | 'updates';

interface HomeProps {
  setView: (view: View) => void;
  geoStatus: { error: string | null, loading: boolean };
  onShowInstructions: () => void;
  manualLocation: string | null;
  onEnterLocationManually: () => void;
  isScbContext: boolean;
  language: Language;
}

const ActionButton = ({ icon, title, description, onClick, disabled = false }: { icon: React.ReactNode, title: string, description: string, onClick: () => void, disabled?: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`bg-gray-800 border border-gray-700 p-4 rounded-lg flex items-center space-x-4 w-full text-left transition-transform transform hover:scale-105 hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
  >
    <div className="text-cyan-400">{icon}</div>
    <div>
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  </button>
);

const Home: React.FC<HomeProps> = ({ setView, geoStatus, onShowInstructions, manualLocation, onEnterLocationManually, isScbContext, language }) => {
  const t = translations[language];

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="text-center p-4 bg-gray-800/50 rounded-lg relative">
        <button 
          onClick={onShowInstructions} 
          className="absolute top-3 right-3 text-gray-400 hover:text-cyan-400 transition-colors"
          aria-label="Show instructions"
        >
          <HelpIcon />
        </button>
        <h2 className="text-2xl font-bold">{t.welcome}</h2>
        <p className="text-gray-300 mt-2">{t.welcomeSub}</p>
        {geoStatus.loading && !manualLocation && <p className="text-sm text-yellow-400 mt-2">{t.gettingLocation}</p>}
        {geoStatus.error && !manualLocation && <p className="text-sm text-red-400 mt-2">{geoStatus.error}</p>}
        {manualLocation && <p className="text-sm text-green-400 mt-2">{t.manualLocationSet} <strong>{manualLocation}</strong></p>}
      </div>
      <div className="space-y-4">
        <ActionButton 
          icon={<RoutePlannerIcon />}
          title={t.planRouteTitle}
          description={isScbContext ? t.planRouteDesc : t.planRouteDescScb}
          onClick={() => setView('planner')}
          disabled={(geoStatus.loading && !manualLocation) || !isScbContext}
        />
        <ActionButton 
          icon={<UpdatesIcon />}
          title={t.localUpdatesTitle}
          description={manualLocation && !isScbContext && language === 'en' ? `Check for news in ${manualLocation}` : t.localUpdatesDesc}
          onClick={() => setView('updates')}
          disabled={geoStatus.loading && !manualLocation}
        />
        <ActionButton 
          icon={<ChatIcon />}
          title={t.chatTitle}
          description={t.chatDesc}
          onClick={() => setView('chat')}
        />
        <ActionButton 
          icon={<ManualLocationIcon />}
          title={t.setLocationTitle}
          description={t.setLocationDesc}
          onClick={onEnterLocationManually}
        />
        <ActionButton 
          icon={<ReportIcon />}
          title={t.reportTitle}
          description={t.reportDesc}
          onClick={() => alert('Traffic reporting feature coming soon!')}
        />
      </div>
    </div>
  );
};

export default Home;
