
import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { Executive } from '../types';
import { VerificationBadge } from '../components/VerificationBadge';

export const ExecutivesPage: React.FC = () => {
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionYear, setSessionYear] = useState('2025/2026');
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const fetchExecutivesAndSettings = async () => {
        try {
            const settingsDoc = await getDoc(doc(db, 'content', 'site_settings'));
            if (settingsDoc.exists()) {
                const data = settingsDoc.data();
                if (data.session) setSessionYear(data.session);
                if (data.showExecutives === false) {
                    setIsVisible(false);
                    setLoading(false);
                    return; 
                }
            }

            const snapshot = await getDocs(collection(db, 'executives'));
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Executive));
            
            const getRank = (pos: string) => {
                const p = pos.toLowerCase().trim();
                if (p === 'president' || (p.includes('president') && !p.includes('vice'))) return 1;
                if (p.includes('vice president') || p === 'vp') return 2;
                if ((p.includes('general secretary') || p === 'gen sec') && !p.includes('assistant')) return 3;
                if (p.includes('public relations') || p.includes('pro')) return 4;
                if (p.includes('financial') || p === 'fin sec') return 5;
                if (p.includes('welfare')) return 6;
                if (p.includes('treasurer')) return 7;
                if (p.includes('social')) return 8;
                if (p.includes('sport')) return 9;
                if (p.includes('assistant general secretary') || p === 'ags') return 10;
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

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen pb-20 font-sans transition-colors">
      <div className="bg-indigo-900 dark:bg-slate-950 text-white py-20 text-center shadow-lg relative overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?ixlib=rb-4.0.3')] bg-cover opacity-10 mix-blend-overlay"></div>
         <div className="absolute inset-0 bg-gradient-to-t from-indigo-900 dark:from-slate-950 via-transparent to-transparent"></div>
         <div className="relative z-10 container mx-auto px-4">
             <span className="inline-block py-1 px-3 border border-white/20 rounded-full bg-white/5 backdrop-blur-sm text-indigo-200 text-xs font-bold tracking-[0.2em] uppercase mb-4">Leadership</span>
             <h1 className="text-4xl md:text-5xl font-extrabold mb-4 font-serif">Executive Council</h1>
             <p className="text-indigo-100 text-lg max-w-xl mx-auto font-light">{sessionYear} Academic Session</p>
         </div>
      </div>

      <div className="container mx-auto px-4 py-16 -mt-10 relative z-20">
        {!isVisible ? (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-10 max-w-2xl mx-auto">
                <div className="bg-indigo-50 dark:bg-indigo-900/30 p-6 rounded-full mb-6">
                    <svg className="w-12 h-12 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                </div>
                <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-white mb-3">Under Review</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-md">The executive council directory for {sessionYear} is currently being updated by the administration. Please check back soon.</p>
            </div>
        ) : loading ? (
            <div className="text-center py-20 dark:text-slate-400">Loading executives...</div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {executives.map((exec) => (
                    <div key={exec.id} className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 dark:border-slate-700 group relative flex flex-col h-full">
                        
                        {/* Card Header Pattern */}
                        <div className="h-24 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 relative">
                            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500 to-transparent"></div>
                        </div>

                        <div className="px-6 flex flex-col items-center -mt-12 flex-1">
                            {/* Avatar */}
                            <div className="relative mb-4">
                                <div className="w-24 h-24 rounded-2xl bg-white dark:bg-slate-800 p-1 shadow-lg transform rotate-3 group-hover:rotate-0 transition-transform duration-300">
                                    <div className="w-full h-full rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 relative">
                                        {exec.imageUrl ? (
                                            <img src={exec.imageUrl} className="w-full h-full object-cover" alt={exec.name} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-slate-400">{exec.name.charAt(0)}</div>
                                        )}
                                    </div>
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-900 rounded-full p-1 shadow-md z-10">
                                    <VerificationBadge role="executive" isVerified={true} className="w-5 h-5" />
                                </div>
                            </div>

                            <div className="text-center w-full mb-6">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 font-serif group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{exec.name}</h3>
                                <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-3">{exec.position}</p>
                                
                                <div className="w-12 h-1 bg-slate-100 dark:bg-slate-700 rounded-full mx-auto mb-4"></div>
                                
                                <p className="text-sm text-slate-500 dark:text-slate-400 italic leading-relaxed px-4">
                                    "{exec.quote || 'Dedicated to serving the department.'}"
                                </p>
                            </div>

                            <div className="w-full mt-auto pb-6 pt-4 border-t border-slate-50 dark:border-slate-700/50 flex justify-center gap-3">
                                {exec.whatsapp && (
                                    <a href={exec.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors text-xs font-bold">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                                        WhatsApp
                                    </a>
                                )}
                                {exec.email && (
                                    <a href={`mailto:${exec.email}`} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-xs font-bold">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 00-2-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                        Email
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};
