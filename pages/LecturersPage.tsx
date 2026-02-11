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
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors font-sans pb-24">
       <div className="bg-indigo-950 text-white py-24 text-center relative overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80')] bg-cover opacity-10 mix-blend-luminosity"></div>
         <div className="absolute inset-0 bg-gradient-to-t from-indigo-950 via-transparent to-transparent"></div>
         <div className="relative z-10 container mx-auto px-4">
            <span className="inline-block py-1.5 px-4 border border-indigo-400/30 rounded-full bg-indigo-950/40 backdrop-blur-md text-indigo-200 text-[10px] font-black tracking-[0.4em] uppercase mb-8 shadow-lg">
                Faculty of Social Sciences
            </span>
            <h1 className="text-5xl md:text-7xl font-black font-serif mb-6 tracking-tight">Our Academic <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-white">Distinguished Faculty</span></h1>
            <p className="text-indigo-200 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed">
                Meet the visionary scholars and industry veterans leading our department into the future of financial excellence.
            </p>
         </div>
       </div>

      <div className="container mx-auto px-4 -mt-16 relative z-20">
        {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bg-white dark:bg-slate-800 rounded-[2.5rem] h-[450px] shadow-xl p-8 flex flex-col items-center space-y-6">
                         <Skeleton variant="circle" className="w-40 h-40" />
                         <Skeleton variant="text" className="w-3/4 h-8" />
                         <Skeleton variant="text" className="w-1/2" />
                         <Skeleton className="h-32 w-full rounded-2xl" />
                    </div>
                ))}
            </div>
        ) : lecturers.length === 0 ? (
             <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-[3rem] shadow-xl border border-dashed border-slate-200 dark:border-slate-700">
                <div className="text-6xl mb-6">🎓</div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Faculty Directory Empty</h2>
                <p className="text-slate-500 mt-2">Administrator needs to populate lecturer profiles.</p>
             </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {lecturers.map(lecturer => (
            <article key={lecturer.id} className="group bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[3rem] overflow-hidden hover:shadow-2xl transition-all duration-500 flex flex-col relative shadow-xl hover:-translate-y-2">
              <div className="p-8 pb-4 flex flex-col items-center flex-1">
                  {/* Avatar - Fixed Overflow/Overshadow Issue */}
                  <div className="relative mb-6">
                      <div className="w-44 h-44 rounded-[2.5rem] overflow-hidden p-1.5 bg-gradient-to-tr from-indigo-500 via-purple-500 to-indigo-500 shadow-2xl transition-transform group-hover:scale-105 duration-500">
                         <div className="w-full h-full rounded-[2.2rem] overflow-hidden bg-slate-200 dark:bg-slate-700">
                            <img src={lecturer.imageUrl} alt={lecturer.name} className="w-full h-full object-cover"/>
                         </div>
                      </div>
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">Faculty Member</div>
                  </div>
                  
                  <div className="text-center w-full mb-6">
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors font-serif mb-1">{lecturer.name}</h3>
                      <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">{lecturer.title}</p>
                      
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] w-full border border-slate-100 dark:border-slate-700">
                        <p className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 20.944A12.02 12.02 0 0012 22a12.02 12.02 0 009-1.056A11.955 11.955 0 0112 2.944z" strokeWidth={3}/></svg>
                            Academic Focus
                        </p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {lecturer.specialization ? lecturer.specialization.split(', ').map((tag, idx) => (
                                <span key={idx} className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[10px] font-bold rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">{tag}</span>
                            )) : <span className="text-xs text-slate-400 italic">Core Finance</span>}
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