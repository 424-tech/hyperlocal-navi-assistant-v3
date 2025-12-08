
import React, { useState } from 'react';
import { RoutePlannerIcon, UpdatesIcon, ChatIcon, ReportIcon, HelpIcon, ManualLocationIcon } from './Icons';
import { translations } from '../translations';
import { Language } from '../types';
import TrafficReportModal from './TrafficReportModal';

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
    className={`bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex items-center space-x-4 w-full text-left transition-all duration-200 hover:shadow-md hover:border-blue-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none disabled:bg-slate-100`}
  >
    <div className={`p-3 rounded-full ${disabled ? 'bg-slate-200 text-slate-400' : 'bg-blue-50 text-blue-600'}`}>
      {icon}
    </div>
    <div>
      <h3 className={`font-bold text-lg ${disabled ? 'text-slate-500' : 'text-slate-800'}`}>{title}</h3>
      <p className="text-sm text-slate-500 mt-1 leading-snug">{description}</p>
    </div>
  </button>
);

const Home: React.FC<HomeProps> = ({ setView, geoStatus, onShowInstructions, manualLocation, onEnterLocationManually, isScbContext, language }) => {
  const t = translations[language];
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  return (
    <div className="animate-fadeIn space-y-6 max-w-lg mx-auto">
      <TrafficReportModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
        language={language} 
      />
      
      <div className="text-center p-6 bg-white border border-slate-200 rounded-2xl shadow-sm relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-400"></div>
        
        <button 
          onClick={onShowInstructions} 
          className="absolute top-3 right-3 text-slate-400 hover:text-blue-600 transition-colors p-2"
          aria-label="Show instructions"
        >
          <HelpIcon />
        </button>
        <h2 className="text-2xl font-extrabold text-slate-900">{t.welcome}</h2>
        <p className="text-slate-600 mt-2 font-medium">{t.welcomeSub}</p>
        
        <div className="mt-4 flex flex-col items-center justify-center text-sm font-medium">
          {geoStatus.loading && !manualLocation && (
            <span className="flex items-center text-blue-600 bg-blue-50 px-3 py-1 rounded-full animate-pulse">
               {t.gettingLocation}
            </span>
          )}
          {geoStatus.error && !manualLocation && (
            <span className="text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100">
              {geoStatus.error}
            </span>
          )}
          {manualLocation && (
            <span className="flex items-center text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-100">
              <span className="mr-1">📍</span> {t.manualLocationSet} <strong>{manualLocation}</strong>
            </span>
          )}
        </div>
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
        
        <div className="pt-2 border-t border-slate-200 my-4"></div>
        
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
          onClick={() => setIsReportModalOpen(true)}
        />
      </div>
    </div>
  );
};

export default Home;
