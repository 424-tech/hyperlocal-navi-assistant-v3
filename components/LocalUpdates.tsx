
import React, { useState, useEffect } from 'react';
import { getLocalUpdates, LocalUpdatesResult } from '../services/geminiService';
import { GeolocationState, Language, UserTrafficReport } from '../types';
import { LoadingSpinner } from './Icons';
import { translations } from '../translations';
import { db } from '../services/firebase';
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import TrafficReportModal from './TrafficReportModal';

interface LocalUpdatesProps {
  location: GeolocationState;
  manualLocation: string | null;
  language: Language;
}

const MOCK_REPORTS: UserTrafficReport[] = [
    {
        id: 'mock1',
        timestamp: Date.now() - 1000 * 60 * 5,
        severity: 'heavy',
        location: 'Gate 2',
        description: 'Need O+ Blood donor at Gate 2',
        originalText: 'Need O+ Blood donor at Gate 2',
        reporterName: 'Patient Attendant',
        verificationCount: 3
    }
];

const LocalUpdates: React.FC<LocalUpdatesProps> = ({ location, manualLocation, language }) => {
  const [activeTab, setActiveTab] = useState<'hospital' | 'community'>('hospital');
  const [loading, setLoading] = useState(true);
  const [updates, setUpdates] = useState<LocalUpdatesResult | null>(null);
  const [userReports, setUserReports] = useState<UserTrafficReport[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const t = translations[language];

  useEffect(() => {
    if (!db) {
        setUserReports(MOCK_REPORTS);
        return;
    }
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
                reporterName: data.reporterName,
            });
        });
        setUserReports(reports.length > 0 ? reports : MOCK_REPORTS);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchUpdates = async () => {
      setLoading(true);
      const loc = manualLocation || (location.latitude ? { latitude: location.latitude, longitude: location.longitude! } : null);
      const result = await getLocalUpdates(loc, language);
      setUpdates(result);
      setLoading(false);
    };
    fetchUpdates();
  }, [location.latitude, location.longitude, manualLocation, language]);

  return (
    <div className="flex flex-col h-full bg-white font-display overflow-hidden">
      <TrafficReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} language={language} />

      {/* Notice Board Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl px-6 pt-10 pb-0 border-b border-gray-100">
        <div className="flex items-center justify-between mb-5">
          <div className="flex flex-col">
            <h1 className="text-slate-900 text-2xl font-black leading-tight tracking-tight">Notice Board</h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-0.5">ସୂଚନା ଫଳକ • Latest Updates</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </button>
            <button className="relative w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full ring-2 ring-white"></span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex w-full relative">
          <button 
            onClick={() => setActiveTab('hospital')}
            className={`flex-1 pb-4 text-center relative transition-all ${activeTab === 'hospital' ? 'text-primary' : 'text-gray-400'}`}
          >
            <span className="text-sm font-black block tracking-tight">Hospital Updates</span>
            <span className="text-[10px] block font-bold mt-0.5">ଡାକ୍ତରଖାନା ଅପଡେଟ୍</span>
            {activeTab === 'hospital' && <div className="absolute bottom-0 left-1/4 w-1/2 h-0.5 bg-primary rounded-t-full"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('community')}
            className={`flex-1 pb-4 text-center relative transition-all ${activeTab === 'community' ? 'text-primary' : 'text-gray-400'}`}
          >
            <span className="text-sm font-black block tracking-tight">Community Requests</span>
            <span className="text-[10px] block font-bold mt-0.5">ସମ୍ପ୍ରଦାୟ ଅନୁରୋଧ</span>
            {activeTab === 'community' && <div className="absolute bottom-0 left-1/4 w-1/2 h-0.5 bg-primary rounded-t-full"></div>}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar px-6 py-8 bg-slate-50/50">
        {activeTab === 'hospital' ? (
          <div className="space-y-10 animate-fadeIn">
            {/* Today's Briefing */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-black text-slate-800 tracking-tight">Today's Briefing <span className="text-slate-400 text-xs font-bold ml-2">• ଆଜିର ସୂଚନା</span></h2>
                <button className="flex items-center gap-1.5 bg-[#5B92A7]/10 text-[#5B92A7] px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all hover:bg-[#5B92A7]/20 active:scale-95">
                  <span className="material-symbols-outlined text-[16px]">headphones</span> Listen
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center p-12"><LoadingSpinner /></div>
              ) : (
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 snap-x">
                  <BriefingCard icon="traffic" type="Traffic" label={updates?.statuses?.trafficLabel || "Normal"} bg="bg-blue-50/50" iconColor="text-[#8CAEC4]" subText="ଗେଟ୍ ୨ ପାଖରେ ଭିଡ଼" />
                  <BriefingCard icon="local_hospital" type="OPD Status" label={updates?.statuses?.hospitalLabel || "Open"} bg="bg-emerald-50/50" iconColor="text-[#88BFA6]" subText="୫ଟା ଯାଏଁ ଖୋଲା" />
                  <BriefingCard icon="partly_cloudy_day" type="Weather" label={updates?.statuses?.weatherLabel || "32°C, Sunny"} bg="bg-orange-50/50" iconColor="text-[#D9A87E]" subText="୩୨°C, ଖରା" />
                </div>
              )}
            </section>

            {/* Official Notices */}
            <section className="space-y-5">
              <h2 className="text-lg font-black text-slate-800 tracking-tight">Official Notices <span className="text-slate-400 text-xs font-bold ml-2">• ସରକାରୀ ବିଜ୍ଞପ୍ତି</span></h2>
              <NoticeArticle icon="campaign" title="Mask Mandate Update" odia="ମାସ୍କ ବାଧ୍ୟତାମୂଳକ ଅଟେ" time="1h ago" color="blue" content="Masks are now mandatory in ICU and Emergency wards due to seasonal flu rise." odiaContent="ଋତୁକାଳୀନ ଫ୍ଲୁ ଯୋଗୁଁ ICU ଏବଂ ଜରୁରୀକାଳୀନ ୱାର୍ଡରେ ମାସ୍କ ବାଧ୍ୟତାମୂଳକ କରାଯାଇଛି।" />
              <NoticeArticle icon="vaccines" title="Free Vaccination Camp" odia="ମାଗଣା ଟୀକାକରଣ ଶିବିର" time="3h ago" color="orange" content="Available today at Block C, Ground Floor for children under 5 years." odiaContent="୫ ବର୍ଷରୁ କମ୍ ପିଲାମାନଙ୍କ ପାଇଁ ଆଜି ବ୍ଲକ ସି, ଗ୍ରାଉଣ୍ଡ ଫ୍ଲୋରରେ ଉପଲବ୍ଧ।" />
              <NoticeArticle icon="water_drop" title="Blood Donation Drive" odia="ରକ୍ତଦାନ ଶିବିର" time="Yesterday" color="green" content="Join us tomorrow at the main auditorium. Donors get free health checkup." />
            </section>
          </div>
        ) : (
          <div className="space-y-8 animate-fadeIn">
             {/* Community Stats */}
             <div className="bg-white rounded-[2rem] p-6 border border-slate-100 flex items-center gap-5 shadow-sm relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl"></div>
                <div className="relative w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10">
                    <span className="material-symbols-outlined text-[24px]">spa</span>
                </div>
                <div className="relative flex-1">
                    <h2 className="text-base font-black text-slate-800 tracking-tight">Community is Calm</h2>
                    <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-tight">Avg response time: 5 mins • ହାରାହାରି ସମୟ: ୫ ମିନିଟ୍</p>
                </div>
             </div>

             {/* Filters */}
             <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                <button className="flex shrink-0 items-center px-5 py-2 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">All</button>
                <button className="flex shrink-0 items-center gap-2 px-5 py-2 rounded-full bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-slate-50">
                    <span className="material-symbols-outlined text-[16px] text-soft-red">favorite</span> Urgent
                </button>
                <button className="flex shrink-0 items-center gap-2 px-5 py-2 rounded-full bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-slate-50">
                    <span className="material-symbols-outlined text-[16px] text-primary">directions</span> Directions
                </button>
             </div>

             {/* Community Posts */}
             <div className="space-y-5">
                {userReports.map(report => (
                    <article key={report.id} className="bg-white rounded-[2rem] p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border border-slate-100 relative group transition-all hover:shadow-md">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-400">
                                    <span className="material-symbols-outlined text-[20px]">person</span>
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-800 leading-tight">{report.reporterName || 'User'}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">ରୋଗୀ ପରିଚାଳକ • {new Date(report.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                </div>
                            </div>
                            <div className="px-3 py-1.5 rounded-xl bg-soft-red-bg text-soft-red font-black text-[9px] uppercase tracking-widest flex items-center gap-2 border border-soft-red/10">
                                <span className="w-1.5 h-1.5 rounded-full bg-soft-red animate-pulse"></span> Urgent
                            </div>
                        </div>
                        <div className="mb-6">
                            <p className="text-base font-bold text-slate-800 leading-snug mb-1.5">{report.description}</p>
                            <p className="text-xs font-bold text-slate-400 italic">ଜରୁରୀ ସୂଚନା...</p>
                        </div>
                        <button className="w-full flex items-center justify-between px-5 bg-white hover:bg-soft-red-bg/50 border border-slate-200 hover:border-soft-red/30 text-slate-700 h-14 rounded-2xl font-black text-xs transition-all active:scale-[0.98]">
                            <div className="flex flex-col items-start leading-tight">
                                <span className="text-slate-800 uppercase tracking-tight">I can help</span>
                                <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">ମୁଁ ସାହାଯ୍ୟ କରିବି</span>
                            </div>
                            <div className="w-9 h-9 rounded-xl bg-soft-red/10 flex items-center justify-center">
                               <span className="material-symbols-outlined text-[18px] text-soft-red">volunteer_activism</span>
                            </div>
                        </button>
                    </article>
                ))}
             </div>
          </div>
        )}
      </main>

      {/* Post FAB */}
      <button 
        onClick={() => setIsReportModalOpen(true)}
        className="fixed bottom-28 right-8 z-30 flex items-center gap-4 bg-primary hover:bg-[#4A7A8C] text-white h-16 pl-6 pr-7 rounded-[2rem] shadow-xl active:scale-95 transition-all duration-300 group"
      >
        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform">
           <span className="material-symbols-outlined text-[24px]">add</span>
        </div>
        <div className="flex flex-col items-start leading-none">
          <span className="text-sm font-black tracking-tight uppercase">Post Notice</span>
          <span className="text-[9px] font-bold opacity-80 mt-1 uppercase tracking-widest">ନୂଆ ପୋଷ୍ଟ</span>
        </div>
      </button>
    </div>
  );
};

const BriefingCard = ({ icon, type, label, subText, bg, iconColor }: any) => (
    <div className={`snap-start min-w-[160px] ${bg} border border-slate-100 rounded-[2rem] p-5 flex flex-col justify-between h-40 relative overflow-hidden shadow-sm transition-all hover:shadow-md`}>
        <div className="absolute -right-2 -top-2 w-20 h-20 bg-white/40 rounded-full blur-2xl"></div>
        <div className={`w-10 h-10 rounded-2xl bg-white ${iconColor} flex items-center justify-center shadow-sm z-10 border border-white/50`}>
            <span className="material-symbols-outlined text-[22px]">{icon}</span>
        </div>
        <div className="z-10">
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.1em] mb-1">{type}</p>
            <p className="text-sm font-black text-slate-800 leading-tight">{label}</p>
            <p className="text-[10px] text-slate-400 mt-1.5 font-bold">{subText}</p>
        </div>
    </div>
);

const NoticeArticle = ({ icon, title, odia, time, color, content, odiaContent }: any) => {
    const colors: any = {
        blue: 'bg-blue-50 text-blue-600',
        orange: 'bg-orange-50 text-orange-600',
        green: 'bg-green-50 text-green-600'
    };
    return (
        <article className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 hover:border-primary/20 transition-colors">
            <div className="flex gap-4">
                <div className={`w-12 h-12 rounded-2xl ${colors[color]} flex items-center justify-center flex-shrink-0 border border-white/50`}>
                    <span className="material-symbols-outlined text-[22px]">{icon}</span>
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <h3 className="text-base font-black text-slate-800 tracking-tight">{title}</h3>
                        <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 uppercase tracking-tighter">{time}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-black mt-1 mb-3 uppercase tracking-tight opacity-70">{odia}</p>
                    {content && <p className="text-[13px] text-slate-600 leading-relaxed font-bold">{content}</p>}
                    {odiaContent && <p className="text-xs text-slate-400 leading-relaxed mt-2 font-medium italic">{odiaContent}</p>}
                </div>
            </div>
        </article>
    );
};

export default LocalUpdates;
