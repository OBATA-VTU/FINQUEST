
import React, { useState, useCallback, useContext, useEffect } from 'react';
import { QuestionCard } from '../components/QuestionCard';
import { AdBanner } from '../components/AdBanner';
import { PastQuestion, User } from '../types';
import { LEVELS } from '../constants';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';

const CATEGORIES = ["All", "Past Question", "Test Question", "Lecture Note", "Handout", "Textbook", "Other"];

interface FilterPanelProps {
  localSearchTerm: string;
  onSearchTermChange: (term: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  selectedLevel: string;
  onLevelChange: (level: string) => void;
  sortOrder: 'newest' | 'oldest';
  onSortOrderChange: (order: 'newest' | 'oldest') => void;
  onContributeClick: () => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  localSearchTerm, onSearchTermChange, onSearchSubmit,
  selectedCategory, onCategoryChange,
  selectedLevel, onLevelChange,
  sortOrder, onSortOrderChange,
  onContributeClick
}) => (
  <div className="w-full lg:w-80 lg:flex-shrink-0 space-y-6">
      {/* Search */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Search Vault</h4>
          <form onSubmit={onSearchSubmit}>
              <div className="relative">
                  <input
                      type="text"
                      placeholder="Course code or title..."
                      value={localSearchTerm}
                      onChange={(e) => onSearchTermChange(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                  <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
          </form>
      </div>
      
      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-6">
          <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Resource Category</label>
              <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                      <button 
                        key={cat} 
                        onClick={() => onCategoryChange(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${selectedCategory === cat ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}
                      >
                          {cat}
                      </button>
                  ))}
              </div>
          </div>
          
          <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Academic Level</label>
              <select value={selectedLevel} onChange={e => onLevelChange(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
                  <option value="all">All Levels</option>
                  {LEVELS.map(l => <option key={l} value={String(l)}>{l === 'General' ? l : `${l} Level`}</option>)}
              </select>
          </div>

          <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Sort Arrangement</label>
              <select value={sortOrder} onChange={e => onSortOrderChange(e.target.value as any)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
              </select>
          </div>
      </div>

      <button onClick={onContributeClick} className="w-full group flex items-center justify-center gap-3 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all hover:-translate-y-1 active:scale-95 uppercase tracking-widest text-[10px]">
           <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
          Contribute Resource
      </button>
  </div>
);

export const PastQuestionsPage: React.FC = () => {
  const [filteredQuestions, setFilteredQuestions] = useState<PastQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  useEffect(() => {
    const fetchFilteredData = async () => {
        setLoading(true);
        try {
            let constraints = [where("status", "==", "approved")];

            if (selectedLevel !== 'all') {
                constraints.push(where("level", "==", selectedLevel === 'General' ? 'General' : Number(selectedLevel)));
            }
            
            if (selectedCategory !== 'All') {
                constraints.push(where("category", "==", selectedCategory));
            }

            const q = query(collection(db, "questions"), ...constraints);
            const querySnapshot = await getDocs(q);
            let results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PastQuestion));

            if (searchTerm) {
                const lowerTerm = searchTerm.toLowerCase().trim();
                results = results.filter(res => 
                    (res.courseCode?.toLowerCase().includes(lowerTerm)) ||
                    (res.courseTitle?.toLowerCase().includes(lowerTerm)) ||
                    (res.lecturer?.toLowerCase().includes(lowerTerm))
                );
            }

            results.sort((a, b) => {
                const dateA = new Date(a.createdAt || 0).getTime();
                const dateB = new Date(b.createdAt || 0).getTime();
                return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
            });

            setFilteredQuestions(results);
        } catch (error) {
            console.error("Error fetching filtered data: ", error);
            showNotification("Could not load materials.", "error");
        } finally {
            setLoading(false);
        }
    };
    fetchFilteredData();
  }, [selectedLevel, selectedCategory, searchTerm, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(localSearchTerm);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 transition-colors duration-300">
      
      {/* Dynamic Header */}
      <header className="bg-white dark:bg-slate-900 pt-16 pb-10 border-b border-slate-100 dark:border-slate-800 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-pulse"></div>
        <div className="container mx-auto px-4 relative z-10">
            <span className="inline-block px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-4">Academic Vault</span>
            <h1 className="text-4xl md:text-6xl font-serif font-black text-slate-900 dark:text-white tracking-tight leading-none mb-4">Resources Archives</h1>
            <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-lg font-light leading-relaxed">
                Access verified past questions, test materials, and lecture notes curated by the Finance community.
            </p>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row gap-10">
            <aside className="lg:sticky lg:top-24 lg:self-start">
                <FilterPanel 
                  localSearchTerm={localSearchTerm}
                  onSearchTermChange={setLocalSearchTerm}
                  onSearchSubmit={handleSearchSubmit}
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                  selectedLevel={selectedLevel}
                  onLevelChange={setSelectedLevel}
                  sortOrder={sortOrder}
                  onSortOrderChange={setSortOrder}
                  onContributeClick={() => navigate('/upload')}
                />
            </aside>
            
            <main className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-8 px-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        </div>
                        <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">{filteredQuestions.length} Documents Indexed</p>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 animate-pulse space-y-4">
                                <div className="h-8 w-1/3 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                                <div className="h-6 w-full bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                                <div className="h-4 w-2/3 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                            </div>
                        ))}
                    </div>
                ) : (
                  <div className="space-y-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredQuestions.map(q => <QuestionCard key={q.id} question={q} />)}
                      </div>

                      {filteredQuestions.length === 0 && (
                          <div className="text-center py-32 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 animate-fade-in flex flex-col items-center">
                              <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-full mb-6">
                                <svg className="w-12 h-12 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                              </div>
                              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">The Vault is Silent</h3>
                              <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-xs">No records found matching your filters. Try broading your search.</p>
                          </div>
                      )}
                      
                      <AdBanner />
                  </div>
                )}
            </main>
        </div>
      </div>
    </div>
  );
};