
import React, { useState } from 'react';
import { translations } from '../translations';
import { Language, TrafficSeverity, UserTrafficReport } from '../types';
import { enhanceTrafficReport } from '../services/geminiService';
import { LoadingSpinner } from './Icons';

interface TrafficReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

const TrafficReportModal: React.FC<TrafficReportModalProps> = ({ isOpen, onClose, language }) => {
  const t = translations[language];
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<TrafficSeverity>('moderate');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  // Simple random alias generator for privacy
  const generateAlias = () => {
    const adjectives = ['Neon', 'Cyber', 'Solar', 'Rapid', 'Urban', 'Night', 'Swift', 'Metro', 'Campus'];
    const nouns = ['Scout', 'Rider', 'Guide', 'Pilot', 'Walker', 'Ranger', 'Drifter', 'Surfer', 'Navigator'];
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNum = Math.floor(Math.random() * 99) + 1;
    return `${randomAdj} ${randomNoun} ${randomNum}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
        // Use Gemini to format the description nicely
        const rawText = `${description} at ${location}`;
        const enhancedDescription = await enhanceTrafficReport(rawText, language);
        
        // Ensure a reporter name exists in session, or create one
        let myAlias = sessionStorage.getItem('scb_user_alias');
        if (!myAlias) {
            myAlias = generateAlias();
            sessionStorage.setItem('scb_user_alias', myAlias);
        }

        const newReport: UserTrafficReport = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            severity,
            location,
            description: enhancedDescription,
            originalText: description,
            reporterName: myAlias,
            verificationCount: 1 // Starts with 1 verification (the reporter)
        };

        // Save to local storage
        const existingReports = JSON.parse(localStorage.getItem('scb_navi_user_reports') || '[]');
        localStorage.setItem('scb_navi_user_reports', JSON.stringify([newReport, ...existingReports]));

        setSuccess(true);
        setTimeout(() => {
            setSuccess(false);
            setLocation('');
            setDescription('');
            setSeverity('moderate');
            onClose();
        }, 1500);

    } catch (error) {
        console.error("Failed to submit report", error);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-cyan-400 border-b border-gray-700 pb-2">{t.reportHeader}</h3>
        
        {success ? (
            <div className="text-center py-8">
                <div className="text-green-500 text-5xl mb-4">✓</div>
                <p className="text-xl font-semibold">{t.reportSuccess}</p>
            </div>
        ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">{t.reportLocation}</label>
                    <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder={t.reportLocationPlace}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500"
                        required
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">{t.reportSeverity}</label>
                    <select 
                        value={severity} 
                        onChange={(e) => setSeverity(e.target.value as TrafficSeverity)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500"
                    >
                        <option value="light">{t.sevLight}</option>
                        <option value="moderate">{t.sevModerate}</option>
                        <option value="heavy">{t.sevHeavy}</option>
                        <option value="accident">{t.sevAccident}</option>
                        <option value="closure">{t.sevClosure}</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">{t.reportDescLabel}</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t.reportDescPlace}
                        rows={3}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500"
                        required
                    />
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-md transition-colors"
                        disabled={loading}
                    >
                        {t.cancel}
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md transition-colors flex items-center"
                    >
                        {loading && <LoadingSpinner />}
                        <span className={loading ? "ml-2" : ""}>{loading ? t.processingReport : t.submitReport}</span>
                    </button>
                </div>
            </form>
        )}
      </div>
    </div>
  );
};

export default TrafficReportModal;
