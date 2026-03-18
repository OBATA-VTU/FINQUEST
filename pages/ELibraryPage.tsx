
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import Spinner from '../components/Spinner';

interface Book {
    id: string;
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
    const [searchTerm, setSearchTerm] = useState('finance accounting money');
    const [error, setError] = useState<string | null>(null);
    const [selectedBookForReader, setSelectedBookForReader] = useState<Book | null>(null);

    const fetchBooks = async (query: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20`);
            if (!response.ok) throw new Error('Failed to fetch books');
            const data = await response.json();
            setBooks(data.items || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBooks('finance accounting money');

        // Load Google Books Viewer API
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
            document.body.removeChild(script);
        };
    }, []);

    useEffect(() => {
        if (selectedBookForReader && (window as any).google && (window as any).google.books) {
            const viewerCanvas = document.getElementById('viewerCanvas');
            if (viewerCanvas) {
                const viewer = new (window as any).google.books.DefaultViewer(viewerCanvas);
                viewer.load(selectedBookForReader.id);
            }
        }
    }, [selectedBookForReader]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchBooks(searchTerm);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 transition-colors">
            {/* Hero Section */}
            <header className="bg-indigo-950 text-white pt-24 pb-20 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <div className="container mx-auto px-4 relative z-10 text-center">
                    <span className="inline-block px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-6 border border-white/20">Global Digital Library</span>
                    <h1 className="text-5xl md:text-7xl font-serif font-black mb-6 tracking-tight">E-Library</h1>
                    <p className="text-indigo-200 max-w-xl mx-auto text-lg font-light leading-relaxed">
                        Explore a vast collection of academic, professional, and entertainment literature. Read directly on our platform.
                    </p>
                </div>
            </header>

            <div className="container mx-auto px-4 -mt-10 relative z-20">
                {/* Search Bar */}
                <div className="max-w-2xl mx-auto mb-12">
                    <form onSubmit={handleSearch} className="relative group">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search for books, authors, or comics..."
                            className="w-full pl-14 pr-6 py-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] text-sm font-bold shadow-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                        <svg className="w-6 h-6 text-slate-400 absolute left-5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-2 bg-indigo-600 text-white text-xs font-black rounded-full hover:bg-indigo-700 transition-all uppercase tracking-widest">Search</button>
                    </form>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <Spinner className="w-12 h-12 text-indigo-600 mb-4" />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Accessing Global Database...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[3rem] border border-rose-100 dark:border-rose-900/30">
                        <p className="text-rose-500 font-bold">{error}</p>
                        <button onClick={() => fetchBooks(searchTerm)} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">Retry</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {books.map((book) => (
                            <motion.div
                                key={book.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all group flex flex-col"
                            >
                                <div className="aspect-[3/4] bg-slate-100 dark:bg-slate-800 relative overflow-hidden shrink-0">
                                    {book.volumeInfo.imageLinks?.thumbnail ? (
                                        <img
                                            src={book.volumeInfo.imageLinks.thumbnail.replace('http:', 'https:')}
                                            alt={book.volumeInfo.title}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center p-8 text-center bg-gradient-to-br from-indigo-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                                            <p className="text-slate-400 dark:text-slate-500 font-serif italic text-lg">{book.volumeInfo.title}</p>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6 gap-3">
                                        <button
                                            onClick={() => setSelectedBookForReader(book)}
                                            className="w-full py-3 bg-white text-indigo-950 text-center rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors"
                                        >
                                            Read on Website
                                        </button>
                                        {book.accessInfo?.pdf?.isAvailable && (
                                            <a
                                                href={book.accessInfo.pdf.downloadLink || book.accessInfo.webReaderLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full py-3 bg-indigo-600 text-white text-center rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors"
                                            >
                                                Download PDF
                                            </a>
                                        )}
                                    </div>
                                </div>
                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[8px] font-black uppercase tracking-widest rounded-md border border-indigo-100 dark:border-indigo-800">
                                            {book.volumeInfo.publishedDate?.split('-')[0] || 'N/A'}
                                        </span>
                                        {book.volumeInfo.pageCount && (
                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                                                {book.volumeInfo.pageCount} Pages
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-slate-900 dark:text-white mb-2 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">{book.volumeInfo.title}</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mb-3">
                                        {book.volumeInfo.authors ? book.volumeInfo.authors.join(', ') : 'Unknown Author'}
                                    </p>
                                    {book.volumeInfo.description && (
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-3 leading-relaxed italic">
                                            {book.volumeInfo.description}
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Reader Modal */}
                {selectedBookForReader && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-slate-950/90 backdrop-blur-md">
                        <div className="bg-white dark:bg-slate-900 w-full h-full rounded-[3rem] overflow-hidden relative flex flex-col shadow-2xl border border-white/10">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 z-10">
                                <div>
                                    <h3 className="font-black text-slate-900 dark:text-white text-lg leading-none mb-1 line-clamp-1">{selectedBookForReader.volumeInfo.title}</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Digital Reader Mode</p>
                                </div>
                                <button 
                                    onClick={() => setSelectedBookForReader(null)}
                                    className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-rose-500 hover:text-white transition-all"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="flex-1 bg-slate-50 dark:bg-slate-950 relative">
                                <div id="viewerCanvas" className="w-full h-full"></div>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                                    <p className="text-slate-400 font-black uppercase tracking-[1em] text-4xl -rotate-45">FINSA E-LIBRARY</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {!loading && books.length === 0 && (
                    <div className="text-center py-32">
                        <p className="text-slate-400 font-bold">No books found for "{searchTerm}"</p>
                    </div>
                )}
            </div>
        </div>
    );
};
