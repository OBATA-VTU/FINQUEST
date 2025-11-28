
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
    <div className="bg-slate-50 min-h-screen">
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
             <div className="text-center bg-white p-12 rounded-xl shadow">Loading...</div>
        ) : executives.length === 0 ? (
             <div className="text-center bg-white p-12 rounded-xl shadow">
                 <h3 className="text-lg font-bold">No Executives Added Yet</h3>
                 <p className="text-slate-500">Admins need to populate the executives list from the dashboard.</p>
             </div>
        ) : (
         <>
            {/* President Spotlight */}
            {president && (
                <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden mb-16 flex flex-col md:flex-row border border-slate-100">
                    <div className="md:w-2/5 h-80 md:h-auto relative bg-slate-200">
                        <img 
                            src={president.imageUrl} 
                            alt={president.name} 
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/80 to-transparent md:hidden flex items-end p-6">
                            <h3 className="text-white text-2xl font-bold">{president.name}</h3>
                        </div>
                    </div>
                    <div className="md:w-3/5 p-8 md:p-12 flex flex-col justify-center">
                        <div className="uppercase tracking-wide text-sm text-indigo-600 font-bold mb-2 bg-indigo-50 inline-block px-3 py-1 rounded-full w-fit">001 • {president.position}</div>
                        <h3 className="hidden md:block text-3xl font-bold text-slate-900 mb-4 font-serif">{president.name}</h3>
                        <p className="text-slate-600 mb-6 italic">"Leading with integrity and vision to ensure every finance student has the resources they need to succeed."</p>
                        <div className="flex items-center gap-4">
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm font-medium border border-slate-200">{president.level} Level</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Other Executives Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {otherExecs.map(exec => (
                <div key={exec.id} className="group bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border border-slate-100 flex flex-col items-center p-8 text-center relative">
                    <div className="absolute top-4 right-4 text-slate-200 font-black text-4xl opacity-50 z-0">
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
                    </div>
                    <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-indigo-500 to-rose-500 mb-6 group-hover:scale-105 transition-transform duration-300 z-10 relative">
                        <img 
                            src={exec.imageUrl}
                            alt={exec.name} 
                            className="w-full h-full rounded-full object-cover border-4 border-white bg-slate-200" 
                        />
                    </div>
                    <div className="z-10 relative">
                        <h3 className="text-xl font-bold text-slate-800 mb-1 font-serif">{exec.name}</h3>
                        <p className="text-indigo-600 font-medium mb-3 uppercase text-xs tracking-wider">{exec.position}</p>
                        <div className="w-10 h-1 bg-slate-200 rounded-full mb-4 mx-auto group-hover:bg-indigo-500 transition-colors"></div>
                        <p className="text-sm text-slate-500">{exec.level} Level</p>
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
