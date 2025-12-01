
import React from 'react';
import { RoutePlannerIcon, UpdatesIcon, ChatIcon, ReportIcon } from './Icons';

interface InstructionsProps {
  onClose: () => void;
}

const InstructionItem = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 text-cyan-400 mt-1">{icon}</div>
        <div>
            <h4 className="font-bold text-lg text-gray-100">{title}</h4>
            <p className="text-gray-300">{description}</p>
        </div>
    </div>
);

const Instructions: React.FC<InstructionsProps> = ({ onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
            <h2 className="text-2xl font-bold text-cyan-400">App Guide</h2>
            <p className="text-gray-400 mt-1">Here's a quick look at what each feature does.</p>
        </div>
        
        <div className="space-y-6">
            <InstructionItem 
                icon={<RoutePlannerIcon />}
                title="Plan Smart Route"
                description="Use this to get detailed, step-by-step directions. Our AI 'Thinks' like a local, considering real-time traffic, narrow streets, market days, and even temporary closures. Just enter your destination and any special requests (like 'avoid the crowded temple road')."
            />
            <InstructionItem 
                icon={<UpdatesIcon />}
                title="Local Updates"
                description="Tap here to get a quick summary of what's happening around you right now. The AI scans for news on traffic jams, road closures, festivals, or other events that could affect your travel. It's like having a local news reporter just for you."
            />
             <InstructionItem 
                icon={<ChatIcon />}
                title="Ask Assistant"
                description="This is your personal chat assistant. Have a question? Just ask! You can ask for directions, find the nearest pharmacy, or even ask about the weather. For example, try asking: 'Where can I find the best chai near me?'"
            />
             <InstructionItem 
                icon={<ReportIcon />}
                title="Report Traffic"
                description="This feature will allow you to help other users by reporting traffic jams, accidents, or road closures you see. By working together, we can make navigation better for everyone. (Coming soon!)"
            />
        </div>

        <div className="text-center pt-4">
            <button 
                onClick={onClose}
                className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            >
                Got It!
            </button>
        </div>
      </div>
    </div>
  );
};

export default Instructions;
