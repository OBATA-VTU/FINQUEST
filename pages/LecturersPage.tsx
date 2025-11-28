import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Lecturer } from '../types';

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
    <div className="bg-white min-h-screen">
       <div className="bg-slate-50 border-b border-slate-200 py-16">
         <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-serif text-slate-900 mb-4">Department Lecturers</h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Distinguished scholars and industry experts shaping the future of finance at Adekunle Ajasin University.
            </p>
         </div>
       </div>

      <div className="container mx-auto px-4 py-16">
        {loading ? <div className="text-center">Loading...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {lecturers.map(lecturer => (
            <div key={lecturer.id} className="group bg-white border border-slate-200 rounded-xl p-6 hover:shadow-xl hover:border-indigo-300 transition-all duration-300 flex flex-col sm:flex-row gap-6">
              <div className="shrink-0 relative">
                 <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden bg-slate-200">
                    <img src={lecturer.imageUrl} alt={lecturer.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                 </div>
              </div>
              <div className="flex-1">
                 <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{lecturer.name}</h3>
                 <p className="text-slate-500 font-medium">{lecturer.title}</p>
                 <div className="mt-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Research Interests</p>
                    <div className="flex flex-wrap gap-2">
                        {lecturer.specialization.split(', ').map((tag, idx) => (
                            <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md border border-slate-200">{tag}</span>
                        ))}
                    </div>
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