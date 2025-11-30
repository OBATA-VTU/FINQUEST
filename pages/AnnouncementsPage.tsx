
import React, { useEffect, useState } from 'react';
import { AdBanner } from '../components/AdBanner';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Announcement } from '../types';

export const AnnouncementsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

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

  const featured = announcements[0];
  const others = announcements.slice(1);

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-10">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">News & Updates</h1>
                <p className="text-slate-500">Stay informed about departmental activities.</p>
            </div>
            <button className="hidden md:block px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">
                Subscribe to RSS
            </button>
        </div>

        {loading ? (
            <div className="text-center py-20">Loading news...</div>
        ) : announcements.length === 0 ? (
            <div className="text-center py-20 text-slate-500">No announcements yet.</div>
        ) : (
            <>
                {/* Featured Announcement */}
                {featured && (
                    <div className="mb-12 group cursor-pointer">
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
                                <span className="text-white font-semibold underline decoration-2 underline-offset-4 decoration-rose-500 hover:text-rose-400 transition-colors">Read Full Story</span>
                            </div>
                        </div>
                    </div>
                )}
            
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2 space-y-8">
                        {others.map(announcement => (
                            <div key={announcement.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
                                <div className="md:w-1/4 shrink-0">
                                    <div className="bg-indigo-100 rounded-lg h-32 flex flex-col items-center justify-center text-indigo-700 border border-indigo-200">
                                        <span className="text-3xl font-bold">{new Date(announcement.date).getDate()}</span>
                                        <span className="text-sm font-medium uppercase">{new Date(announcement.date).toLocaleDateString(undefined, { month: 'short' })}</span>
                                        <span className="text-xs text-indigo-400 mt-1">{new Date(announcement.date).getFullYear()}</span>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Update</span>
                                        <span className="text-slate-300">•</span>
                                        <span className="text-xs text-slate-500">By {announcement.author || 'Admin'}</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-3 hover:text-indigo-600 transition-colors cursor-pointer">{announcement.title}</h3>
                                    <p className="text-slate-600 leading-relaxed mb-4 line-clamp-3">{announcement.content}</p>
                                    <button className="text-indigo-600 font-medium text-sm hover:underline">Read More &rarr;</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-8">
                        {/* Categories Widget */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-slate-900 mb-4 text-lg">Categories</h3>
                            <div className="flex flex-wrap gap-2">
                                {['Academic', 'Events', 'Scholarships', 'General', 'Sports'].map(cat => (
                                    <span key={cat} className="px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full text-sm text-slate-600 cursor-pointer transition-colors">
                                        {cat}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Newsletter Widget */}
                        <div className="bg-indigo-900 p-6 rounded-xl shadow-lg text-white">
                            <h3 className="font-bold text-lg mb-2">Don't Miss Out</h3>
                            <p className="text-indigo-200 text-sm mb-4">Get the latest past questions and updates sent directly to your inbox.</p>
                            <input type="email" placeholder="Your email address" className="w-full px-4 py-2 rounded-lg text-slate-900 mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                            <button className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg font-bold transition-colors">Subscribe</button>
                        </div>
                        
                        <AdBanner />
                    </div>
                </div>
            </>
        )}
      </div>
    </div>
  );
};
