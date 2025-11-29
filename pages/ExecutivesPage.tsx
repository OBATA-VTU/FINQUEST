
import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Executive } from '../types';

export const ExecutivesPage: React.FC = () => {
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExecutives = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'executives'));
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Executive));
            
            // STRICT RANKING LOGIC
            const getRank = (pos: string) => {
                const p = pos.toLowerCase();
                if (p.includes('president') && !p.includes('vice')) return 1;
                if (p.includes('vice president')) return 2;
                if (p.includes('general secretary') && !p.includes('assistant')) return 3;
                if (p.includes('public relations') || p.includes('pro')) return 4;
                if (p.includes('financial secretary')) return 5;
                if (p.includes('treasurer')) return 6;
                if (p.includes('welfare')) return 7;
                if (p.includes('social')) return 8;
                if (p.includes('assistant general secretary')) return 10;
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
    fetchExecutives();
  }, []);

  const president = executives.find(e => {
      const p = e.position.toLowerCase();
      return p.includes('president') && !p.includes('vice');
  });
  const otherExecs = executives.filter(e => e.id !== president?.id);

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <div className="bg-indigo-900 text-white py-20 relative overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center opacity-10"></div>
         <div className="container mx-auto px-4 relative z-10 text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 font-serif">Meet Your Leaders</h1>
            <p className="text-xl text-indigo-200 max-w-2xl mx-auto">The dedicated students serving the Finance Department.</p>
         </div>
      </div>

      <div className="container mx-auto px-4 py-16 -mt-10 relative z-20">
        
        {loading ? (
             <div className="flex justify-center py-20"><div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>
        ) : executives.length === 0 ? (
             <div className="text-center bg-white p-12 rounded-xl shadow">
                 <h3 className="text-lg font-bold">No Executives Added Yet</h3>
                 <p className="text-slate-500">Admins need to populate the executives list from the dashboard.</p>
             </div>
        ) : (
         <>
            {/* President Spotlight (001) */}
            {president && (
                <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden mb-16 flex flex-col md:flex-row border-2 border-amber-400/30 transform hover:-translate-y-1 transition-transform duration-500 relative">
                    {/* Presidential Seal Watermark */}
                    <div className="absolute top-4 right-4 opacity-5 pointer-events-none">
                        <svg className="w-64 h-64 text-indigo-900" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                    </div>

                    <div className="md:w-2/5 h-96 md:h-auto relative bg-slate-200">
                        {president.imageUrl ? (
                            <img src={president.imageUrl} alt={president.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-300 font-bold text-6xl">{president.name.charAt(0)}</div>
                        )}
                        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-indigo-900 to-transparent p-4 md:hidden">
                            <span className="bg-amber-400 text-indigo-950 text-[10px] font-black px-2 py-1 rounded shadow mb-1 inline-block">001</span>
                            <h3 className="text-white text-2xl font-bold font-serif">{president.name}</h3>
                        </div>
                    </div>
                    <div className="md:w-3/5 p-8 md:p-12 flex flex-col justify-center relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="bg-indigo-900 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">001</span>
                            <span className="text-indigo-600 font-bold uppercase tracking-wider text-xs">President</span>
                        </div>
                        <h3 className="hidden md:block text-4xl font-bold text-slate-900 mb-4 font-serif">{president.name}</h3>
                        {president.quote && <p className="text-slate-600 mb-8 italic text-lg leading-relaxed border-l-4 border-amber-400 pl-4">"{president.quote}"</p>}
                        
                        <div className="flex gap-3 mt-4">
                            {president.whatsapp && (
                                <a href={president.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-bold text-sm">
                                    WhatsApp
                                </a>
                            )}
                            {president.email && (
                                <a href={`mailto:${president.email}`} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-bold text-sm">
                                    Email
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Other Executives Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {otherExecs.map(exec => {
                const isPRO = exec.position.toLowerCase().includes('public relations') || exec.position.toLowerCase().includes('pro');
                const isVP = exec.position.toLowerCase().includes('vice president');
                
                return (
                <div key={exec.id} className={`group relative rounded-2xl overflow-hidden transition-all duration-300 flex flex-col ${isPRO ? 'shadow-[0_0_30px_rgba(234,179,8,0.2)] border-2 border-amber-300/50 transform scale-[1.02]' : isVP ? 'border border-slate-300 shadow-xl' : 'shadow-lg bg-white border border-slate-100'}`}>
                    
                    {/* Backgrounds */}
                    {isPRO && <div className="absolute inset-0 bg-gradient-to-b from-indigo-900 to-slate-900 z-0"></div>}
                    {isVP && <div className="absolute inset-0 bg-slate-50 z-0"></div>}
                    {!isPRO && !isVP && <div className="absolute inset-0 bg-white z-0"></div>}

                    {/* Badge */}
                    <div className="absolute top-4 right-4 z-20">
                        {isPRO ? (
                             <span className="bg-gradient-to-r from-amber-300 to-amber-500 text-slate-900 text-[10px] font-black px-3 py-1 rounded-full shadow-lg uppercase tracking-wider flex items-center gap-1">
                                 <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                                 PRO 004
                             </span>
                        ) : (
                             <span className={`font-black text-2xl opacity-20 select-none ${isVP ? 'text-slate-400' : 'text-slate-200'}`}>
                                {(() => {
                                    const p = exec.position.toLowerCase();
                                    if (p.includes('vice')) return '002';
                                    if (p.includes('general secretary') && !p.includes('assistant')) return '003';
                                    if (p.includes('financial')) return '005';
                                    if (p.includes('treasurer')) return '006';
                                    if (p.includes('welfare')) return '007';
                                    if (p.includes('social')) return '008';
                                    if (p.includes('assistant')) return '010';
                                    if (p.includes('librarian')) return '011';
                                    return '';
                                })()}
                             </span>
                        )}
                    </div>

                    <div className="relative z-10 p-6 flex flex-col items-center flex-grow">
                        <div className={`w-32 h-32 rounded-full p-1 mb-4 ${isPRO ? 'bg-gradient-to-tr from-amber-300 to-amber-500' : 'bg-slate-100'}`}>
                            <div className="w-full h-full rounded-full overflow-hidden bg-slate-200">
                                {exec.imageUrl ? (
                                    <img src={exec.imageUrl} alt={exec.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-white text-slate-300 font-bold text-2xl">{exec.name.charAt(0)}</div>
                                )}
                            </div>
                        </div>

                        <div className="text-center w-full mb-4">
                            <h3 className={`text-lg font-bold font-serif mb-1 ${isPRO ? 'text-white' : 'text-slate-800'}`}>{exec.name}</h3>
                            <p className={`font-medium uppercase text-xs tracking-widest ${isPRO ? 'text-amber-400' : 'text-indigo-600'}`}>{exec.position}</p>
                        </div>

                        {exec.quote && <p className={`text-xs italic text-center mb-6 px-4 ${isPRO ? 'text-indigo-200' : 'text-slate-500'}`}>"{exec.quote}"</p>}

                        <div className="mt-auto flex gap-3 justify-center w-full">
                             {exec.whatsapp && (
                                <a href={exec.whatsapp} target="_blank" rel="noopener noreferrer" className={`p-2 rounded-full transition ${isPRO ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-600 hover:bg-green-100 hover:text-green-600'}`}>
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                                </a>
                            )}
                            {exec.email && (
                                <a href={`mailto:${exec.email}`} className={`p-2 rounded-full transition ${isPRO ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-600'}`}>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
                )
            })}
            </div>
         </>
        )}
      </div>
    </div>
  );
};
