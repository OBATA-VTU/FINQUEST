
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

  // Split Executives by Rank
  const getRank = (pos: string) => {
      const p = pos.toLowerCase();
      if (p.includes('president') && !p.includes('vice')) return 1;
      if (p.includes('vice president')) return 2;
      if (p.includes('general secretary') && !p.includes('assistant')) return 3;
      if (p.includes('public relations') || p.includes('pro')) return 4;
      return 99;
  };

  const president = executives.find(e => getRank(e.position) === 1);
  const vp = executives.find(e => getRank(e.position) === 2);
  const genSec = executives.find(e => getRank(e.position) === 3);
  const pro = executives.find(e => getRank(e.position) === 4);
  const others = executives.filter(e => getRank(e.position) > 4);

  const ContactLinks = ({ exec }: { exec: Executive }) => (
      <div className="flex gap-2 justify-center mt-3">
          {exec.whatsapp && (
              <a href={exec.whatsapp} target="_blank" rel="noopener noreferrer" className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 shadow-sm transition">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
              </a>
          )}
          {exec.email && (
              <a href={`mailto:${exec.email}`} className="p-2 bg-slate-800 text-white rounded-full hover:bg-slate-700 shadow-sm transition">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </a>
          )}
      </div>
  );

  return (
    <div className="bg-slate-50 min-h-screen pb-20 font-sans">
      <div className="bg-indigo-900 text-white py-16 text-center shadow-lg relative overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?ixlib=rb-4.0.3')] bg-cover opacity-10"></div>
         <h1 className="text-4xl font-extrabold mb-2 font-serif relative z-10">Meet Your Leaders</h1>
         <p className="text-indigo-200 relative z-10">Executive Council 2025/2026 Session</p>
      </div>

      <div className="container mx-auto px-4 -mt-10 relative z-20 space-y-10">
        
        {loading ? <div className="text-center py-20">Loading executives...</div> : (
         <>
            {/* 001: PRESIDENT (Standard, Large) */}
            {president && (
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-amber-400 max-w-4xl mx-auto transform hover:-translate-y-1 transition-all">
                    <div className="flex flex-col md:flex-row">
                        <div className="md:w-1/2 h-80 md:h-auto bg-slate-200">
                            {president.imageUrl && <img src={president.imageUrl} className="w-full h-full object-cover" />}
                        </div>
                        <div className="md:w-1/2 p-10 flex flex-col justify-center text-center md:text-left">
                            <span className="text-amber-500 font-black tracking-[0.2em] text-xs uppercase mb-2">001 • The President</span>
                            <h2 className="text-3xl font-bold text-slate-900 mb-2 font-serif">{president.name}</h2>
                            <p className="text-slate-500 italic mb-6">"{president.quote || 'Leading with integrity.'}"</p>
                            <div className="mt-auto">
                                <ContactLinks exec={president} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 002 & 003: VP & GEN SEC (Silver & Bronze) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {vp && (
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-300 flex flex-col">
                        <div className="h-64 bg-slate-200 relative">
                            {vp.imageUrl && <img src={vp.imageUrl} className="w-full h-full object-cover" />}
                            <div className="absolute top-4 left-4 bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full shadow">002</div>
                        </div>
                        <div className="p-6 text-center flex-1 flex flex-col">
                            <h3 className="text-xl font-bold text-slate-800">{vp.name}</h3>
                            <p className="text-slate-500 text-sm font-bold uppercase mb-2">Vice President</p>
                            <p className="text-xs text-slate-400 italic mb-4">"{vp.quote}"</p>
                            <div className="mt-auto"><ContactLinks exec={vp} /></div>
                        </div>
                    </div>
                )}
                {genSec && (
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-orange-200 flex flex-col">
                        <div className="h-64 bg-slate-200 relative">
                            {genSec.imageUrl && <img src={genSec.imageUrl} className="w-full h-full object-cover" />}
                            <div className="absolute top-4 left-4 bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full shadow">003</div>
                        </div>
                        <div className="p-6 text-center flex-1 flex flex-col">
                            <h3 className="text-xl font-bold text-slate-800">{genSec.name}</h3>
                            <p className="text-orange-600 text-sm font-bold uppercase mb-2">General Secretary</p>
                            <p className="text-xs text-slate-400 italic mb-4">"{genSec.quote}"</p>
                            <div className="mt-auto"><ContactLinks exec={genSec} /></div>
                        </div>
                    </div>
                )}
            </div>

            {/* 004: PRO (Special Highlight, Cyan/Blue, Distinctive) */}
            {pro && (
                <div className="max-w-md mx-auto relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
                    <div className="relative bg-white rounded-2xl p-6 shadow-xl border border-cyan-100 text-center">
                        <div className="w-32 h-32 mx-auto rounded-full p-1 bg-gradient-to-tr from-cyan-400 to-blue-500 mb-4">
                            <div className="w-full h-full rounded-full overflow-hidden bg-slate-100">
                                {pro.imageUrl && <img src={pro.imageUrl} className="w-full h-full object-cover" />}
                            </div>
                        </div>
                        <span className="bg-cyan-100 text-cyan-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">004 • PRO</span>
                        <h3 className="text-2xl font-bold text-slate-900 font-serif">{pro.name}</h3>
                        <p className="text-sm text-slate-500 uppercase tracking-widest font-semibold mb-4">Public Relations Officer</p>
                        <p className="text-sm text-slate-600 italic mb-6">"{pro.quote}"</p>
                        <ContactLinks exec={pro} />
                    </div>
                </div>
            )}

            {/* 005-011: The Rest (Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {others.map(exec => (
                    <div key={exec.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
                        <div className="w-16 h-16 rounded-full bg-slate-200 overflow-hidden shrink-0">
                            {exec.imageUrl && <img src={exec.imageUrl} className="w-full h-full object-cover" />}
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800">{exec.name}</h4>
                            <p className="text-xs text-indigo-600 font-bold uppercase">{exec.position}</p>
                            <div className="mt-2 flex gap-2">
                                {exec.whatsapp && <a href={exec.whatsapp} className="text-green-500 hover:text-green-700"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg></a>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
         </>
        )}
      </div>
    </div>
  );
};
