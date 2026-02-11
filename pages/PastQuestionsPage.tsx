
import React, { useState, useContext, useEffect } from 'react';
import { QuestionCard } from '../components/QuestionCard';
import { AdBanner } from '../components/AdBanner';
import { PastQuestion } from '../types';
import { LEVELS } from '../constants';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';

const CATEGORIES = ["All", "Past Question", "Test Question", "Lecture Note", "Handout", "Textbook", "Other"];

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
      {/* Premium Header */}
      <header className="bg-indigo-950 text-white pt-24 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/hexellence.png')]"></div>
        <div className="container mx-auto px-4 relative z-10 text-center">
            <span className="inline-block px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-6 border border-white/20">Secure Archives</span>
            <h1 className="text-5xl md:text-7xl font-serif font-black mb-6 tracking-tight">The Academic Vault</h1>
            <p className="text-indigo-200 max-w-xl mx-auto text-lg font-light leading-relaxed">
                A verified repository of departmental intelligence, past questions, and lecture notes.
            </p>
        </div>
      </header>
      
      <div className="container mx-auto px-4 -mt-10 relative z-20">
        <div className="flex flex-col lg:flex-row gap-8">
            {/* Control Sidebar */}
            <aside className="w-full lg:w-80 flex-shrink-0 space-y-4">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Filter Resources</h4>
                    
                    <form onSubmit={handleSearchSubmit} className="mb-8">
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="Course code or title..."
                                value={localSearchTerm}
                                onChange={(e) => setLocalSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all group-hover:border-indigo-300"
                            />
                            <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                    </form>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Academic Level</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setSelectedLevel('all')} className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${selectedLevel === 'all' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}>All</button>
                                {LEVELS.map(l => (
                                    <button key={l} onClick={() => setSelectedLevel(String(l))} className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${selectedLevel === String(l) ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}>{typeof l === 'number' ? `${l}L` : l}</button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Category Type</label>
                            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
                                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Chronological Order</label>
                            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                                <button onClick={() => setSortOrder('newest')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${sortOrder === 'newest' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Newest</button>
                                <button onClick={() => setSortOrder('oldest')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${sortOrder === 'oldest' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Oldest</button>
                            </div>
                        </div>
                    </div>

                    <button onClick={() => navigate('/upload')} className="w-full mt-10 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all hover:-translate-y-1 active:scale-95 uppercase tracking-widest text-[10px] flex items-center justify-center gap-3">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                        Contribute Resource
                    </button>
                </div>
                
                <div className="hidden lg:block">
                   <AdBanner />
                </div>
            </aside>
            
            {/* Main Content Area */}
            <main className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-8 px-2">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Results</p>
                           <p className="text-xl font-black text-slate-800 dark:text-white leading-none">{filteredQuestions.length} Documents Found</p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 animate-pulse space-y-4">
                                <div className="h-8 w-1/3 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                                <div className="h-6 w-full bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                                <div className="h-4 w-2/3 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                            </div>
                        ))}
                    </div>
                ) : (
                  <div className="space-y-12">
                      {filteredQuestions.length === 0 ? (
                          <div className="text-center py-32 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 animate-fade-in flex flex-col items-center">
                              <div className="p-8 bg-slate-50 dark:bg-slate-800 rounded-full mb-6">
                                <svg className="w-16 h-16 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                              </div>
                              <h3 className="text-2xl font-black text-slate-900 dark:text-white">Vault Unresponsive</h3>
                              <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-xs text-sm">No materials match your current encryption filters. Try broadening your criteria.</p>
                          </div>
                      ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredQuestions.map(q => <QuestionCard key={q.id} question={q} />)}
                          </div>
                      )}
                      
                      <div className="lg:hidden">
                        <AdBanner />
                      </div>
                  </div>
                )}
            </main>
        </div>
      </div>
    </div>
  );
};