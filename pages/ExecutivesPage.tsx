
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
                if (p.includes('financial')) return 4;
                if (p.includes('treasurer')) return 5;
                if (p.includes('public relations') || p.includes('pro')) return 6;
                if (p.includes('welfare')) return 7;
                if (p.includes('social')) return 8;
                if (p.includes('sport')) return 9;
                if (p.includes('academic') || p.includes('librarian')) return 10;
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

  // Returns SVG path data based on role keywords
  const getRoleIcon = (position: string) => {
      const p = position.toLowerCase();
      
      // Sport - Trophy/Ball
      if (p.includes('sport')) return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      ); // Trophy shape roughly

      // Social - Music/Party
      if (p.includes('social')) return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      );

      // Welfare - Heart/Care
      if (p.includes('welfare')) return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      );

      // Finance/Treasurer - Money
      if (p.includes('financ') || p.includes('treasurer')) return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      );

      // PRO - Megaphone
      if (p.includes('public') || p.includes('pro')) return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      );

      // Librarian/Academic - Book
      if (p.includes('lib') || p.includes('academic')) return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      );

      // Gen Sec - Pen
      if (p.includes('secretary')) return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      );

      // President - Star/Badge
      if (p.includes('president')) return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      );

      // Default - User
      return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      );
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-20 font-sans">
      <div className="bg-indigo-900 text-white py-16 text-center shadow-lg relative overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?ixlib=rb-4.0.3')] bg-cover opacity-10"></div>
         <h1 className="text-4xl font-extrabold mb-2 font-serif relative z-10">Meet Your Leaders</h1>
         <p className="text-indigo-200 relative z-10">Executive Council 2025/2026 Session</p>
      </div>

      <div className="container mx-auto px-4 py-12">
        {loading ? <div className="text-center py-20">Loading executives...</div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {executives.map((exec) => (
                    <div key={exec.id} className="relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 group">
                        
                        {/* Unique Background Icon */}
                        <div className="absolute -right-4 -bottom-4 w-40 h-40 text-slate-100 transform rotate-12 opacity-50 group-hover:text-indigo-50 group-hover:scale-110 transition-all duration-500 z-0">
                             <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
                                {getRoleIcon(exec.position)}
                             </svg>
                        </div>

                        <div className="relative z-10 p-6 flex flex-col items-center text-center h-full">
                            <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-slate-200 to-indigo-100 mb-5 shadow-inner">
                                <div className="w-full h-full rounded-full overflow-hidden bg-slate-50">
                                    {exec.imageUrl ? (
                                        <img src={exec.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={exec.name} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-4xl text-slate-300">
                                            {exec.name[0]}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-widest rounded-full mb-3 border border-indigo-100">
                                {exec.position}
                            </span>
                            
                            <h3 className="text-xl font-bold text-slate-900 font-serif mb-2">{exec.name}</h3>
                            
                            <p className="text-sm text-slate-500 italic mb-6 line-clamp-2 px-4">
                                "{exec.quote || 'Serving with integrity and passion.'}"
                            </p>
                            
                            <div className="mt-auto flex gap-3">
                                {exec.whatsapp && (
                                    <a href={exec.whatsapp} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center bg-green-50 text-green-600 rounded-full hover:bg-green-500 hover:text-white transition-all shadow-sm border border-green-100" title="Chat on WhatsApp">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                                    </a>
                                )}
                                {exec.email && (
                                    <a href={`mailto:${exec.email}`} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-600 rounded-full hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-slate-200">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
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
