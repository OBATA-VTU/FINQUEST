import React, { useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';

interface BookResult {
    title: string;
    author: string;
    coverUrl: string;
    downloadUrl: string;
    source: string;
}

export const ELibraryPage: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<BookResult[]>([]);
    const { showNotification } = useNotification();

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;

        setLoading(true);
        try {
            const response = await fetch(`/api/library/search?q=${encodeURIComponent(searchTerm)}`);
            const data = await response.json();
            
            if (data.results) {
                setResults(data.results);
            } else {
                showNotification("No results found in the global archives.", "info");
            }
        } catch (err) {
            showNotification("Failed to connect to the global library.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (url: string) => {
        showNotification("Fetching direct resource link...", "info");
        try {
            const response = await fetch(`/api/library/details?url=${encodeURIComponent(url)}`);
            const data = await response.json();
            if (data.pdfLink) {
                window.open(data.pdfLink, '_blank');
            } else {
                window.open(url, '_blank');
            }
        } catch (e) {
            window.open(url, '_blank');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 animate-fade-in transition-colors pb-24">
            <div className="bg-indigo-600 text-white pt-32 pb-48 px-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80')] bg-cover opacity-20 mix-blend-overlay"></div>
                <div className="max-w-4xl mx-auto relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full mb-8 backdrop-blur-md border border-white/10">
                        <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Global Digital Archives</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-serif font-black tracking-tight mb-6">E-Library</h1>
                    <p className="text-indigo-100/70 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
                        Search and fetch academic textbooks directly from the <strong>Ocean of PDF</strong> global database.
                    </p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 -translate-y-24">
                <form onSubmit={handleSearch} className="relative group mb-16">
                    <div className="absolute inset-0 bg-indigo-500/30 blur-3xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
                    <input 
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search for any textbook name, author or ISBN..."
                        className="w-full relative z-10 pl-14 pr-40 py-10 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3rem] text-xl font-bold shadow-2xl focus:ring-8 focus:ring-indigo-500/10 outline-none transition-all dark:text-white"
                        autoFocus
                    />
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors z-20">
                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <button 
                        type="submit"
                        disabled={loading}
                        className="absolute right-4 top-4 bottom-4 px-10 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all shadow-xl active:scale-95 disabled:opacity-50 z-20"
                    >
                        {loading ? 'Searching...' : 'Search Engine'}
                    </button>
                </form>

                <div className="space-y-8">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest animate-pulse">Establishing Connection to Global Vaults...</p>
                        </div>
                    ) : results.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {results.map((book, i) => (
                                <div 
                                    key={i}
                                    className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl flex gap-6 group hover:border-indigo-500/30 transition-all animate-slide-in-up"
                                    style={{ animationDelay: `${i * 100}ms` }}
                                >
                                    <div className="w-24 h-32 rounded-2xl overflow-hidden shadow-lg shrink-0 border border-slate-100 dark:border-slate-800 group-hover:scale-105 transition-transform">
                                        <img src={book.coverUrl} className="w-full h-full object-cover" alt="Cover" />
                                    </div>
                                    <div className="flex flex-col justify-between py-2 overflow-hidden">
                                        <div>
                                            <p className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">{book.source}</p>
                                            <h4 className="text-lg font-serif font-black text-slate-900 dark:text-white truncate" title={book.title}>{book.title}</h4>
                                            <p className="text-sm text-slate-500 font-medium italic">by {book.author}</p>
                                        </div>
                                        <button 
                                            onClick={() => handleDownload(book.downloadUrl)}
                                            className="w-full py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            Fetch to Local
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-32 bg-white dark:bg-slate-900 rounded-[4rem] border border-slate-100 dark:border-slate-800 shadow-sm px-10">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-300">
                                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                            <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest mb-4">No Active Search</h3>
                            <p className="text-slate-400 text-sm font-medium max-w-sm mx-auto leading-relaxed">Enter a book title or author name to browse millions of textbooks available globally.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Disclaimer Bar */}
            <div className="max-w-4xl mx-auto px-10 py-6 bg-amber-50 dark:bg-amber-900/10 rounded-3xl border border-amber-100 dark:border-amber-900/30 flex gap-4 mt-12 mb-20 items-center">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-400 font-medium leading-relaxed">
                    <strong>Notice:</strong> This e-library fetches resources from external global databases. FINSA AAUA acts only as a gateway to these public academic materials. Always verify the authenticity of downloaded materials.
                </p>
            </div>
        </div>
    );
};

export default ELibraryPage;
