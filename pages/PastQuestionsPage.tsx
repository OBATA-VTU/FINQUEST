
import React, { useState, useMemo, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QuestionCard } from '../components/QuestionCard';
import { UploadButton } from '../components/UploadButton';
import { AdBanner } from '../components/AdBanner';
import { PastQuestion } from '../types';
import { LEVELS } from '../constants';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

export const PastQuestionsPage: React.FC = () => {
  const [questions, setQuestions] = useState<PastQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // Filters
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const auth = useContext(AuthContext);

  useEffect(() => {
    const fetchQuestions = async () => {
        setLoading(true);
        try {
            const q = query(
                collection(db, "questions"), 
                where("status", "==", "approved"),
                orderBy("createdAt", "desc")
            );
            const querySnapshot = await getDocs(q);
            const firebaseQuestions: PastQuestion[] = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return { 
                    id: doc.id, 
                    level: data.level,
                    courseCode: data.courseCode,
                    courseTitle: data.courseTitle,
                    year: data.year,
                    lecturer: data.lecturer,
                    fileUrl: data.fileUrl,
                    storagePath: data.storagePath,
                    textContent: data.textContent,
                    pages: data.pages,
                    createdAt: data.createdAt
                } as PastQuestion;
            });
            setQuestions(firebaseQuestions);
        } catch (error) {
            console.error("Error fetching questions: ", error);
        } finally {
            setLoading(false);
        }
    };
    fetchQuestions();
  }, []); 

  const availableYears = useMemo(() => {
      const years = new Set(questions.map(q => q.year));
      return Array.from(years).sort((a: number, b: number) => b - a);
  }, [questions]);

  const recommendedQuestions = useMemo(() => {
      if (!auth?.user || selectedLevel !== 'all') return [];
      return questions
        .filter(q => q.level === auth.user!.level)
        .sort((a, b) => b.year - a.year)
        .slice(0, 3);
  }, [questions, auth?.user, selectedLevel]);

  const filteredQuestions = useMemo(() => {
    let filtered = [...questions];

    if (selectedLevel !== 'all') {
        filtered = filtered.filter(q => q.level === Number(selectedLevel));
    }

    if (selectedYear !== 'all') {
        filtered = filtered.filter(q => q.year === Number(selectedYear));
    }
    
    if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase().trim();
        filtered = filtered.filter(q => 
            (q.courseCode && q.courseCode.toLowerCase().includes(lowerTerm)) ||
            (q.courseTitle && q.courseTitle.toLowerCase().includes(lowerTerm)) ||
            (q.lecturer && q.lecturer.toLowerCase().includes(lowerTerm))
        );
    }

    return filtered.sort((a, b) => {
        if (sortOrder === 'newest') return (b.createdAt && a.createdAt) ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() : b.year - a.year;
        return (a.createdAt && b.createdAt) ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() : a.year - b.year;
    });

  }, [questions, selectedLevel, searchTerm, selectedYear, sortOrder]);

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen pb-20 transition-colors duration-300">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-16 xl:top-0 z-20 shadow-sm py-4 transition-colors">
        <div className="container mx-auto px-4">
             <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
                 <h1 className="text-2xl font-serif font-bold text-slate-900 dark:text-white">Archives</h1>
                 <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                     <div className="relative"><select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} className="w-full sm:w-32 pl-4 pr-8 py-2.5 bg-slate-50 dark:bg-slate-700 border rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 outline-none appearance-none cursor-pointer"><option value="all">All Levels</option>{LEVELS.map(l => <option key={l} value={l}>{l} Level</option>)}</select><svg className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></div>
                     <div className="relative"><select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-full sm:w-32 pl-4 pr-8 py-2.5 bg-slate-50 dark:bg-slate-700 border rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 outline-none appearance-none cursor-pointer"><option value="all">All Years</option>{availableYears.map(y => <option key={y} value={y}>{y}</option>)}</select><svg className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></div>
                     <div className="relative flex-1 sm:w-80"><input type="text" placeholder="Search by Code, Title or Lecturer" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-700 border rounded-lg text-sm text-slate-900 dark:text-white outline-none shadow-sm" /><svg className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>
                 </div>
             </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        {recommendedQuestions.length > 0 && !searchTerm && selectedLevel === 'all' && (
            <div className="mb-10 animate-fade-in">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Recommended for You ({auth?.user?.level}L)</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><QuestionCard question={recommendedQuestions[0]} /><QuestionCard question={recommendedQuestions[1]} /><QuestionCard question={recommendedQuestions[2]} /></div>
            </div>
        )}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 rounded-lg p-3 mb-8 flex items-center gap-3 text-xs text-blue-800 dark:text-blue-300 font-medium"><span>Showing {filteredQuestions.length} materials. Uploads require approval.</span></div>
        {loading ? <div className="flex justify-center py-32"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div></div> : filteredQuestions.length === 0 ? <div className="text-center py-24 bg-white dark:bg-slate-800 rounded-2xl border border-dashed animate-fade-in"><h3 className="text-lg font-bold text-slate-900 dark:text-white">No Materials Found</h3><p className="text-slate-500 dark:text-slate-400 mt-2">Try adjusting your filters.</p></div> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">{filteredQuestions.map(q => <div key={q.id} className="relative group"><QuestionCard question={q} />{q.lecturer && <div className="absolute top-12 left-4 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur text-[10px] px-2 py-0.5 rounded shadow text-slate-500 dark:text-slate-400 border opacity-0 group-hover:opacity-100">Lecturer: {q.lecturer}</div>}</div>)}</div>}
        <div className="mt-12"><AdBanner /></div>
        {auth?.user && <UploadButton onClick={() => navigate('/upload')} />}
      </div>
    </div>
  );
};
