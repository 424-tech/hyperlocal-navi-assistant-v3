
import React, { useState, useEffect } from 'react';
import { getLocalUpdates } from '../services/geminiService';
import { GeolocationState, GroundingChunk, Language, UserTrafficReport } from '../types';
import {
    LoadingSpinner, ReportIcon, UserIcon, SpeakerIcon, StopIcon, SourceIcon,
    WarningIcon, CheckCircleIcon, ThumbUpIcon, ThumbDownIcon, PlayIcon, PauseIcon,
    WeatherIcon, NavigationIcon, PhoneIcon, PlusIcon, SearchIcon
} from './Icons';
import { translations } from '../translations';
import { db } from '../services/firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, Timestamp, updateDoc, doc, increment } from "firebase/firestore";

interface LocalUpdatesProps {
    location: GeolocationState;
    manualLocation: string | null;
    language: Language;
}

const LocalUpdates: React.FC<LocalUpdatesProps> = ({ location, manualLocation, language }) => {
    const [loading, setLoading] = useState(true);
    const [updates, setUpdates] = useState<{ text: string; groundingChunks: GroundingChunk[] } | null>(null);
    const [userReports, setUserReports] = useState<UserTrafficReport[]>([]);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');

    // New States for Features
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [weather, setWeather] = useState({ temp: 32, condition: 'Sunny', humidity: 65 }); // Mock Data
    const [expandedBriefing, setExpandedBriefing] = useState(true);

    const t = translations[language];

    // --- 1. FIREBASE INTEGRATION ---
    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, "reports"), orderBy("timestamp", "desc"), limit(20));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reports: UserTrafficReport[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                reports.push({
                    id: doc.id,
                    timestamp: data.timestamp?.toMillis() || Date.now(),
                    severity: data.severity,
                    location: data.location,
                    description: data.description,
                    originalText: data.originalText,
                    reporterName: data.reporterName,
                    verificationCount: data.verificationCount || 0
                });
            });
            setUserReports(reports);
        });
        return () => unsubscribe();
    }, []);

    const handleVote = async (reportId: string, type: 'up' | 'down') => {
        if (!db) return;
        const reportRef = doc(db, "reports", reportId);
        const incrementValue = type === 'up' ? 1 : -1;
        await updateDoc(reportRef, {
            verificationCount: increment(incrementValue)
        });
    };

    // --- 2. GEMINI UPDATES ---
    useEffect(() => {
        const fetchUpdates = async () => {
            setLoading(true);
            const locationToFetch = manualLocation
                || (location.latitude && location.longitude ? { latitude: location.latitude, longitude: location.longitude } : null);
            try {
                const result = await getLocalUpdates(locationToFetch, language);
                setUpdates(result);
            } catch (e) {
                console.error("Failed to fetch updates", e);
            } finally {
                setLoading(false);
            }
        };
        fetchUpdates();
    }, [location.latitude, location.longitude, manualLocation, language]);

    // --- 3. TEXT TO SPEECH ---
    const handleSpeak = () => {
        if (!updates || !updates.text) return;
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }
        const utterance = new SpeechSynthesisUtterance(updates.text);
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang.includes('IN') || v.lang.includes('hi'));
        if (preferredVoice) utterance.voice = preferredVoice;
        utterance.rate = 0.9;
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
    };

    useEffect(() => () => window.speechSynthesis.cancel(), []);

    // --- HELPER FUNCTIONS ---
    const getTimeAgo = (timestamp: number) => {
        const diff = Math.floor((Date.now() - timestamp) / 60000);
        if (diff < 1) return t.justNow;
        if (diff < 60) return `${diff} ${t.minsAgo}`;
        const hours = Math.floor(diff / 60);
        return `${hours} ${t.hrsAgo}`;
    };

    const filteredReports = userReports.filter(report => {
        const matchesSearch = report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            report.location.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = activeFilter === 'All' || report.severity === activeFilter.toLowerCase(); // Mapping basic severity for demo
        return matchesSearch && matchesFilter;
    });

    const validChunks = updates?.groundingChunks?.filter(chunk => chunk.web?.uri || chunk.maps?.uri) || [];

    return (
        <div className="animate-fadeIn pb-24 max-w-3xl mx-auto space-y-8">

            {/* HEADER & SEARCH */}
            <div className="sticky top-0 bg-slate-50/95 backdrop-blur z-20 pt-2 pb-4 px-1">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Campus Pulse</h1>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { weekday: 'long', split: ' ', month: 'short', day: 'numeric' })}</p>
                    </div>
                    {/* Weather Widget (Mock) */}
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-200">
                        <span className="text-yellow-500"><WeatherIcon /></span>
                        <div>
                            <p className="text-xs font-bold text-slate-700">{weather.temp}°C</p>
                            <p className="text-[10px] text-slate-400 font-medium">{weather.condition}</p>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search updates, places, or reports..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                    <div className="absolute left-3 top-3.5 text-slate-400"><SearchIcon /></div>
                </div>
            </div>

            {/* 1. DAILY BRIEFING CARD (Gradient) */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 p-32 bg-white opacity-5 rounded-full blur-3xl transform translate-x-10 -translate-y-10 pointer-events-none"></div>

                <div className="p-6 relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <span className="bg-blue-500/30 text-blue-100 border border-blue-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mb-2 inline-block">AI Generated</span>
                            <h2 className="text-xl font-bold">Daily Briefing</h2>
                        </div>
                        <button
                            onClick={handleSpeak}
                            className="bg-white/10 hover:bg-white/20 p-3 rounded-full backdrop-blur-sm transition-all border border-white/10"
                        >
                            {isSpeaking ? <PauseIcon /> : <PlayIcon />}
                        </button>
                    </div>

                    {loading ? (
                        <div className="space-y-3 animate-pulse">
                            <div className="h-4 bg-white/20 rounded w-3/4"></div>
                            <div className="h-4 bg-white/20 rounded w-full"></div>
                            <div className="h-4 bg-white/20 rounded w-5/6"></div>
                        </div>
                    ) : updates ? (
                        <div className={`prose prose-invert prose-sm max-w-none transition-all duration-500 ${expandedBriefing ? 'max-h-[500px]' : 'max-h-24 overflow-hidden relative'}`}>
                            <div className="whitespace-pre-wrap leading-relaxed opacity-90">{updates.text}</div>
                            {!expandedBriefing && (
                                <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-indigo-700 to-transparent"></div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8 opacity-70 italic">{t.noUpdates}</div>
                    )}

                    {updates && (
                        <button
                            onClick={() => setExpandedBriefing(!expandedBriefing)}
                            className="mt-4 text-xs font-bold uppercase tracking-widest text-blue-200 hover:text-white transition-colors"
                        >
                            {expandedBriefing ? 'Show Less' : 'Read Full Briefing'}
                        </button>
                    )}
                </div>

                {/* Sources Footer */}
                {validChunks.length > 0 && (
                    <div className="bg-black/20 p-4 backdrop-blur-sm flex gap-3 overflow-x-auto">
                        {validChunks.map((chunk, i) => (
                            <a
                                key={i}
                                href={chunk.web?.uri || chunk.maps?.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-shrink-0 text-xs bg-white/10 hover:bg-white/20 border border-white/10 text-white px-3 py-1.5 rounded-lg transition-all truncate max-w-[120px]"
                            >
                                {chunk.web?.title || chunk.maps?.title || 'Source'}
                            </a>
                        ))}
                    </div>
                )}
            </div>

            {/* 2. LIVE CAMPUS STATUS */}
            <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 px-1">Campus Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* OPD Status Card */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative group">
                        <span className="absolute top-5 right-5 w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-3">🩺</div>
                        <h4 className="font-bold text-slate-900">OPD Services</h4>
                        <p className="text-xs text-slate-500 mt-1 font-medium">Open • Closes in 4h 30m</p>

                        <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button className="flex-1 text-xs bg-slate-50 hover:bg-slate-100 py-2 rounded-lg font-bold text-slate-600 flex items-center justify-center gap-1"><PhoneIcon /> Call</button>
                            <button className="flex-1 text-xs bg-slate-50 hover:bg-slate-100 py-2 rounded-lg font-bold text-slate-600 flex items-center justify-center gap-1"><NavigationIcon /> Map</button>
                        </div>
                    </div>

                    {/* Emergency Status Card */}
                    <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm hover:shadow-md transition-shadow relative group">
                        <span className="absolute top-5 right-5 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold uppercase rounded-full border border-red-200">Critical</span>
                        <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mb-3">🚑</div>
                        <h4 className="font-bold text-slate-900">Emergency / Casuality</h4>
                        <p className="text-xs text-slate-500 mt-1 font-medium">24/7 Operational • High Load</p>

                        <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button className="flex-1 text-xs bg-red-50 hover:bg-red-100 py-2 rounded-lg font-bold text-red-600 flex items-center justify-center gap-1"><PhoneIcon /> SOS</button>
                            <button className="flex-1 text-xs bg-slate-50 hover:bg-slate-100 py-2 rounded-lg font-bold text-slate-600 flex items-center justify-center gap-1"><NavigationIcon /> Route</button>
                        </div>
                    </div>

                </div>
            </div>

            {/* 3. COMMUNITY REPORTS FEED */}
            <div>
                <div className="flex justify-between items-end mb-4 px-1">
                    <div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Community Reports</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Real-time updates from students & staff</p>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                        {['All', 'Heavy', 'Closure'].map(f => (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${activeFilter === f ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {!db && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3 mb-6">
                        <WarningIcon />
                        <div>
                            <p className="text-sm font-bold text-orange-800">Connection Offline</p>
                            <p className="text-xs text-orange-600">Community reports are currently read-only.</p>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    {filteredReports.length > 0 ? filteredReports.map(report => (
                        <div key={report.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-start gap-4">
                                {/* Voting Column */}
                                <div className="flex flex-col items-center gap-1 text-slate-400 bg-slate-50 rounded-lg p-1.5 border border-slate-100">
                                    <button onClick={() => handleVote(report.id, 'up')} className="hover:text-green-600 transition-colors"><ThumbUpIcon /></button>
                                    <span className="text-xs font-bold text-slate-700">{report.verificationCount || 0}</span>
                                    <button onClick={() => handleVote(report.id, 'down')} className="hover:text-red-500 transition-colors"><ThumbDownIcon /></button>
                                </div>

                                {/* Content */}
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-slate-900 text-sm">{report.location}</h4>
                                        <span className="text-[10px] text-slate-400 font-mono">{getTimeAgo(report.timestamp)}</span>
                                    </div>
                                    <p className="text-sm text-slate-600 mt-1 leading-snug">{report.description}</p>

                                    <div className="mt-3 flex items-center gap-3">
                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${report.severity === 'heavy' ? 'bg-red-50 text-red-600 border-red-100' :
                                                report.severity === 'moderate' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                                                    'bg-green-50 text-green-600 border-green-100'
                                            }`}>
                                            {report.severity}
                                        </span>
                                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                            <UserIcon /> {report.reporterName}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                            <div className="text-slate-300 mb-2 mx-auto w-fit"><ReportIcon /></div>
                            <p className="text-slate-500 text-sm font-medium">{searchTerm ? 'No reports match your search' : 'No reports yet. Be the first!'}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Action Button */}
            <button
                onClick={() => {
                    if (!db) alert("Database not connected.");
                    else setIsReportModalOpen(true);
                }}
                className="fixed bottom-24 right-5 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-600/30 flex items-center justify-center hover:bg-blue-700 hover:scale-110 active:scale-95 transition-all z-30"
            >
                <PlusIcon />
            </button>

            {/* Report Modal - Placeholder logic for now, utilizing existing Modal component if available or simple prompt fallback */}
            {/* For full implementation, we'd use the TrafficReportModal but pass it props or open state */}

        </div>
    );
};

export default LocalUpdates;