
import React, { useState } from 'react';
import { RoutePlannerIcon, UpdatesIcon, ChatIcon, ReportIcon, HelpIcon, ManualLocationIcon, EmergencyIcon, MapOverviewIcon, CallIcon } from './Icons';
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
  onNavigateToEmergency?: () => void;
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

// Quick Action Button for the emergency row
const QuickActionButton = ({ icon, label, onClick, variant = 'default' }: { icon: React.ReactNode, label: string, onClick: () => void, variant?: 'default' | 'emergency' }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 flex-1 ${variant === 'emergency'
        ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100'
        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
      }`}
  >
    {icon}
    <span className="text-xs font-semibold mt-1.5">{label}</span>
  </button>
);

const Home: React.FC<HomeProps> = ({ setView, geoStatus, onShowInstructions, manualLocation, onEnterLocationManually, isScbContext, language }) => {
  const t = translations[language];
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Handle emergency button - go directly to planner with Emergency destination pre-filled
  const handleEmergencyTap = () => {
    // Navigate to planner - the planner will be updated to auto-fill "Emergency Department"
    setView('planner');
    // Store emergency flag in sessionStorage for the planner to pick up
    sessionStorage.setItem('scb_emergency_mode', 'true');
  };

  // Handle ambulance call
  const handleCallAmbulance = () => {
    window.location.href = 'tel:108'; // 108 is India's emergency ambulance number
  };

  return (
    <div className="animate-fadeIn space-y-5 max-w-lg mx-auto">
      <TrafficReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        language={language}
      />

      {/* 🔴 EMERGENCY SOS BUTTON - Top Priority */}
      <button
        onClick={handleEmergencyTap}
        className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white p-5 rounded-2xl shadow-lg transition-all duration-300 animate-emergency-pulse hover:animate-none focus:outline-none focus:ring-4 focus:ring-red-300 animate-emergency-glow"
      >
        <div className="flex items-center justify-center space-x-3">
          <div className="bg-white/20 p-2 rounded-full">
            <EmergencyIcon />
          </div>
          <div className="text-left">
            <h2 className="text-xl font-extrabold tracking-wide">{t.emergencyButton}</h2>
            <p className="text-sm text-red-100 font-medium">{t.emergencySubtext}</p>
          </div>
        </div>
      </button>

      {/* Quick Actions Row */}
      <div className="flex space-x-3">
        <QuickActionButton
          icon={<CallIcon />}
          label={t.quickCallAmbulance}
          onClick={handleCallAmbulance}
          variant="emergency"
        />
        <QuickActionButton
          icon={<MapOverviewIcon />}
          label={t.quickMapOverview}
          onClick={() => setView('updates')}
        />
        <QuickActionButton
          icon={<ChatIcon />}
          label={t.quickAskHelp}
          onClick={() => setView('chat')}
        />
      </div>

      {/* Separator */}
      <div className="flex items-center space-x-3 text-slate-400 text-xs font-medium uppercase tracking-wider">
        <div className="flex-1 border-t border-slate-200"></div>
        <span>{t.orExplore}</span>
        <div className="flex-1 border-t border-slate-200"></div>
      </div>

      {/* Welcome Card with Location Status */}
      <div className="text-center p-5 bg-white border border-slate-200 rounded-2xl shadow-sm relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-400"></div>

        <button
          onClick={onShowInstructions}
          className="absolute top-3 right-3 text-slate-400 hover:text-blue-600 transition-colors p-2"
          aria-label="Show instructions"
        >
          <HelpIcon />
        </button>
        <h2 className="text-xl font-bold text-slate-800">{t.welcome}</h2>
        <p className="text-slate-500 mt-1 text-sm">{t.welcomeSub}</p>

        <div className="mt-3 flex flex-col items-center justify-center text-sm font-medium">
          {geoStatus.loading && !manualLocation && (
            <span className="flex items-center text-blue-600 bg-blue-50 px-3 py-1 rounded-full animate-pulse text-xs">
              {t.gettingLocation}
            </span>
          )}
          {geoStatus.error && !manualLocation && (
            <span className="text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100 text-xs">
              {geoStatus.error}
            </span>
          )}
          {manualLocation && (
            <span className="flex items-center text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-100 text-xs">
              <span className="mr-1">📍</span> {t.manualLocationSet} <strong className="ml-1">{manualLocation}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Main Feature Buttons */}
      <div className="space-y-3">
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
      </div>

      {/* Secondary Actions */}
      <details className="group">
        <summary className="flex items-center justify-center text-slate-400 text-xs font-medium cursor-pointer hover:text-slate-600 transition-colors py-2">
          <span className="mr-1">⚙️</span> More Options
          <span className="ml-1 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="space-y-3 mt-3">
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
      </details>
    </div>
  );
};

export default Home;

