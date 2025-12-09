
import React from 'react';
import { RoutePlannerIcon, UpdatesIcon, ChatIcon, ReportIcon } from './Icons';
import { translations } from '../translations';
import { Language } from '../types';

interface InstructionsProps {
  onClose: () => void;
  language: Language;
}

const InstructionItem = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="flex items-start space-x-4">
    <div className="flex-shrink-0 text-blue-600 mt-1">{icon}</div>
    <div>
      <h4 className="font-bold text-lg text-slate-800">{title}</h4>
      <p className="text-slate-600">{description}</p>
    </div>
  </div>
);

const Instructions: React.FC<InstructionsProps> = ({ onClose, language }) => {
  const t = translations[language];

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <h2 className="text-2xl font-bold text-blue-800">{t.guideTitle}</h2>
          <p className="text-slate-500 mt-1">{t.guideSub}</p>
        </div>

        <div className="space-y-6">
          <InstructionItem
            icon={<RoutePlannerIcon />}
            title={t.guidePlanTitle}
            description={t.guidePlanDesc}
          />
          <InstructionItem
            icon={<UpdatesIcon />}
            title={t.guideUpdatesTitle}
            description={t.guideUpdatesDesc}
          />
          <InstructionItem
            icon={<ChatIcon />}
            title={t.guideChatTitle}
            description={t.guideChatDesc}
          />
          <InstructionItem
            icon={<ReportIcon />}
            title={t.guideReportTitle}
            description={t.guideReportDesc}
          />
        </div>

        <div className="text-center pt-4">
          <button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-colors shadow-md"
          >
            {t.gotIt}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Instructions;
