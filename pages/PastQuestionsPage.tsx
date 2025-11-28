import React, { useState, useMemo, useCallback, useContext, useEffect } from 'react';
import { QuestionCard } from '../components/QuestionCard';
import { UploadButton } from '../components/UploadButton';
import { UploadModal } from '../components/UploadModal';
import { AdBanner } from '../components/AdBanner';
import { PastQuestion, Level } from '../types';
import { MOCK_QUESTIONS, LEVELS } from '../constants';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export const PastQuestionsPage: React.FC = () => {
  const [questions, setQuestions] = useState<PastQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<Level>(100);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const auth = useContext(AuthContext);

  // Fetch Questions from Firestore
  useEffect(() => {
    const fetchQuestions = async () => {
        setLoading(true);
        try {
            const q = query(
                collection(db, "questions"), 
                where("status", "==", "approved")
            );
            const querySnapshot = await getDocs(q);
            const firebaseQuestions: PastQuestion[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                firebaseQuestions.push({ 
                    id: doc.id, 
                    level: data.level,
                    courseCode: data.courseCode,
                    courseTitle: data.courseTitle,
                    year: data.year,
                    fileUrl: data.fileUrl,
                    textContent: data.textContent 
                } as PastQuestion);
            });
            
            // Merge with mocks if firebase empty (for demo)
            if (firebaseQuestions.length === 0) {
                 setQuestions(MOCK_QUESTIONS);
            } else {
                 setQuestions([...MOCK_QUESTIONS, ...firebaseQuestions]);
            }
        } catch (error) {
            console.error("Error fetching questions: ", error);
            setQuestions(MOCK_QUESTIONS);
        } finally {
            setLoading(false);
        }
    };

    fetchQuestions();
  }, []);

  const handleUpload = useCallback((newQuestionData: any) => {
    // Optimistic update handled via re-fetch or listener in real app
  }, []);

  // Filter and Group Logic
  const groupedQuestions = useMemo(() => {
    let filtered = questions.filter(q => q.level === selectedLevel);
    
    if (searchTerm) {
        filtered = filtered.filter(q => 
            q.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
            q.courseTitle.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    // Group by Course Code
    const groups: { [key: string]: PastQuestion[] } = {};
    filtered.forEach(q => {
        const code = q.courseCode.toUpperCase();
        if (!groups[code]) groups[code] = [];
        groups[code].push(q);
    });

    // Sort groups alphabetically
    return Object.keys(groups).sort().reduce((obj, key) => {
        obj[key] = groups[key].sort((a, b) => b.year - a.year); // Sort files by year desc inside group
        return obj;
    }, {} as { [key: string]: PastQuestion[] });

  }, [questions, selectedLevel, searchTerm]);

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="container mx-auto px-4">
            <div className="py-6">
                <h1 className="text-2xl font-bold text-slate-900">Past Question Archive</h1>
                <p className="text-sm text-slate-500">Access and download verified departmental examination papers.</p>
            </div>
            
            {/* Level Tabs */}
            <div className="flex space-x-1 overflow-x-auto scrollbar-hide pb-0">
                {LEVELS.map(lvl => (
                    <button
                        key={lvl}
                        onClick={() => setSelectedLevel(lvl)}
                        className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${
                            selectedLevel === lvl 
                            ? 'border-indigo-600 text-indigo-600' 
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        {lvl} Level
                    </button>
                ))}
            </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
             <div className="relative w-full md:w-96">
                <input
                    type="text"
                    placeholder={`Search ${selectedLevel}L courses...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                />
                <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
             </div>

             <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                 <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:bg-slate-50'}`}
                 >
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                 </button>
                 <button 
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:bg-slate-50'}`}
                 >
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                 </button>
             </div>
        </div>

        {loading ? (
             <div className="flex justify-center py-32">
                 <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div>
             </div>
        ) : Object.keys(groupedQuestions).length === 0 ? (
             <div className="text-center py-24 bg-white rounded-3xl border border-slate-200 border-dashed">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900">No Questions Found</h3>
                <p className="text-slate-500 max-w-xs mx-auto mt-2">There are no uploaded questions for {selectedLevel} Level matching your search.</p>
             </div>
        ) : (
             <div className="space-y-10">
                 {Object.entries(groupedQuestions).map(([code, courseQuestions]: [string, PastQuestion[]]) => (
                     <div key={code} className="animate-fade-in-down">
                         <div className="flex items-center gap-3 mb-4">
                             <div className="h-8 w-1 bg-indigo-500 rounded-full"></div>
                             <h2 className="text-xl font-bold text-slate-800">{code}</h2>
                             <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-1 rounded-full border border-slate-200">
                                {courseQuestions[0].courseTitle}
                             </span>
                             <span className="ml-auto text-xs text-slate-400 font-medium">{courseQuestions.length} Files</span>
                         </div>
                         
                         <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "flex flex-col gap-3"}>
                             {courseQuestions.map(q => (
                                 <QuestionCard key={q.id} question={q} />
                             ))}
                         </div>
                     </div>
                 ))}
             </div>
        )}
        
        <div className="mt-12">
            <AdBanner />
        </div>

        {auth?.user && <UploadButton onClick={() => setIsModalOpen(true)} />}
        <UploadModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)}
          onUpload={handleUpload}
        />
      </div>
    </div>
  );
};