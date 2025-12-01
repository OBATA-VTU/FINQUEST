
import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { Executive } from '../types';

export const ExecutivesPage: React.FC = () => {
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionYear, setSessionYear] = useState('2025/2026');
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const fetchExecutivesAndSettings = async () => {
        try {
            // Fetch Settings first for header and visibility
            const settingsDoc = await getDoc(doc(db, 'content', 'site_settings'));
            if (settingsDoc.exists()) {
                const data = settingsDoc.data();
                if (data.session) setSessionYear(data.session);
                // Default to true if undefined, but respect explicit false
                if (data.showExecutives === false) {
                    setIsVisible(false);
                    setLoading(false);
                    return; // Stop fetching if hidden
                }
            }

            // Fetch Executives
            const snapshot = await getDocs(collection(db, 'executives'));
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Executive));
            
            // STRICT RANKING LOGIC (001 - 011)
            const getRank = (pos: string) => {
                const p = pos.toLowerCase().trim();
                
                // 001 President
                if (p === 'president' || (p.includes('president') && !p.includes('vice'))) return 1;
                
                // 002 Vice President
                if (p.includes('vice president') || p === 'vp') return 2;
                
                // 003 General Secretary (exclude assistant)
                if ((p.includes('general secretary') || p === 'gen sec') && !p.includes('assistant')) return 3;
                
                // 004 Public Relations Officer (PRO)
                if (p.includes('public relations') || p.includes('pro')) return 4;
                
                // 005 Financial Secretary
                if (p.includes('financial') || p === 'fin sec') return 5;
                
                // 006 Welfare
                if (p.includes('welfare')) return 6;
                
                // 007 Treasurer
                if (p.includes('treasurer')) return 7;
                
                // 008 Social Director
                if (p.includes('social')) return 8;
                
                // 009 Sport Director
                if (p.includes('sport')) return 9;
                
                // 010 Assistant General Secretary
                if (p.includes('assistant general secretary') || p === 'ags') return 10;
                
                // 011 Librarian
                if (p.includes('librarian')) return 11;
                
                return 99;
            };

            data.sort((a, b) => getRank(a.position) - getRank(b.position));
            setExecutives(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
    fetchExecutivesAndSettings();
  }, []);

  // Returns SVG path data based on role keywords - HIGHLY SPECIFIC ICONS
  const getRoleIcon = (position: string) => {
      const p = position.toLowerCase();
      
      // Sport - Soccer Ball
      if (p.includes('sport')) return (
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
      );

      // Social - Music Notes / Party
      if (p.includes('social')) return (
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
      );

      // Welfare - Heart in Hand
      if (p.includes('welfare')) return (
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      );

      // Finance/Treasurer - Coins/Money Stack
      if (p.includes('financ') || p.includes('treasurer')) return (
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      );

      // PRO - Megaphone / Broadcast
      if (p.includes('public') || p.includes('pro')) return (
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.43.816 1.035.816 1.73 0 .695-.32 1.3-.816 1.73" />
      );

      // Librarian/Academic - Books
      if (p.includes('lib') || p.includes('academic')) return (
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      );

      // Gen Sec / AGS - Feather Pen (Quill)
      if (p.includes('secretary') || p.includes('sec')) return (
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
      );

      // President OR VP - Badge / Star
      if (p.includes('president')) return (
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      );

      // Default - User
      return (
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-9.375 0" />
      );
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-20 font-sans">
      <div className="bg-indigo-900 text-white py-16 text-center shadow-lg relative overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?ixlib=rb-4.0.3')] bg-cover opacity-10"></div>
         <h1 className="text-4xl font-extrabold mb-2 font-serif relative z-10">Meet Your Leaders</h1>
         <p className="text-indigo-200 relative z-10">Executive Council {sessionYear} Session</p>
      </div>

      <div className="container mx-auto px-4 py-12">
        {!isVisible ? (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-full shadow-lg mb-6">
                    <svg className="w-16 h-16 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                </div>
                <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white mb-2">Coming Soon</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-md">The list of executives for the {sessionYear} session is currently being updated. Please check back later.</p>
            </div>
        ) : loading ? (
            <div className="text-center py-20">Loading executives...</div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {executives.map((exec) => (
                    <article key={exec.id} className="relative bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 dark:border-slate-700 group h-full" itemScope itemType="https://schema.org/Person">
                        
                        {/* Unique Background Icon - High Visibility Watermark */}
                        <div className="absolute -right-6 -bottom-6 w-40 h-40 text-indigo-200 dark:text-slate-600 opacity-40 transform rotate-12 group-hover:scale-110 transition-all duration-500 z-0 pointer-events-none">
                             <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                {getRoleIcon(exec.position)}
                             </svg>
                        </div>

                        <div className="relative z-10 p-6 flex flex-col items-center text-center h-full">
                            <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-slate-200 to-indigo-100 mb-5 shadow-inner shrink-0">
                                <div className="w-full h-full rounded-full overflow-hidden bg-slate-50">
                                    {exec.imageUrl ? (
                                        <img src={exec.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={exec.name} itemProp="image" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-4xl text-slate-300 font-bold bg-slate-50">
                                            {exec.name[0]}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <span className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-widest rounded-full mb-3 border border-indigo-100 dark:border-indigo-800 shrink-0" itemProp="jobTitle">
                                {exec.position}
                            </span>
                            
                            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-serif mb-2" itemProp="name">{exec.name}</h3>
                            
                            <p className="text-sm text-slate-500 dark:text-slate-400 italic mb-6 line-clamp-2 px-4 min-h-[2.5em]">
                                "{exec.quote || 'Serving with integrity and passion.'}"
                            </p>
                            
                            <div className="mt-auto flex gap-3">
                                {exec.whatsapp && (
                                    <a href={exec.whatsapp} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full hover:bg-green-500 hover:text-white transition-all shadow-sm border border-green-100 dark:border-green-800" title="Chat on WhatsApp">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                                    </a>
                                )}
                                {exec.email && (
                                    <a href={`mailto:${exec.email}`} className="w-10 h-10 flex items-center justify-center bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-slate-200 dark:border-slate-600" title="Send Email">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    </a>
                                )}
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};
