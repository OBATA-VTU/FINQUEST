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
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lecturer));
        
        // Custom hierarchy sorting: Lower order numbers come first.
        // If order is equal or missing, sort by name.
        data.sort((a, b) => {
          const orderA = a.order ?? 999;
          const orderB = b.order ?? 999;
          if (orderA !== orderB) return orderA - orderB;
          return a.name.localeCompare(b.name);
        });
        
        setLecturers(data);
      } catch (error) {
        console.error("Error fetching lecturers:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLecturers();
  }, []);

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors font-sans pb-24">
       {/* High-End Academic Header */}
       <div className="bg-indigo-950 text-white py-32 text-center relative overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80')] bg-cover opacity-10 mix-blend-overlay animate-kenburns"></div>
         <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-indigo-950/40 to-transparent"></div>
         <div className="relative z-10 container mx-auto px-4">
            <span className="inline-block py-2 px-6 border border-indigo-400/30 rounded-full bg-indigo-900/40 backdrop-blur-md text-indigo-300 text-[10px] font-black tracking-[0.5em] uppercase mb-8 shadow-2xl">
                Faculty of Finance Registry
            </span>
            <h1 className="text-5xl md:text-8xl font-black font-serif mb-6 tracking-tighter leading-none">The <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-white to-indigo-200">Academic Elite</span></h1>
            <p className="text-indigo-100/70 text-lg md:text-2xl max-w-2xl mx-auto font-light leading-relaxed px-6">
                Guiding the next generation of financial leaders through rigorous scholarship and professional excellence.
            </p>
         </div>
       </div>

      <div className="container mx-auto px-4 -mt-16 relative z-20">
        {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bg-white dark:bg-slate-900 rounded-[3.5rem] h-[550px] shadow-2xl p-12 flex flex-col items-center space-y-10 border border-slate-100 dark:border-slate-800">
                         <Skeleton variant="circle" className="w-48 h-48" />
                         <Skeleton variant="text" className="w-3/4 h-10" />
                         <Skeleton variant="text" className="w-1/2" />
                         <div className="flex-1 w-full">
                            <Skeleton className="h-full w-full rounded-[2.5rem]" />
                         </div>
                    </div>
                ))}
            </div>
        ) : lecturers.length === 0 ? (
             <div className="text-center py-32 bg-white dark:bg-slate-900/50 rounded-[4rem] border-2 border-dashed border-slate-200 dark:border-slate-800 shadow-xl max-w-4xl mx-auto">
                <div className="flex justify-center mb-8 opacity-20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M12 14l9-5-9-5-9 5 9 5z" />
                        <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                    </svg>
                </div>
                <h2 className="text-4xl font-black text-slate-800 dark:text-white font-serif mb-4">Registry Maintenance</h2>
                <p className="text-slate-500 dark:text-slate-400 text-xl font-light">The academic faculty profiles are currently being verified for the current session.</p>
             </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {lecturers.map((lecturer, index) => (
            <article 
              key={lecturer.id} 
              className="group bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3.5rem] overflow-hidden hover:shadow-[0_50px_100px_rgba(79,70,229,0.15)] transition-all duration-700 flex flex-col relative shadow-2xl hover:-translate-y-4"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="p-12 pb-8 flex flex-col items-center flex-1">
                  <div className="relative mb-12">
                      <div className="w-56 h-56 rounded-[4rem] overflow-hidden p-2 bg-gradient-to-tr from-indigo-600 via-indigo-400 to-purple-400 shadow-3xl transition-all duration-700 group-hover:rotate-6 group-hover:scale-110">
                         <div className="w-full h-full rounded-[3.5rem] overflow-hidden bg-slate-100 dark:bg-slate-800 relative border-4 border-white dark:border-slate-900">
                            {lecturer.imageUrl ? (
                                <img src={lecturer.imageUrl} alt={lecturer.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-125"/>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-6xl font-black text-slate-300">{lecturer.name.charAt(0)}</div>
                            )}
                         </div>
                      </div>
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-8 py-3 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-[0.3em] shadow-3xl z-10 whitespace-nowrap border-4 border-white dark:border-slate-900">Faculty Core</div>
                  </div>
                  
                  <div className="text-center w-full mb-8">
                      <h3 className="text-3xl font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors font-serif mb-2 leading-tight tracking-tight">{lecturer.name}</h3>
                      <p className="text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-[0.1em] text-sm mb-6">{lecturer.title}</p>
                      
                      <div className="h-px bg-slate-100 dark:bg-slate-800 w-24 mx-auto mb-6"></div>
                      
                      <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Area of Expertise</p>
                          <p className="text-slate-600 dark:text-slate-300 font-medium text-lg leading-relaxed italic">
                              {lecturer.specialization || "Finance Specialist"}
                          </p>
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