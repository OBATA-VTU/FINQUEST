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
            if (err.message?.includes('index') || err.code === 'failed-precondition') {
                const fallbackQ = query(collection(db, 'questions'), where('status', '==', 'approved'));
                onSnapshot(fallbackQ, (snapshot) => {
                    let items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PastQuestion));
                    items = items.sort((a, b) => {
                        const dateA = new Date(a.createdAt || 0).getTime();
                        const dateB = new Date(b.createdAt || 0).getTime();
                        return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
                    });
                    setQuestions(items);
                    setLoading(false);
                }, (innerErr) => handleFirestoreError(innerErr, OperationType.LIST, 'questions_fallback'));
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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors animate-fade-in pb-24">
            {/* Header / Hero Section */}
            <div className="bg-slate-900 text-white relative overflow-hidden px-6 pt-32 pb-40">
                 <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80')] bg-cover opacity-10 mix-blend-luminosity"></div>
                 <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/50 to-slate-900"></div>
                 
                 <div className="max-w-6xl mx-auto relative z-10 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-12">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full mb-6 backdrop-blur-md border border-white/10">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-100">Live Archives</span>
                        </div>
                        <h1 className="text-6xl md:text-8xl font-serif font-black tracking-tighter leading-none mb-4 italic">Resource Vault</h1>
                        <p className="text-indigo-200/60 max-w-lg text-sm md:text-lg italic font-light leading-relaxed">Explore a premium library of past questions, lecture materials, and academic resources curated for your success.</p>
                    </div>

                    <div className="flex flex-col gap-4 shrink-0 w-full md:w-auto">
                        <button onClick={() => navigate('/upload')} className="px-10 py-5 bg-white text-slate-900 rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-2xl hover:bg-slate-100 hover:scale-105 transition-all text-center">Share Material</button>
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] text-center italic">Digital Inheritance</p>
                    </div>
                 </div>
            </div>

            {/* Search & Filter Hub */}
            <div className="max-w-6xl mx-auto px-6 -translate-y-20 space-y-4">
                <div className="relative group">
                    <div className="absolute inset-0 bg-indigo-500/20 blur-3xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                    <input
                        type="text"
                        placeholder="Search by code, title, or academic personnel..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="relative w-full pl-16 pr-6 py-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] text-xl font-bold dark:text-white shadow-[0_30px_100px_-20px_rgba(0,0,0,0.15)] focus:ring-8 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-200"
                    />
                    <div className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-200 group-focus-within:text-indigo-600 transition-colors">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-[2.5rem] shadow-xl gap-4">
                    <div className="flex items-center gap-3 overflow-x-auto custom-scrollbar w-full md:w-auto pb-2 md:pb-0 px-2 no-scrollbar">
                         <button 
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${showFilters ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100'}`}
                         >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                            Explore Filters
                         </button>
                         <div className="h-8 w-px bg-slate-100 dark:bg-slate-800 mx-3 hidden md:block"></div>
                         {(filterLevel !== 'all' || filterCategory !== 'All' || searchTerm) && (
                             <button onClick={() => {setFilterLevel('all'); setFilterCategory('All'); setSearchTerm('');}} className="px-6 py-4 rounded-2xl text-[10px] font-black uppercase text-rose-500 bg-rose-50 dark:bg-rose-900/20 whitespace-nowrap">Reset Path</button>
                         )}
                         {filterLevel !== 'all' && <span className="px-6 py-4 rounded-2xl text-[10px] font-black uppercase bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 whitespace-nowrap">{filterLevel}L</span>}
                         {filterCategory !== 'All' && <span className="px-6 py-4 rounded-2xl text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 whitespace-nowrap">{filterCategory}</span>}
                    </div>

                    <div className="flex bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl shrink-0">
                        <button onClick={() => setSortBy('newest')} className={`px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${sortBy === 'newest' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400 opacity-60'}`}>Latest</button>
                        <button onClick={() => setSortBy('oldest')} className={`px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${sortBy === 'oldest' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400 opacity-60'}`}>Oldest</button>
                    </div>
                </div>
            </div>

            {/* Filter Overlay Drawer */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="max-w-6xl mx-auto px-6 overflow-hidden"
                    >
                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3rem] p-12 shadow-2xl grid grid-cols-1 md:grid-cols-2 gap-16 mb-12">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.5em] text-slate-300 mb-8">Academic Stage</label>
                                <div className="grid grid-cols-2 gap-4">
                                    {['all', ...LEVELS.map(String)].map((lvl) => (
                                        <button
                                            key={lvl}
                                            onClick={() => setFilterLevel(lvl)}
                                            className={`px-6 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${filterLevel === lvl ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' : 'border-slate-50 dark:border-slate-800 text-slate-400 hover:bg-slate-50'}`}
                                        >
                                            {lvl === 'all' ? 'All Levels' : lvl.includes('General') ? 'General' : `${lvl} Level`}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.5em] text-slate-300 mb-8">Resource Type</label>
                                <div className="grid grid-cols-2 gap-4">
                                    {CATEGORIES.map(cat => (
                                        <button 
                                            key={cat}
                                            onClick={() => setFilterCategory(cat)}
                                            className={`px-6 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${filterCategory === cat ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 border-slate-950 shadow-xl' : 'border-slate-50 dark:border-slate-800 text-slate-400 hover:bg-slate-50'}`}
                                        >
                                            {cat === 'All' ? 'Everything' : cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Results Feed */}
            <div className="max-w-6xl mx-auto px-6">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-96 bg-white dark:bg-slate-900 rounded-[3rem] animate-pulse border border-slate-50 dark:border-slate-800 shadow-sm"></div>
                        ))}
                    </div>
                ) : filteredQuestions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-40 bg-white dark:bg-slate-900 rounded-[4rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 mb-6">
                            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                        </div>
                        <h4 className="text-xl font-black text-slate-400 uppercase tracking-widest">Nothing Found in the Archives</h4>
                        <p className="text-sm text-slate-400 mt-2 font-medium">Try adjusting your filters or search terms.</p>
                        <button onClick={() => {setFilterLevel('all'); setFilterCategory('All'); setSearchTerm('');}} className="mt-10 px-10 py-4 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-indigo-700 transition-all">Clear Search History</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {filteredQuestions.map((q, i) => (
                            <motion.div
                                key={q.id}
                                layout
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: Math.min(i * 0.05, 0.4) }}
                            >
                                <QuestionCard question={q} />
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom Insight Bar */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-6">
                 <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-full py-5 px-10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="flex -space-x-4">
                            {[1,12,31].map(i => <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-700 overflow-hidden"><img src={`https://i.pravatar.cc/100?u=${i+442}`} className="w-full h-full object-cover" /></div>)}
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Studying with +1.2k others</p>
                    </div>
                 </div>
            </div>
        </div>
    );
};
