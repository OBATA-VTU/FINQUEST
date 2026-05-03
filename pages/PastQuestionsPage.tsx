import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { QuestionCard } from '../components/QuestionCard';
import { PastQuestion } from '../types';
import { LEVELS } from '../constants';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';
import { handleFirestoreError, OperationType } from '../utils/api';

const CATEGORIES = ["All", "Past Question", "Test Question", "Lecture Note", "Handout", "Textbook", "Other"];

export const PastQuestionsPage: React.FC = () => {
    const [questions, setQuestions] = useState<PastQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterLevel, setFilterLevel] = useState<string>('all');
    const [filterCategory, setFilterCategory] = useState<string>('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
    const [showFilters, setShowFilters] = useState(false);

    const auth = useContext(AuthContext);
    const navigate = useNavigate();
    const { showNotification } = useNotification();

    useEffect(() => {
        setLoading(true);
        // Using onSnapshot for real-time updates and better reliability
        const q = query(
            collection(db, 'questions'),
            where('status', '==', 'approved'),
            orderBy('createdAt', sortBy === 'newest' ? 'desc' : 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PastQuestion));
            setQuestions(items);
            setLoading(false);
        }, (err) => {
            // Check if it's an index error and provide a fallback
            if (err.message?.includes('index') || err.code === 'failed-precondition') {
                console.warn("Firestore index missing. Falling back to client-side sorting.");
                const fallbackQ = query(
                    collection(db, 'questions'),
                    where('status', '==', 'approved')
                );
                
                onSnapshot(fallbackQ, (snapshot) => {
                    let items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PastQuestion));
                    // Client-side sorting as a temporary measure
                    items = items.sort((a, b) => {
                        const dateA = new Date(a.createdAt || 0).getTime();
                        const dateB = new Date(b.createdAt || 0).getTime();
                        return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
                    });
                    setQuestions(items);
                    setLoading(false);
                }, (innerErr) => {
                    handleFirestoreError(innerErr, OperationType.LIST, 'questions_fallback');
                });
            } else {
                handleFirestoreError(err, OperationType.LIST, 'questions');
            }
        });

        return () => unsubscribe();
    }, [sortBy]);

    const filteredQuestions = questions.filter(q => {
        const matchLevel = filterLevel === 'all' || String(q.level) === filterLevel;
        const matchCategory = filterCategory === 'All' || q.category === filterCategory;
        const matchSearch = searchTerm === '' || 
            q.courseTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
            q.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (q.lecturer && q.lecturer.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchLevel && matchCategory && matchSearch;
    });

    return (
        <div className="min-h-screen bg-[#fafafa] dark:bg-[#020617] pb-32 transition-colors duration-700">
            {/* Header Section - Premium Academic Look */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 pt-32 pb-20 relative overflow-hidden transition-colors">
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-indigo-600 via-indigo-400 to-emerald-400"></div>
                <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(circle_at_top_right,_rgba(79,70,229,0.05),_transparent_70%)]"></div>
                
                <div className="container mx-auto px-6 relative">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-3 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-full mb-8">
                                <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></span>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-700 dark:text-indigo-300">Verified Study Resources</span>
                            </div>
                            <h1 className="text-6xl md:text-8xl font-serif font-black text-slate-950 dark:text-white mb-8 tracking-tighter leading-[0.9]">Study <br/>Library</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-xl font-medium leading-relaxed max-w-2xl border-l-4 border-indigo-100 dark:border-indigo-900 pl-8">
                                Access our curated collection of textbooks, lecture notes, and past exam questions organized for your academic success.
                            </p>
                        </div>
                        
                        <div className="flex flex-col items-center lg:items-end gap-6 shrink-0">
                            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Materials</p>
                                    <p className="text-2xl font-serif font-black text-slate-950 dark:text-white">{questions.length}</p>
                                </div>
                                <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-100 dark:border-slate-800">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => setShowFilters(!showFilters)}
                                className={`group px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-4 shadow-xl active:scale-95 ${showFilters ? 'bg-indigo-600 text-white shadow-indigo-500/20' : 'bg-slate-950 text-white hover:bg-slate-900'}`}
                            >
                                <svg className={`w-5 h-5 transition-transform duration-500 ${showFilters ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                                {showFilters ? 'Close Filters' : 'Filter Materials'}
                            </button>
                        </div>
                    </div>

                    {/* Integrated Intelligent Search Bar */}
                    <div className="mt-16 group relative">
                        <input
                            type="text"
                            placeholder="Enter course code, title, or academic staff name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-20 pr-10 py-8 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-[2.5rem] text-xl font-black shadow-sm focus:ring-8 focus:ring-indigo-500/5 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600"
                        />
                        <div className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <div className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 tracking-widest hidden md:block">PRESS ENTER TO SEARCH</div>
                    </div>
                </div>
            </header>

            {/* Elastic Filter Control Deck */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 overflow-hidden shadow-2xl relative z-10"
                    >
                        <div className="container mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                                    Select Level
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {['all', ...LEVELS.map(String)].map((lvl) => (
                                        <button
                                            key={lvl}
                                            onClick={() => setFilterLevel(lvl)}
                                            className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterLevel === lvl ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                                        >
                                            {lvl === 'all' ? 'All' : lvl.includes('General') ? 'General' : `${lvl} level`}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                                    Resource Type
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {CATEGORIES.slice(0, 6).map(cat => (
                                        <button 
                                            key={cat}
                                            onClick={() => setFilterCategory(cat)}
                                            className={`px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all text-left truncate ${filterCategory === cat ? 'bg-slate-950 text-white shadow-xl' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100'}`}
                                        >
                                            {cat === 'All' ? 'All Materials' : cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                                    Sort By
                                </label>
                                <div className="flex gap-2 p-1 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                    <button onClick={() => setSortBy('newest')} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sortBy === 'newest' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Newest First</button>
                                    <button onClick={() => setSortBy('oldest')} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sortBy === 'oldest' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Oldest First</button>
                                </div>
                            </div>

                            <div className="flex flex-col justify-end">
                                <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2rem] border border-indigo-100 dark:border-indigo-800">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Search Tip</p>
                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-tight">Use keywords like "GST" or "ACC" to quickly find specific course materials.</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <main className="container mx-auto px-6 py-16">
                {/* Result Metadata */}
                <div className="flex items-center justify-between mb-16 px-8 py-6 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-50 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Status: <span className="text-slate-950 dark:text-white">{filteredQuestions.length} Documents Found</span></p>
                    </div>
                    <div className="h-[2px] flex-1 mx-16 bg-slate-50 dark:bg-slate-800 hidden lg:block"></div>
                    <button onClick={() => navigate('/upload')} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline underline-offset-8">Upload New Material</button>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 h-[380px] border border-slate-50 dark:border-slate-800 animate-pulse flex flex-col">
                                <div className="w-16 h-8 bg-slate-50 dark:bg-slate-800 rounded-xl mb-10"></div>
                                <div className="h-10 bg-slate-50 dark:bg-slate-800 rounded-full w-full mb-6"></div>
                                <div className="h-6 bg-slate-50 dark:bg-slate-800 rounded-full w-2/3 mb-12"></div>
                                <div className="mt-auto flex gap-4">
                                    <div className="h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex-1"></div>
                                    <div className="h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex-1"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredQuestions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-48 bg-white dark:bg-slate-900 rounded-[4rem] border border-dashed border-slate-200 dark:border-slate-800 animate-fade-in">
                        <div className="w-32 h-32 bg-slate-50 dark:bg-slate-800 text-slate-200 dark:text-slate-700 rounded-[3.5rem] flex items-center justify-center mb-10 -rotate-12 border border-slate-100 dark:border-slate-800 shadow-inner">
                            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <h3 className="text-4xl font-serif font-black text-slate-950 dark:text-white uppercase tracking-tighter mb-4">No Materials Found</h3>
                        <p className="text-slate-400 font-bold max-w-sm text-center px-10">We couldn't find any resources matching your search or filters.</p>
                        <button 
                            onClick={() => { setSearchTerm(''); setFilterLevel('all'); setFilterCategory('All'); }}
                            className="mt-12 px-14 py-6 bg-slate-950 dark:bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl hover:scale-105 transition-all"
                        >
                            Reset Selection
                        </button>
                    </div>
                ) : (
                    <motion.div 
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12"
                    >
                        {filteredQuestions.map((q, i) => (
                            <motion.div
                                key={q.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ y: -10, transition: { duration: 0.2 } }}
                                transition={{ delay: Math.min(i * 0.05, 0.5) }}
                                className="h-full perspective-1000"
                            >
                                <QuestionCard question={q} />
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </main>

            {/* Department Footer Engagement */}
            <div className="container mx-auto px-6 mt-20">
                <div className="bg-slate-950 dark:bg-indigo-900/20 rounded-[4rem] p-20 text-white relative overflow-hidden border border-white/5 shadow-3xl">
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 blur-[150px] rounded-full translate-x-1/3 -translate-y-1/3"></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-16">
                        <div className="max-w-2xl">
                            <span className="text-[10px] font-black uppercase tracking-[0.6em] text-indigo-400 mb-8 inline-block">Study Smarter</span>
                            <h2 className="text-5xl md:text-7xl font-serif font-black mb-10 leading-[0.9] tracking-tighter italic">Test Your Knowledge.</h2>
                            <p className="text-slate-400 dark:text-indigo-200/60 font-medium text-xl leading-relaxed">
                                Our library is just the start. Use the AI Study Hub to transform these materials into practice tests and summaries.
                            </p>
                        </div>
                        <button onClick={() => navigate('/test')} className="px-16 py-8 bg-white text-slate-950 rounded-[2rem] font-black uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-2xl text-xs whitespace-nowrap">
                            Try AI Study Hub
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
