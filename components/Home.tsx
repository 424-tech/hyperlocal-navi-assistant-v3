
import React, { useState } from 'react';
import { RoutePlannerIcon, UpdatesIcon, ChatIcon, ReportIcon, HelpIcon, ManualLocationIcon, SearchIcon, LoadingSpinner } from './Icons';
import { translations } from '../translations';
import { Language, Landmark } from '../types';
import TrafficReportModal from './TrafficReportModal';
import { discoverCampusLandmarks } from '../services/geminiService';

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

const QuickChip = ({ label, icon, onClick }: { label: string, icon: string, onClick: () => void }) => (
    <button 
        onClick={onClick}
        className="flex flex-col items-center justify-center bg-white border border-blue-100 p-3 rounded-2xl shadow-sm active:scale-95 transition-transform w-full aspect-square"
    >
        <span className="text-2xl mb-1">{icon}</span>
        <span className="text-xs font-bold text-slate-700 text-center leading-tight">{label}</span>
    </button>
);

const Home: React.FC<HomeProps> = ({ setView, geoStatus, onShowInstructions, manualLocation, onEnterLocationManually, isScbContext, language }) => {
  const t = translations[language];
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);

  const handleQuickNav = (destination: string) => {
      alert(`Tip: Type "${destination}" in the Planner next.`); 
      setView('planner');
  };

  const handleDiscovery = async () => {
      setIsDiscovering(true);
      try {
          // This will be stored in state in the future, for now we just show it's working
          const found = await discoverCampusLandmarks(null);
          alert(`Discovered ${found.length} buildings from Google Maps! Switching to Map View.`);
          setView('planner');
      } catch (e) {
          console.error(e);
      } finally {
          setIsDiscovering(false);
      }
  };

  return (
    <div className="animate-fadeIn max-w-lg mx-auto pb-10">
      <TrafficReportModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
        language={language} 
      />
      
      <div className="relative mb-8 pt-4">
        <button 
          onClick={onShowInstructions} 
          className="absolute top-0 right-0 text-slate-400 hover:text-blue-600 transition-colors p-2"
        >
          <HelpIcon />
        </button>

        <h1 className="text-3xl font-extrabold text-slate-900 leading-tight">
          {t.welcome}
        </h1>
        <p className="text-slate-500 mt-2 font-medium text-lg">{t.welcomeSub}</p>

        <div className="mt-4 inline-flex items-center text-xs font-semibold bg-slate-100 px-3 py-1.5 rounded-full text-slate-600 border border-slate-200" onClick={onEnterLocationManually}>
            {geoStatus.loading && !manualLocation && (
                 <span className="animate-pulse flex items-center gap-2"><span className="w-2 h-2 bg-blue-500 rounded-full"></span> {t.gettingLocation}</span>
            )}
            {manualLocation && (
                <span className="flex items-center gap-1 text-blue-700">📍 {t.manualLocationSet} <strong>{manualLocation}</strong></span>
            )}
            {!geoStatus.loading && !manualLocation && geoStatus.error && (
                 <span className="text-red-500">{t.setLocationDesc}</span>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-8">
          <div 
            onClick={() => setView('chat')}
            className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-6 shadow-xl shadow-blue-200 text-white flex items-center justify-between cursor-pointer hover:scale-[1.02] transition-transform relative overflow-hidden group"
          >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white opacity-10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative z-10">
                  <h2 className="text-2xl font-bold">{t.chatTitle}</h2>
                  <p className="text-blue-100 mt-1 text-sm opacity-90">{t.chatDesc}</p>
              </div>
              <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm relative z-10">
                 <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
              </div>
          </div>

          <div 
            onClick={handleDiscovery}
            className="bg-white border-2 border-dashed border-blue-200 rounded-3xl p-5 flex items-center gap-4 cursor-pointer hover:bg-blue-50 transition-colors"
          >
              <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                  {isDiscovering ? <LoadingSpinner /> : <SearchIcon />}
              </div>
              <div className="flex-1">
                  <h3 className="font-black text-slate-800 text-base">Campus Scan</h3>
                  <p className="text-xs text-slate-500 font-medium italic">Sync live data from Google Maps</p>
              </div>
              <div className="text-blue-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </div>
          </div>
      </div>

      <div className="mb-8">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">{t.destLabel}</h3>
          <div className="grid grid-cols-4 gap-3">
               <QuickChip label={t.chipOPD} icon="🏥" onClick={() => handleQuickNav("OPD")} />
               <QuickChip label={t.chipEmergency} icon="🚑" onClick={() => handleQuickNav("Trauma Center")} />
               <QuickChip label={t.chipBloodBank} icon="🩸" onClick={() => handleQuickNav("Blood Bank")} />
               <QuickChip label={t.chipPharmacy} icon="💊" onClick={() => handleQuickNav("Niramaya")} />
          </div>
      </div>

      <div className="space-y-3">
        <button 
            onClick={() => setView('planner')}
            disabled={(geoStatus.loading && !manualLocation)}
            className="w-full bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-4 hover:bg-slate-50 transition-colors shadow-sm"
        >
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><RoutePlannerIcon /></div>
            <div className="text-left">
                <h4 className="font-bold text-slate-800">{t.planRouteTitle}</h4>
                <p className="text-xs text-slate-500">{t.planRouteDesc}</p>
            </div>
        </button>

        <button 
            onClick={() => setView('updates')}
            className="w-full bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-4 hover:bg-slate-50 transition-colors shadow-sm"
        >
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><UpdatesIcon /></div>
            <div className="text-left">
                <h4 className="font-bold text-slate-800">{t.localUpdatesTitle}</h4>
                <p className="text-xs text-slate-500">{t.localUpdatesDesc}</p>
            </div>
        </button>
      </div>
    </div>
  );
};

export default Home;