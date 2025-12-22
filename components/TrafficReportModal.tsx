
import React, { useState } from 'react';
import { translations } from '../translations';
import { Language, TrafficSeverity } from '../types';
import { enhanceTrafficReport } from '../services/geminiService';
import { LoadingSpinner } from './Icons';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

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
  const [error, setError] = useState<string | null>(null);

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
    setError(null);

    try {
        // Use Gemini to format the description nicely
        const rawText = `${description} at ${location}`;
        const enhancedDescription = await enhanceTrafficReport(rawText, language);
        
        let myAlias = sessionStorage.getItem('scb_user_alias');
        if (!myAlias) {
            myAlias = generateAlias();
            sessionStorage.setItem('scb_user_alias', myAlias);
        }

        if (db) {
            // Add to Firebase if connected
            await addDoc(collection(db, "reports"), {
                timestamp: serverTimestamp(),
                severity,
                location,
                description: enhancedDescription,
                originalText: description,
                reporterName: myAlias,
                verificationCount: 1
            });
        } else {
            // Mock submission for Demo Mode
            console.log("Mock Submit:", { location, severity, description: enhancedDescription });
            await new Promise(resolve => setTimeout(resolve, 1000)); // Fake network delay
        }

        setSuccess(true);
        setTimeout(() => {
            setSuccess(false);
            setLocation('');
            setDescription('');
            setSeverity('moderate');
            onClose();
        }, 1500);

    } catch (error: any) {
        console.error("Failed to submit report", error);
        setError("Could not submit report. Check connection.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-blue-800 border-b border-slate-100 pb-3">{t.reportHeader}</h3>
        
        {success ? (
            <div className="text-center py-8">
                <div className="text-green-500 text-6xl mb-4">✓</div>
                <p className="text-xl font-bold text-slate-800">{t.reportSuccess}</p>
            </div>
        ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">{t.reportLocation}</label>
                    <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder={t.reportLocationPlace}
                        className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        required
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">{t.reportSeverity}</label>
                    <select 
                        value={severity} 
                        onChange={(e) => setSeverity(e.target.value as TrafficSeverity)}
                        className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                        <option value="light">{t.sevLight}</option>
                        <option value="moderate">{t.sevModerate}</option>
                        <option value="heavy">{t.sevHeavy}</option>
                        <option value="accident">{t.sevAccident}</option>
                        <option value="closure">{t.sevClosure}</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">{t.reportDescLabel}</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t.reportDescPlace}
                        rows={3}
                        className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        required
                    />
                </div>
                
                {error && <p className="text-red-500 text-sm bg-red-50 p-2 rounded border border-red-100">{error}</p>}

                {!db && (
                    <p className="text-xs text-slate-400 text-center italic">Demo Mode: Report will be simulated.</p>
                )}

                <div className="flex justify-end space-x-3 pt-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition-colors"
                        disabled={loading}
                    >
                        {t.cancel}
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors flex items-center shadow-sm"
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
