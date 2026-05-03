
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Spinner from '../components/Spinner';

interface Book {
    id: string;
    source?: 'google' | 'openlibrary';
    olWorkId?: string;
    volumeInfo: {
        title: string;
        authors?: string[];
        publishedDate?: string;
        description?: string;
        pageCount?: number;
        categories?: string[];
        imageLinks?: {
            thumbnail: string;
        };
        previewLink: string;
        infoLink: string;
    };
    accessInfo?: {
        webReaderLink?: string;
        pdf?: {
            isAvailable: boolean;
            downloadLink?: string;
        };
    };
}

export const ELibraryPage: React.FC = () => {
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('Fintech blockchain finance');
    const [error, setError] = useState<string | null>(null);
    const [selectedBookForReader, setSelectedBookForReader] = useState<Book | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const fetchBooks = async (query: string) => {
        setLoading(true);
        setError(null);
        try {
            // Fetch from Google Books - prioritizing free ebooks
            const googleResponse = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=15&orderBy=relevance&printType=books&filter=free-ebooks`);
            const googleData = await googleResponse.json();
            const googleItems = (googleData.items || []).map((item: any) => ({
                id: item.id,
                volumeInfo: item.volumeInfo,
                accessInfo: item.accessInfo,
                source: 'google'
            }));

            // Fetch from Open Library for better "Free Reading" results
            const olResponse = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`);
            const olData = await olResponse.json();
            const olItems = (olData.docs || []).filter((doc: any) => doc.cover_i).map((doc: any) => ({
                id: doc.cover_i ? doc.cover_i.toString() : doc.edition_key?.[0],
                volumeInfo: {
                    title: doc.title,
                    authors: doc.author_name,
                    publishedDate: doc.first_publish_year?.toString(),
                    description: doc.first_sentence ? doc.first_sentence[0] : "Academic resource from Open Library.",
                    imageLinks: {
                        thumbnail: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
                    },
                    previewLink: `https://openlibrary.org${doc.key}`,
                    infoLink: `https://openlibrary.org${doc.key}`
                },
                source: 'openlibrary',
                olWorkId: doc.key.replace('/works/', '')
            }));

            setBooks([...googleItems, ...olItems]);
        } catch (err: any) {
            setError("Connectivity error. Please verify your data pipeline.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBooks('Corporate Finance Accounting');

        // Load Google Books Viewer API for direct on-page reading
        const script = document.createElement('script');
        script.src = 'https://www.google.com/jsapi';
        script.async = true;
        script.onload = () => {
            if ((window as any).google) {
                (window as any).google.load('books', '0');
            }
        };
        document.body.appendChild(script);

        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, []);

    useEffect(() => {
        if (selectedBookForReader && (window as any).google && (window as any).google.books) {
            const timer = setTimeout(() => {
                const viewerCanvas = document.getElementById('viewerCanvas');
                if (viewerCanvas) {
                    try {
                        const viewer = new (window as any).google.books.DefaultViewer(viewerCanvas);
                        viewer.load(selectedBookForReader.id, () => {
                            console.log("Book loaded successfully");
                        }, () => {
                            console.error("Failed to load book version");
                        });
                    } catch (e) {
                        console.error("Google Books Viewer error:", e);
                    }
                }
            }, 500); // Small delay to ensure DOM is ready in modal
            return () => clearTimeout(timer);
        }
    }, [selectedBookForReader]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTerm.trim()) fetchBooks(searchTerm);
    };

    return (
        <div className="min-h-screen bg-[#fafafa] dark:bg-[#020617] pb-24 transition-colors duration-500">
            {/* Elegant Minimalist Header */}
            <header className="relative bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 pt-32 pb-24 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500"></div>
                <div className="container mx-auto px-6 relative flex flex-col items-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-8">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21l-12-18h24z"/></svg>
                        Digital Resource Center
                    </div>
                    <h1 className="text-6xl md:text-8xl font-serif font-black text-slate-900 dark:text-white mb-6 tracking-tighter text-center leading-[0.9]">Online <br/>Reading Vault</h1>
                    <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-xl text-center font-medium leading-relaxed">
                        Explore thousands of textbooks, research papers, and academic journals. Read comfortably directly in your browser.
                    </p>
                    
                    {/* Integrated Search Console */}
                    <div className="w-full max-w-4xl mt-16 scale-110">
                        <form onSubmit={handleSearch} className="relative group">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search books by title, author, or keyword..."
                                className="w-full pl-16 pr-6 py-8 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700/50 rounded-[3rem] text-xl font-bold shadow-2xl focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all dark:text-white"
                            />
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 px-10 py-4 bg-indigo-600 text-white text-[10px] font-black rounded-full hover:bg-indigo-700 shadow-xl transition-all uppercase tracking-[0.2em]">Start Reading</button>
                        </form>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-6 py-12">
                {/* Advanced Genre Selector */}
                <div className="mb-16">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-6 text-center">Curated Disciplines</p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        {['Accounting', 'Banking', 'Fintech', 'Markets', 'Comics', 'Economics', 'Management', 'Corporate Law'].map((tag) => (
                            <button 
                                key={tag} 
                                onClick={() => { setSearchTerm(tag); fetchBooks(tag); }} 
                                className={`px-8 py-3 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-widest shadow-sm hover:scale-105 active:scale-95 ${searchTerm.toLowerCase() === tag.toLowerCase() ? 'bg-indigo-600 border-indigo-600 text-white shadow-indigo-500/20' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 hover:border-indigo-400'}`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>

                {/* View Controls */}
                <div className="flex items-center justify-between mb-12 border-b border-slate-100 dark:border-slate-800 pb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Catalog: {books.length} Active Records</span>
                    </div>
                    <div className="flex items-center bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        </button>
                        <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="animate-pulse bg-white dark:bg-slate-900 rounded-[3rem] p-6 h-[450px] border border-slate-100 dark:border-slate-800 flex flex-col">
                                <div className="w-full aspect-[3/4] bg-slate-100 dark:bg-slate-800 rounded-[2rem] mb-6"></div>
                                <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded-full w-3/4 mb-4"></div>
                                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-1/2"></div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-center py-32 bg-white dark:bg-slate-900 rounded-[4rem] border-2 border-slate-100 dark:border-slate-800 shadow-2xl">
                        <div className="w-24 h-24 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
                            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h3 className="text-4xl font-serif font-black text-slate-900 dark:text-white mb-4">Connection Lost</h3>
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-lg max-w-sm mx-auto">We couldn't connect to the library servers. Please check your internet connection.</p>
                        <button onClick={() => fetchBooks(searchTerm)} className="mt-12 px-12 py-5 bg-indigo-600 text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl active:scale-95">Retry Sync</button>
                    </div>
                ) : (
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10" : "flex flex-col gap-6"}>
                        {books.map((book) => (
                            <motion.div
                                key={book.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 transition-all duration-500 hover:shadow-3xl hover:border-indigo-500/30 overflow-hidden relative group ${viewMode === 'grid' ? 'rounded-[3rem] p-6 flex flex-col h-full' : 'rounded-[2.5rem] p-6 flex flex-row items-center gap-10'}`}
                            >
                                <div className={`${viewMode === 'grid' ? 'aspect-[3/4] w-full mb-8 rounded-[2.5rem]' : 'w-48 aspect-[3/4] shrink-0 rounded-3xl'} bg-slate-50 dark:bg-slate-800/20 relative overflow-hidden shadow-2xl transition-all duration-700 group-hover:scale-[1.03]`}>
                                    {book.volumeInfo.imageLinks?.thumbnail ? (
                                        <img
                                            src={book.volumeInfo.imageLinks.thumbnail.replace('http:', 'https:')}
                                            alt={book.volumeInfo.title}
                                            className="w-full h-full object-cover"
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center p-8 text-center bg-gradient-to-br from-indigo-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                                            <p className="text-slate-400 dark:text-slate-500 font-serif italic text-lg">{book.volumeInfo.title}</p>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-center items-center p-8 gap-4 backdrop-blur-[4px]">
                                        <button
                                            onClick={() => setSelectedBookForReader(book)}
                                            className="w-full py-4 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-50 shadow-2xl shadow-white/10 transition-all scale-95 group-hover:scale-100"
                                        >
                                            Initiate Reader
                                        </button>
                                        {(book.accessInfo?.webReaderLink || book.accessInfo?.pdf?.isAvailable) && (
                                            <a
                                                href={book.accessInfo.pdf?.downloadLink || book.accessInfo.webReaderLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all scale-95 group-hover:scale-100"
                                            >
                                                External Source
                                            </a>
                                        )}
                                    </div>
                                    {/* Availability Flag */}
                                    <div className="absolute top-6 left-6 flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${book.accessInfo?.pdf?.isAvailable ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500'}`}></div>
                                        <span className="px-3 py-1 bg-white dark:bg-slate-950 rounded-full text-[8px] font-black uppercase tracking-widest text-slate-900 dark:text-white border border-slate-100 dark:border-slate-800 shadow-md">
                                            {book.accessInfo?.pdf?.isAvailable ? 'PDF Ready' : 'Digital Only'}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className={`flex-1 flex flex-col ${viewMode === 'list' ? 'justify-center' : ''}`}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                                            {book.volumeInfo.publishedDate?.split('-')[0] || 'Unk. Year'}
                                        </span>
                                        <div className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-[0.2em]">
                                            {book.volumeInfo.categories ? book.volumeInfo.categories[0] : 'Manuscript'}
                                        </span>
                                    </div>
                                    
                                    <h3 className={`font-serif font-black text-slate-950 dark:text-white leading-tight group-hover:text-indigo-600 transition-colors ${viewMode === 'grid' ? 'text-2xl mb-2 line-clamp-2 min-h-[2.4em]' : 'text-4xl mb-4'}`}>{book.volumeInfo.title}</h3>
                                    <p className={`text-slate-500 dark:text-slate-400 font-bold ${viewMode === 'grid' ? 'text-sm mb-6' : 'text-xl mb-6'}`}>
                                        by {book.volumeInfo.authors ? book.volumeInfo.authors.slice(0, 2).join(', ') : 'Departmental Staff'}
                                    </p>
                                    
                                    {viewMode === 'list' && book.volumeInfo.description && (
                                        <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-3 leading-relaxed mb-10 font-medium max-w-3xl">
                                            {book.volumeInfo.description}
                                        </p>
                                    )}
                                    
                                    <div className="mt-auto grid grid-cols-2 gap-4 pt-8 border-t-2 border-slate-50 dark:border-slate-800/50">
                                        <button onClick={() => setSelectedBookForReader(book)} className="py-4 bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-all rounded-xl border border-transparent hover:border-indigo-100 flex items-center justify-center gap-2">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                            Reader
                                        </button>
                                        <a 
                                            href={book.accessInfo?.pdf?.downloadLink || book.accessInfo?.webReaderLink || book.volumeInfo.previewLink}
                                            target="_blank"
                                            className="py-4 bg-slate-950 dark:bg-indigo-600 text-[10px] font-black uppercase tracking-widest text-white rounded-xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            Extract
                                        </a>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Advanced Reader Environment */}
                <AnimatePresence>
                    {selectedBookForReader && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 bg-slate-950/95 backdrop-blur-2xl"
                        >
                            <motion.div 
                                initial={{ scale: 0.95, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                className="bg-white dark:bg-slate-900 w-full h-full rounded-none md:rounded-[4rem] overflow-hidden relative flex flex-col shadow-3xl border-t border-white/10"
                            >
                                {/* Reader Control Deck */}
                                <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 z-10 shrink-0">
                                    <div className="flex items-center gap-6">
                                        <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl rotate-3">
                                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                        </div>
                                        <div>
                                            <h3 className="font-serif font-black text-slate-900 dark:text-white text-2xl leading-none mb-2 line-clamp-1">{selectedBookForReader.volumeInfo.title}</h3>
                                            <div className="flex items-center gap-3">
                                                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500">Secure Online Reader</span>
                                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button 
                                            onClick={() => window.print()}
                                            className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                                            title="Print Document"
                                        >
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                        </button>
                                        <button 
                                            onClick={() => setSelectedBookForReader(null)}
                                            className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white hover:bg-rose-600 hover:border-rose-500 transition-all shadow-2xl active:scale-95"
                                        >
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 bg-[#1a1a1a] relative overflow-hidden flex items-center justify-center">
                                    {selectedBookForReader.source === 'openlibrary' ? (
                                        <iframe 
                                            src={`https://openlibrary.org/embed/works/${selectedBookForReader.olWorkId || selectedBookForReader.id}`}
                                            className="w-full h-full border-none bg-white"
                                            title="Open Library Reader"
                                        />
                                    ) : (
                                        <div id="viewerCanvas" className="w-full h-full max-w-5xl mx-auto dark:invert dark:hue-rotate-180"></div>
                                    )}
                                    
                                    {/* Watermark */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
                                        <p className="text-white font-black uppercase tracking-[2em] text-9xl -rotate-45">STUDENT LIBRARY VAULT</p>
                                    </div>
                                    
                                    {/* Reader UI Hints */}
                                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full text-[10px] font-black text-white/50 uppercase tracking-[0.3em] flex items-center gap-6 z-[100]">
                                        <span>Use Arrows to Navigate</span>
                                        <div className="w-1 h-1 bg-white/20 rounded-full"></div>
                                        <span>Infinite Scroll Active</span>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {!loading && books.length === 0 && (
                    <div className="text-center py-40 animate-fade-in flex flex-col items-center">
                        <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-slate-300 dark:text-slate-700 mb-8 border border-slate-100 dark:border-slate-800 shadow-inner">
                            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" /></svg>
                        </div>
                        <h4 className="text-3xl font-serif font-black text-slate-900 dark:text-white uppercase tracking-tight">No Books Found</h4>
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">We couldn't find any results for "{searchTerm}"</p>
                        <button onClick={() => { setSearchTerm('Finance'); fetchBooks('Finance'); }} className="mt-10 px-10 py-4 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">Clear Search</button>
                    </div>
                )}
            </div>
        </div>
    );
};
