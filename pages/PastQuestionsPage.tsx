
import React, { useState, useMemo, useCallback, useContext, useEffect } from 'react';
import { QuestionCard } from '../components/QuestionCard';
import { AdBanner } from '../components/AdBanner';
import { PastQuestion, User } from '../types';
import { LEVELS } from '../constants';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = ["All", "Past Question", "Lecture Note", "Handout", "Textbook", "Other"];

export const PastQuestionsPage: React.FC = () => {
  const [questions, setQuestions] = useState<PastQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [questionsQuerySnapshot, usersQuerySnapshot] = await Promise.all([
                getDocs(query(collection(db, "questions"), where("status", "==", "approved"))),
                getDocs(collection(db, "users"))
            ]);

            const usersData: Record<string, string> = {};
            usersQuerySnapshot.forEach(doc => {
                const userData = doc.data() as User;
                usersData[doc.id] = userData.username || userData.name;
            });
            setUserMap(usersData);

            const firebaseQuestions = questionsQuerySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PastQuestion));
            setQuestions(firebaseQuestions);
        } catch (error) {
            console.error("Error fetching data: ", error);
        } finally {
            setLoading(false);
        }
    };
    fetchAllData();
  }, []);

  // Main Filter Logic
  const filteredQuestions = useMemo(() => {
    let filtered = questions;

    if (selectedLevel !== 'all') {
        filtered = filtered.filter(q => String(q.level) === selectedLevel);
    }
    
    if (selectedCategory !== 'All') {
        filtered = filtered.filter(q => q.category === selectedCategory);
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
        if (sortOrder === 'newest') return (b.year || 0) - (a.year || 0) || new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        return (a.year || 0) - (b.year || 0) || new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    });

  }, [questions, selectedLevel, searchTerm, selectedCategory, sortOrder]);

  const FilterPanel = () => (
    <div className="w-full lg:w-72 lg:flex-shrink-0 space-y-6">
        {/* Search */}
        <div className="relative">
            <input
                type="text"
                placeholder="Search by code, title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
            />
            <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        
        {/* Redesigned Filters with Dropdowns */}
        <div>
            <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Category</label>
            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none appearance-none">
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
        </div>
        
        <div>
            <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Level</label>
            <select value={selectedLevel} onChange={e => setSelectedLevel(e.target.value)} className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none appearance-none">
                <option value="all">All Levels</option>
                {LEVELS.map(l => <option key={l} value={String(l)}>{l === 'General' ? l : `${l} Level`}</option>)}
            </select>
        </div>

        {/* Sort */}
        <div>
            <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Sort by</label>
            <select value={sortOrder} onChange={e => setSortOrder(e.target.value as any)} className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none appearance-none">
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
            </select>
        </div>

        <button onClick={() => navigate('/upload')} className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-600 transition-transform hover:-translate-y-1">
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Contribute Material
        </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 transition-colors duration-300">
      
      <header className="bg-white dark:bg-slate-900 py-6 border-b border-slate-100 dark:border-slate-800 text-center">
        <div className="container mx-auto px-4">
            <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">Resources Archives</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Find past questions, lecture notes, and other study materials.</p>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
            <aside className="lg:sticky lg:top-8 lg:self-start">
                <FilterPanel />
            </aside>
            
            <main className="flex-1 min-w-0">
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => <div key={i} className="h-48 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse"></div>)}
                    </div>
                ) : filteredQuestions.length === 0 ? (
                    <div className="text-center py-24 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 animate-fade-in flex flex-col items-center">
                        <svg className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Materials Found</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm">Try adjusting your filters or contributing new material. If you believe this is an error, please wait a moment for the database to sync.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-in">
                        {filteredQuestions.map(q => {
                            const uploaderName = userMap[q.uploadedBy || ''] || q.uploadedByEmail || 'Admin';
                            return (
                                <div key={q.id} className="relative group">
                                    <QuestionCard question={q} uploaderName={uploaderName} />
                                </div>
                            );
                        })}
                    </div>
                )}
                
                <div className="mt-12"><AdBanner /></div>
            </main>
        </div>
      </div>
    </div>
  );
};
