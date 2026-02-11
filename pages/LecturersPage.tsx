import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Lecturer } from '../types';
import { Skeleton } from '../components/Skeleton';

export const LecturersPage: React.FC = () => {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLecturers = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'lecturers'));
            setLecturers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lecturer)));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
    fetchLecturers();
  }, []);

  return (
    <div className="bg-white dark:bg-slate-950 min-h-screen transition-colors font-sans pb-24">
       {/* High-End Academic Header */}
       <div className="bg-slate-900 text-white py-32 text-center relative overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80')] bg-cover opacity-10 mix-blend-luminosity animate-kenburns"></div>
         <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
         <div className="relative z-10 container mx-auto px-4">
            <span className="inline-block py-1.5 px-4 border border-indigo-400/30 rounded-full bg-indigo-950/40 backdrop-blur-md text-indigo-300 text-[10px] font-black tracking-[0.4em] uppercase mb-8 shadow-lg">
                Faculty of Social Sciences
            </span>
            <h1 className="text-5xl md:text-8xl font-black font-serif mb-6 tracking-tighter">Academic <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-white">Distinguished Faculty</span></h1>
            <p className="text-indigo-200 text-lg md:text-2xl max-w-3xl mx-auto font-light leading-relaxed px-6">
                Meet the visionary scholars and industry veterans directing the future of financial excellence at AAUA.
            </p>
         </div>
       </div>

      <div className="container mx-auto px-4 py-20 relative z-20">
        {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bg-white dark:bg-slate-900 rounded-[3rem] h-[500px] shadow-xl p-10 flex flex-col items-center space-y-8">
                         <Skeleton variant="circle" className="w-44 h-44" />
                         <Skeleton variant="text" className="w-3/4 h-8" />
                         <Skeleton variant="text" className="w-1/2" />
                         <Skeleton className="h-32 w-full rounded-[2rem]" />
                    </div>
                ))}
            </div>
        ) : lecturers.length === 0 ? (
             <div className="text-center py-32 bg-slate-50 dark:bg-slate-900/50 rounded-[4rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                <div className="text-7xl mb-8 opacity-40">🎓</div>
                <h2 className="text-3xl font-black text-slate-800 dark:text-white">Directory Sync Pending</h2>
                <p className="text-slate-500 mt-3 text-lg">Our academic directory is currently being updated for the current session.</p>
             </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {lecturers.map(lecturer => (
            <article key={lecturer.id} className="group bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3.5rem] overflow-hidden hover:shadow-[0_30px_60px_rgba(79,70,229,0.15)] transition-all duration-700 flex flex-col relative shadow-xl hover:-translate-y-4">
              <div className="p-10 pb-6 flex flex-col items-center flex-1">
                  {/* Fixed Shadow/Crop Issues with a centered profile container */}
                  <div className="relative mb-10">
                      <div className="w-48 h-48 rounded-[3rem] overflow-hidden p-1.5 bg-gradient-to-tr from-indigo-600 via-indigo-400 to-purple-500 shadow-2xl transition-all duration-700 group-hover:rotate-6 group-hover:scale-105">
                         <div className="w-full h-full rounded-[2.75rem] overflow-hidden bg-slate-200 dark:bg-slate-800 relative">
                            {lecturer.imageUrl ? (
                                <img src={lecturer.imageUrl} alt={lecturer.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"/>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-5xl font-black text-slate-400">{lecturer.name.charAt(0)}</div>
                            )}
                         </div>
                      </div>
                      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-[0.25em] shadow-2xl z-10 whitespace-nowrap">Faculty Member</div>
                  </div>
                  
                  <div className="text-center w-full mb-10">
                      <h3 className="text-3xl font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors font-serif mb-2 leading-tight">{lecturer.name}</h3>
                      <p className="text-xs font-black text-indigo-500/60 dark:text-indigo-400/60 uppercase tracking-[0.3em] mb-10">{lecturer.title}</p>
                      
                      <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-[2.5rem] w-full border border-slate-100 dark:border-slate-800 shadow-inner group-hover:border-indigo-100 dark:group-hover:border-indigo-900 transition-colors">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-5 flex items-center justify-center gap-3">
                            <span className="w-1 h-1 bg-indigo-400 rounded-full"></span>
                            Primary Specialization
                            <span className="w-1 h-1 bg-indigo-400 rounded-full"></span>
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                            {lecturer.specialization ? lecturer.specialization.split(', ').map((tag, idx) => (
                                <span key={idx} className="px-4 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-[10px] font-black rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm uppercase tracking-tighter">{tag}</span>
                            )) : <span className="text-[10px] font-black text-slate-400 uppercase">Core Financial Theory</span>}
                        </div>
                      </div>
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