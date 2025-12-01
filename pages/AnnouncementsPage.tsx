
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

  const handleShare = (platform: 'whatsapp' | 'twitter' | 'facebook', announcement: Announcement) => {
      const url = encodeURIComponent(window.location.origin + '/announcements');
      const text = encodeURIComponent(`Check out this update from FINQUEST: ${announcement.title}`);
      
      let shareUrl = '';
      if (platform === 'whatsapp') {
          shareUrl = `https://wa.me/?text=${text}%20${url}`;
      } else if (platform === 'twitter') {
          shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
      } else if (platform === 'facebook') {
          shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
      }
      
      window.open(shareUrl, '_blank');
  };

  const featured = announcements[0];
  const others = announcements.slice(1);

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors">
      <div className="container mx-auto px-4 py-12">
        <header className="flex justify-between items-center mb-10">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">News & Updates</h1>
                <p className="text-slate-500 dark:text-slate-400">Stay informed about departmental activities.</p>
            </div>
            <button className="hidden md:block px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors">
                Subscribe to RSS
            </button>
        </header>

        {loading ? (
            <div className="text-center py-20 text-slate-500 dark:text-slate-400">Loading news...</div>
        ) : announcements.length === 0 ? (
            <div className="text-center py-20 text-slate-500 dark:text-slate-400">No announcements yet.</div>
        ) : (
            <>
                {/* Featured Announcement */}
                {featured && (
                    <article className="mb-12 group cursor-pointer" onClick={() => handleReadMore(featured)}>
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
                                    <time dateTime={featured.date} className="text-slate-300 text-sm font-medium">
                                        {new Date(featured.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </time>
                                </div>
                                <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight group-hover:text-indigo-200 transition-colors">{featured.title}</h2>
                                <p className="text-slate-200 text-lg line-clamp-2 mb-6">{featured.content}</p>
                                <button onClick={(e) => { e.stopPropagation(); handleReadMore(featured); }} className="text-white font-semibold underline decoration-2 underline-offset-4 decoration-rose-500 hover:text-rose-400 transition-colors">Read Full Story</button>
                            </div>
                        </div>
                    </article>
                )}
            
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2 space-y-8">
                        {others.map(announcement => (
                            <article key={announcement.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-all cursor-pointer" onClick={() => handleReadMore(announcement)}>
                                <div className="md:w-1/4 shrink-0">
                                    <time dateTime={announcement.date} className="bg-indigo-100 dark:bg-indigo-900/50 rounded-lg h-32 flex flex-col items-center justify-center text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 block">
                                        <span className="text-3xl font-bold">{new Date(announcement.date).getDate()}</span>
                                        <span className="text-sm font-medium uppercase">{new Date(announcement.date).toLocaleDateString(undefined, { month: 'short' })}</span>
                                        <span className="text-xs text-indigo-400 dark:text-indigo-300 mt-1">{new Date(announcement.date).getFullYear()}</span>
                                    </time>
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
                            </article>
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
                            <time dateTime={selectedAnnouncement.date}>{new Date(selectedAnnouncement.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</time>
                            <span>•</span>
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold">{selectedAnnouncement.author || 'Admin'}</span>
                        </div>
                        <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white mb-6">{selectedAnnouncement.title}</h2>
                        <div className="prose prose-slate dark:prose-invert max-w-none mb-8">
                            <p className="whitespace-pre-wrap leading-relaxed text-lg text-slate-700 dark:text-slate-300">{selectedAnnouncement.content}</p>
                        </div>

                        {/* Social Share Section */}
                        <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Share this update</h4>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => handleShare('whatsapp', selectedAnnouncement)}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors text-sm font-bold"
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                                    WhatsApp
                                </button>
                                <button 
                                    onClick={() => handleShare('twitter', selectedAnnouncement)}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm font-bold"
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                    X (Twitter)
                                </button>
                                <button 
                                    onClick={() => handleShare('facebook', selectedAnnouncement)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors text-sm font-bold"
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                                    Facebook
                                </button>
                            </div>
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
