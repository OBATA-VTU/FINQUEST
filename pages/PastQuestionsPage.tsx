import React, { useState, useMemo, useCallback, useContext, useEffect } from 'react';
import { LevelSelector } from '../components/LevelSelector';
import { QuestionGrid } from '../components/QuestionGrid';
import { UploadButton } from '../components/UploadButton';
import { UploadModal } from '../components/UploadModal';
import { AdBanner } from '../components/AdBanner';
import { PastQuestion, Level } from '../types';
import { MOCK_QUESTIONS } from '../constants';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

export const PastQuestionsPage: React.FC = () => {
  const [questions, setQuestions] = useState<PastQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<Level>(100);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
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
                    textContent: data.textContent // Handle text content
                } as PastQuestion);
            });
            
            if (firebaseQuestions.length === 0) {
                 setQuestions(MOCK_QUESTIONS);
            } else {
                 setQuestions([...MOCK_QUESTIONS, ...firebaseQuestions]);
            }
        } catch (error) {
            console.error("Error fetching questions: ", error);
            // Fallback to mocks on error
            setQuestions(MOCK_QUESTIONS);
        } finally {
            setLoading(false);
        }
    };

    fetchQuestions();
  }, []);

  const handleLevelSelect = useCallback((level: Level) => {
    setSelectedLevel(level);
    setSearchTerm(''); 
  }, []);

  const handleUpload = useCallback((newQuestionData: any) => {
    // Optimistic update isn't strictly necessary since it goes to pending,
    // but if we wanted to show it:
    // setQuestions(prev => [newQuestionData, ...prev]);
  }, []);

  const filteredQuestions = useMemo(() => {
    const sourceQuestions = searchTerm
      ? questions
      : questions.filter(q => q.level === selectedLevel);

    const searchedQuestions = searchTerm
      ? sourceQuestions.filter(q =>
          q.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.courseTitle.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : sourceQuestions;

    return [...searchedQuestions].sort((a, b) => {
      if (sortOrder === 'newest') {
        return b.year - a.year;
      }
      return a.year - b.year;
    });
  }, [questions, selectedLevel, searchTerm, sortOrder]);

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="bg-indigo-900 text-white py-12 mb-8">
        <div className="container mx-auto px-4">
            <h1 className="text-3xl font-bold mb-2">Past Question Archive</h1>
            <p className="text-indigo-200">Access previous examination papers to aid your study and preparation.</p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 pb-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64 shrink-0">
             <div className="sticky top-24">
               <LevelSelector selectedLevel={selectedLevel} onSelectLevel={handleLevelSelect} />
               <div className="mt-6 bg-indigo-50 p-4 rounded-xl border border-indigo-100 hidden lg:block">
                  <h4 className="font-bold text-indigo-900 text-sm mb-2">Study Tip</h4>
                  <p className="text-xs text-indigo-700 leading-relaxed">
                    Reviewing questions from the last 3 years gives you an 80% better chance of understanding current exam patterns.
                  </p>
               </div>
             </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[500px]">
                {/* Toolbar */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8 pb-6 border-b border-slate-100">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">
                        {searchTerm ? 'Search Results' : `${selectedLevel} Level Questions`}
                        </h2>
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                            {filteredQuestions.length} Documents Found
                        </span>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="relative grow md:grow-0">
                            <input
                            type="text"
                            placeholder="Search code or title..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:w-64 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white transition text-sm"
                            />
                            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <select 
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value as any)}
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2"
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                        </select>
                    </div>
                </div>

              {loading ? (
                  <div className="flex justify-center py-20">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                  </div>
              ) : (
                  <QuestionGrid questions={filteredQuestions} />
              )}
            </div>
            
            <AdBanner />
          </div>
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