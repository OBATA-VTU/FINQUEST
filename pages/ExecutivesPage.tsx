
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
            
            // RANKING LOGIC
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
                return 99; // Others
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
      {/* Header */}
      <div className="bg-indigo-900 text-white py-20 relative overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center opacity-10"></div>
         <div className="container mx-auto px-4 relative z-10 text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 font-serif">Meet Your Leaders</h1>
            <p className="text-xl text-indigo-200 max-w-2xl mx-auto">The dedicated students working tirelessly to serve the Finance Department.</p>
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
            {/* President Spotlight */}
            {president && (
                <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden mb-16 flex flex-col md:flex-row border border-slate-100 transform hover:-translate-y-1 transition-transform duration-500">
                    <div className="md:w-2/5 h-96 md:h-auto relative bg-slate-200">
                        <img 
                            src={president.imageUrl} 
                            alt={president.name} 
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-indigo-900 via-transparent to-transparent opacity-80 md:opacity-40"></div>
                        <div className="absolute bottom-4 left-4 md:hidden">
                            <span className="bg-amber-400 text-indigo-950 text-[10px] font-black px-2 py-1 rounded shadow mb-2 inline-block">001</span>
                            <h3 className="text-white text-2xl font-bold font-serif">{president.name}</h3>
                        </div>
                    </div>
                    <div className="md:w-3/5 p-8 md:p-12 flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 text-indigo-900">
                            <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                        </div>
                        <div className="uppercase tracking-wide text-xs text-indigo-600 font-bold mb-3 bg-indigo-50 inline-block px-3 py-1 rounded-full w-fit">President • 001</div>
                        <h3 className="hidden md:block text-4xl font-bold text-slate-900 mb-4 font-serif">{president.name}</h3>
                        <p className="text-slate-600 mb-8 italic text-lg leading-relaxed">"Service to humanity is the best work of life. Together we can achieve greatness."</p>
                        <div className="flex items-center gap-4 border-t border-slate-100 pt-6">
                            <span className="px-4 py-2 bg-slate-50 text-slate-700 rounded-lg text-sm font-bold border border-slate-200">{president.level} Level</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Other Executives Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {otherExecs.map(exec => {
                const isPRO = exec.position.toLowerCase().includes('public relations') || exec.position.toLowerCase().includes('pro');
                
                return (
                <div key={exec.id} className={`group relative rounded-2xl overflow-hidden transition-all duration-300 ${isPRO ? 'shadow-[0_0_40px_rgba(234,179,8,0.3)] hover:shadow-[0_0_60px_rgba(234,179,8,0.5)] scale-[1.02] border border-amber-200' : 'shadow-lg hover:shadow-2xl hover:-translate-y-2 bg-white'}`}>
                    
                    {/* Premium Background for PRO */}
                    {isPRO ? (
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 z-0"></div>
                    ) : (
                        <div className="absolute inset-0 bg-white z-0"></div>
                    )}

                    {/* Badge */}
                    <div className="absolute top-4 right-4 z-20">
                        {isPRO ? (
                             <span className="bg-gradient-to-r from-amber-300 to-amber-500 text-slate-900 text-[10px] font-black px-3 py-1 rounded-full shadow-lg uppercase tracking-wider flex items-center gap-1">
                                 <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                                 PRO
                             </span>
                        ) : (
                             <span className="text-slate-200 font-black text-4xl opacity-50 select-none">
                                {(() => {
                                    const p = exec.position.toLowerCase();
                                    if (p.includes('vice')) return '002';
                                    if (p.includes('general secretary') && !p.includes('assistant')) return '003';
                                    if (p.includes('pro')) return '004';
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

                    <div className="relative z-10 p-6 flex flex-col items-center">
                        {/* Image Ring */}
                        <div className={`w-36 h-36 rounded-full p-1.5 mb-6 group-hover:scale-105 transition-transform duration-500 ${isPRO ? 'bg-gradient-to-tr from-amber-300 via-yellow-400 to-amber-500 animate-pulse' : 'bg-gradient-to-tr from-indigo-100 to-indigo-200'}`}>
                            <div className="w-full h-full rounded-full overflow-hidden bg-slate-200">
                                <img 
                                    src={exec.imageUrl}
                                    alt={exec.name} 
                                    className={`w-full h-full object-cover border-4 ${isPRO ? 'border-slate-800' : 'border-white'}`}
                                />
                            </div>
                        </div>

                        {/* Text Info */}
                        <div className="text-center w-full">
                            <h3 className={`text-xl font-bold font-serif mb-1 ${isPRO ? 'text-white' : 'text-slate-800'}`}>{exec.name}</h3>
                            <p className={`font-medium mb-4 uppercase text-xs tracking-widest ${isPRO ? 'text-amber-400' : 'text-indigo-600'}`}>{exec.position}</p>
                            
                            <div className={`h-px w-16 mx-auto mb-4 ${isPRO ? 'bg-slate-700' : 'bg-slate-100'}`}></div>
                            
                            <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${isPRO ? 'bg-white/10 text-slate-300 border border-white/10' : 'bg-slate-50 text-slate-500'}`}>
                                {exec.level} Level
                            </div>
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
