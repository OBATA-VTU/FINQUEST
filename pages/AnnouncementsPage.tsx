
import React, { useEffect, useState, useContext } from 'react';
import { AdBanner } from '../components/AdBanner';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Announcement } from '../types';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const AnnouncementsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
      const fetchNews = async () => {
          try {
              const q = query(collection(db, 'announcements'), orderBy('date', 'desc'));
              const snap = await getDocs(q);
              setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement)));
          } catch(e) {
              console.error(e);
          } finally {
              setLoading(false);
          }
      };
      fetchNews();
  }, []);

  const handleReadMore = (announcement: Announcement) => {
      if (!auth?.user) {
          navigate('/login');
          return;
      }
      setSelectedAnnouncement(announcement);
  };

  const featured = announcements[0];
  const others = announcements.slice(1);

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors">
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-10">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">News & Updates</h1>
                <p className="text-slate-500 dark:text-slate-400">Stay informed about departmental activities.</p>
            </div>
            <button className="hidden md:block px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors">
                Subscribe to RSS
            </button>
        </div>

        {loading ? (
            <div className="text-center py-20 text-slate-500 dark:text-slate-400">Loading news...</div>
        ) : announcements.length === 0 ? (
            <div className="text-center py-20 text-slate-500 dark:text-slate-400">No announcements yet.</div>
        ) : (
            <>
                {/* Featured Announcement */}
                {featured && (
                    <div className="mb-12 group cursor-pointer" onClick={() => handleReadMore(featured)}>
                        <div className="relative rounded-2xl overflow-hidden shadow-xl h-96">
                            <img 
                                src={featured.imageUrl || "https://images.unsplash.com/photo-1517048676732-d65bc937f952?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"} 
                                alt="Featured" 
                                className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
                            <div className="absolute bottom-0 left-0 p-8 md:p-12 max-w-3xl">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="bg-rose-600 text-white text-xs font-bold px-3 py-1 rounded-full">IMPORTANT</span>
                                    <span className="text-slate-300 text-sm font-medium">{new Date(featured.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                </div>
                                <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight group-hover:text-indigo-200 transition-colors">{featured.title}</h2>
                                <p className="text-slate-200 text-lg line-clamp-2 mb-6">{featured.content}</p>
                                <button onClick={(e) => { e.stopPropagation(); handleReadMore(featured); }} className="text-white font-semibold underline decoration-2 underline-offset-4 decoration-rose-500 hover:text-rose-400 transition-colors">Read Full Story</button>
                            </div>
                        </div>
                    </div>
                )}
            
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2 space-y-8">
                        {others.map(announcement => (
                            <div key={announcement.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-all cursor-pointer" onClick={() => handleReadMore(announcement)}>
                                <div className="md:w-1/4 shrink-0">
                                    <div className="bg-indigo-100 dark:bg-indigo-900/50 rounded-lg h-32 flex flex-col items-center justify-center text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                        <span className="text-3xl font-bold">{new Date(announcement.date).getDate()}</span>
                                        <span className="text-sm font-medium uppercase">{new Date(announcement.date).toLocaleDateString(undefined, { month: 'short' })}</span>
                                        <span className="text-xs text-indigo-400 dark:text-indigo-300 mt-1">{new Date(announcement.date).getFullYear()}</span>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Update</span>
                                        <span className="text-slate-300 dark:text-slate-600">•</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">By {announcement.author || 'Admin'}</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{announcement.title}</h3>
                                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4 line-clamp-3">{announcement.content}</p>
                                    <button onClick={(e) => { e.stopPropagation(); handleReadMore(announcement); }} className="text-indigo-600 dark:text-indigo-400 font-medium text-sm hover:underline">Read More &rarr;</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-8">
                        {/* Newsletter Widget */}
                        <div className="bg-indigo-900 dark:bg-slate-800 p-6 rounded-xl shadow-lg text-white">
                            <h3 className="font-bold text-lg mb-2">Don't Miss Out</h3>
                            <p className="text-indigo-200 dark:text-slate-400 text-sm mb-4">Get the latest past questions and updates sent directly to your inbox.</p>
                            <input type="email" placeholder="Your email address" className="w-full px-4 py-2 rounded-lg text-slate-900 mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                            <button className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg font-bold transition-colors">Subscribe</button>
                        </div>
                        
                        <AdBanner />
                    </div>
                </div>
            </>
        )}

        {/* Full Story Modal */}
        {selectedAnnouncement && auth?.user && (
            <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedAnnouncement(null)}>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up" onClick={e => e.stopPropagation()}>
                    <div className="relative h-64 bg-slate-900">
                        {selectedAnnouncement.imageUrl ? (
                            <img src={selectedAnnouncement.imageUrl} alt={selectedAnnouncement.title} className="w-full h-full object-cover opacity-80" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-indigo-900">
                                <span className="text-6xl">📰</span>
                            </div>
                        )}
                        <button onClick={() => setSelectedAnnouncement(null)} className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="p-8">
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
                            <span>{new Date(selectedAnnouncement.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            <span>•</span>
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold">{selectedAnnouncement.author || 'Admin'}</span>
                        </div>
                        <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white mb-6">{selectedAnnouncement.title}</h2>
                        <div className="prose prose-slate dark:prose-invert max-w-none">
                            <p className="whitespace-pre-wrap leading-relaxed text-lg text-slate-700 dark:text-slate-300">{selectedAnnouncement.content}</p>
                        </div>
                        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                            <button onClick={() => setSelectedAnnouncement(null)} className="px-6 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
