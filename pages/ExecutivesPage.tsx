import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { Executive } from '../types';
import { VerificationBadge } from '../components/VerificationBadge';
import { Skeleton } from '../components/Skeleton';

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
                if (!pos) return 100;
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
    <div className="bg-white dark:bg-slate-950 min-h-screen pb-20 font-sans transition-colors">
      <div className="bg-slate-950 text-white py-32 text-center relative overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?ixlib=rb-4.0.3')] bg-cover opacity-20 mix-blend-overlay"></div>
         <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>
         <div className="relative z-10 container mx-auto px-4">
             <span className="inline-block py-1.5 px-4 border border-indigo-400/30 rounded-full bg-indigo-950/40 backdrop-blur-md text-indigo-200 text-[10px] font-black tracking-[0.4em] uppercase mb-8 shadow-lg">
                FINSA Executive Council
             </span>
             <h1 className="text-5xl md:text-8xl font-black font-serif mb-6 tracking-tighter">The Guardians of <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-white to-indigo-200">Financial Excellence</span></h1>
             <p className="text-slate-400 text-xl max-w-xl mx-auto font-light leading-relaxed">Leading the {sessionYear} Academic Session with integrity and vision.</p>
         </div>
      </div>

      <div className="container mx-auto px-4 py-20 -mt-20 relative z-20">
        {!isVisible ? (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl p-16 max-w-3xl mx-auto border border-slate-100 dark:border-slate-800">
                <div className="bg-indigo-50 dark:bg-indigo-900/30 p-8 rounded-[2rem] mb-8">
                    <svg className="w-16 h-16 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                </div>
                <h2 className="text-3xl font-serif font-black text-slate-900 dark:text-white mb-4">Directory Under Update</h2>
                <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed">The executive council records are currently being verified for the {sessionYear} academic session. Official profiles will be available soon.</p>
            </div>
        ) : loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bg-white dark:bg-slate-900 rounded-[3rem] h-[480px] shadow-xl p-10 space-y-6 flex flex-col items-center">
                        <Skeleton variant="circle" className="w-32 h-32" />
                        <Skeleton variant="text" className="w-3/4 h-8" />
                        <Skeleton variant="text" className="w-1/2 h-4" />
                        <Skeleton className="h-32 w-full rounded-[2rem]" />
                    </div>
                ))}
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {executives.map((exec) => (
                    <div key={exec.id} className="bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden shadow-xl hover:shadow-[0_20px_50px_rgba(79,70,229,0.15)] transition-all duration-500 border border-slate-100 dark:border-slate-800 group relative flex flex-col hover:-translate-y-2">
                        
                        <div className="p-10 flex flex-col items-center flex-1">
                            {/* Leadership Avatar */}
                            <div className="relative mb-8">
                                <div className="w-32 h-32 rounded-[2.5rem] bg-indigo-50 dark:bg-slate-800 p-1.5 shadow-2xl group-hover:rotate-6 transition-transform duration-500">
                                    <div className="w-full h-full rounded-[2.2rem] overflow-hidden bg-slate-200 dark:bg-slate-700 relative">
                                        {exec.imageUrl ? (
                                            <img src={exec.imageUrl} className="w-full h-full object-cover" alt={exec.name} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-4xl font-black text-slate-400">{exec.name.charAt(0)}</div>
                                        )}
                                    </div>
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-900 rounded-full p-1.5 shadow-xl z-10 border border-indigo-100 dark:border-slate-800">
                                    <VerificationBadge role="executive" isVerified={true} className="w-6 h-6" />
                                </div>
                            </div>

                            <div className="text-center w-full mb-8">
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 font-serif group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight">{exec.name}</h3>
                                <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] mb-6 inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 rounded-full border border-indigo-100 dark:border-indigo-800">{exec.position}</p>
                                
                                <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                    <p className="text-sm text-slate-500 dark:text-slate-400 italic leading-relaxed font-medium">
                                        "{exec.quote || 'Committed to elevating the academic and social standards of FINSA.'}"
                                    </p>
                                </div>
                            </div>

                            <div className="w-full mt-auto flex justify-center gap-4">
                                {exec.whatsapp && (
                                    <a href={exec.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all duration-300 shadow-sm border border-emerald-100 dark:border-emerald-800">
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                                    </a>
                                )}
                                {exec.email && (
                                    <a href={`mailto:${exec.email}`} className="flex items-center justify-center w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all duration-300 shadow-sm border border-indigo-100 dark:border-indigo-800">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 00-2-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
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