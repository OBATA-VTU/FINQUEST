import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Announcement, GalleryItem } from '../types';
import { db } from '../firebase';
import { collection, query, orderBy, limit, getDocs, doc, getDoc, getCountFromServer, where } from 'firebase/firestore';
import { AdBanner } from '../components/AdBanner';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryItem[]>([]);
  const [hodData, setHodData] = useState<any>(null);
  const [stats, setStats] = useState({ users: 0, materials: 0, tests: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observerRef.current?.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '50px' });

    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach(el => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, [announcements, galleryImages, stats]); 

  useEffect(() => {
    const fetchContent = async () => {
        try {
            // Fetch content in parallel
            const [newsSnap, gallerySnap, hodSnap, userCountSnap, materialCountSnap, testCountSnap] = await Promise.all([
                getDocs(query(collection(db, 'announcements'), orderBy('date', 'desc'), limit(3))),
                getDocs(query(collection(db, 'gallery'), orderBy('date', 'desc'), limit(4))),
                getDoc(doc(db, 'content', 'hod_message')),
                getCountFromServer(collection(db, 'users')),
                getCountFromServer(query(collection(db, 'questions'), where('status', '==', 'approved'))),
                getCountFromServer(collection(db, 'test_results'))
            ]);

            setAnnouncements(newsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement)));
            setGalleryImages(gallerySnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryItem)));
            if (hodSnap.exists()) setHodData(hodSnap.data());
            setStats({
                users: userCountSnap.data().count,
                materials: materialCountSnap.data().count,
                tests: testCountSnap.data().count,
            });
            setLoadingStats(false);
        } catch (error) {
            console.error("Failed to fetch homepage content", error);
            setLoadingStats(false);
        }
    };
    fetchContent();
  }, []);

  return (
    <div className="font-sans bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-x-hidden transition-colors duration-300">
      
      {/* 1. HERO SECTION */}
      <div className="relative h-[85vh] min-h-[600px] flex items-center justify-center bg-slate-950 overflow-hidden">
        <div className="absolute inset-0 z-0">
             <img 
                src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80" 
                alt="AAUA Campus" 
                loading="eager"
                className="w-full h-full object-cover opacity-30 animate-kenburns origin-center grayscale-[30%]"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10 text-center text-white mt-12">
            <div className="animate-fade-in-down max-w-5xl mx-auto">
                <span className="inline-block py-1.5 px-4 border border-indigo-400/50 rounded-full bg-indigo-900/30 backdrop-blur-md text-indigo-200 text-xs font-bold tracking-[0.3em] uppercase mb-8 shadow-lg">
                    Adekunle Ajasin University
                </span>
                <h1 className="text-5xl sm:text-6xl md:text-8xl font-serif font-black leading-tight mb-8 drop-shadow-2xl tracking-tight">
                    Department of <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-white to-indigo-200">Finance</span>
                </h1>
                <p className="text-lg md:text-2xl text-slate-300 max-w-3xl mx-auto font-light leading-relaxed mb-12 drop-shadow-md px-6">
                    Breeding financial experts through academic excellence, ethical grounding, and innovative research.
                </p>
                <div className="flex flex-col sm:flex-row gap-5 justify-center">
                    <button onClick={() => navigate('/login')} className="w-full sm:w-auto px-10 py-4 bg-white text-indigo-950 font-bold rounded-full shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:bg-indigo-50 transition-all uppercase tracking-widest text-xs hover:scale-105 transform duration-300">
                        Student Portal
                    </button>
                    <button onClick={() => navigate('/announcements')} className="w-full sm:w-auto px-10 py-4 border border-white/50 text-white font-bold rounded-full hover:bg-white/10 transition-all uppercase tracking-widest text-xs hover:scale-105 transform duration-300 backdrop-blur-sm">
                        Latest News
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* NEW: STATS SECTION */}
      <section className="bg-slate-50 dark:bg-slate-900 py-20 reveal">
          <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                  <div className="text-center bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                      <h3 className="text-5xl font-black text-indigo-600 dark:text-indigo-400 mb-2">{loadingStats ? '...' : stats.users}+</h3>
                      <p className="font-bold text-slate-500 dark:text-slate-400">Registered Students</p>
                  </div>
                  <div className="text-center bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                      <h3 className="text-5xl font-black text-emerald-600 dark:text-emerald-400 mb-2">{loadingStats ? '...' : stats.materials}+</h3>
                      <p className="font-bold text-slate-500 dark:text-slate-400">Study Materials</p>
                  </div>
                  <div className="text-center bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                      <h3 className="text-5xl font-black text-rose-600 dark:text-rose-400 mb-2">{loadingStats ? '...' : stats.tests}+</h3>
                      <p className="font-bold text-slate-500 dark:text-slate-400">Tests Completed</p>
                  </div>
              </div>
          </div>
      </section>

      {/* 2. HOD WELCOME */}
      <section className="py-24 bg-white dark:bg-slate-950 transition-colors reveal">
          <div className="container mx-auto px-4">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-8 md:p-12 shadow-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col lg:flex-row items-start gap-12">
                      <div className="w-full lg:w-1/3 shrink-0">
                          <div className="relative group">
                              <div className="absolute inset-0 bg-indigo-600 rounded-2xl transform translate-x-3 translate-y-3 transition-transform group-hover:translate-x-2 group-hover:translate-y-2"></div>
                              <img 
                                src={hodData?.imageUrl || "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"} 
                                alt="Head of Department" 
                                className="w-full h-auto shadow-lg rounded-2xl relative z-10 object-cover aspect-[3/4]"
                              />
                          </div>
                      </div>
                      <div className="w-full lg:w-2/3 flex flex-col justify-center pt-4">
                          <div className="mb-6 border-b border-slate-200 dark:border-slate-700 pb-6">
                              <span className="text-indigo-600 dark:text-indigo-400 font-bold tracking-[0.2em] uppercase text-xs block mb-2">From the Desk of the H.O.D</span>
                              <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 dark:text-white mb-2">{hodData?.name || "Dr. A. A. Adebayo"}</h2>
                              <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">{hodData?.title || "Head of Department, Finance"}</p>
                          </div>
                          <div className="prose prose-lg text-slate-600 dark:text-slate-300 leading-loose">
                            <p>{hodData?.message || "Welcome to the Department of Finance at AAUA. Our curriculum is designed not just to teach market theories, but to instill the critical thinking and ethical grounding necessary for the modern financial landscape."}</p>
                          </div>
                          <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-700 flex items-center gap-4">
                              <div className="h-10 w-1 bg-indigo-500 rounded-full"></div>
                              <p className="text-sm font-bold text-indigo-900 dark:text-indigo-300 italic">"Breeding Financial Experts"</p>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* NEW: HOW IT WORKS */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900 reveal">
          <div className="container mx-auto px-4">
              <div className="text-center max-w-3xl mx-auto mb-16">
                  <h2 className="text-3xl md:text-5xl font-serif font-bold text-slate-900 dark:text-white mb-6">A Smarter Way to Study</h2>
                  <p className="text-slate-600 dark:text-slate-400 text-lg">Your entire academic journey, streamlined into three simple steps.</p>
              </div>
              <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-700 hidden md:block"></div>
                  <div className="relative text-center p-6">
                      <div className="w-16 h-16 mx-auto bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-2xl font-bold text-indigo-600 dark:text-indigo-400 border-4 border-slate-50 dark:border-slate-900 shadow-md mb-4">1</div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Create Your Account</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Quickly register with your student details to get personalized access.</p>
                  </div>
                  <div className="relative text-center p-6">
                      <div className="w-16 h-16 mx-auto bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-2xl font-bold text-indigo-600 dark:text-indigo-400 border-4 border-slate-50 dark:border-slate-900 shadow-md mb-4">2</div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access the Archives</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Instantly find and download past questions, notes, and other materials.</p>
                  </div>
                  <div className="relative text-center p-6">
                      <div className="w-16 h-16 mx-auto bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-2xl font-bold text-indigo-600 dark:text-indigo-400 border-4 border-slate-50 dark:border-slate-900 shadow-md mb-4">3</div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Practice & Excel</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Use the AI-powered CBT to test your knowledge and climb the leaderboard.</p>
                  </div>
              </div>
          </div>
      </section>

      {/* 3. FEATURE CARDS */}
      <section className="py-24 bg-white dark:bg-slate-950 relative overflow-hidden reveal">
          <div className="container mx-auto px-4 relative z-10">
              <div className="text-center max-w-3xl mx-auto mb-16">
                  <h2 className="text-3xl md:text-5xl font-serif font-bold text-slate-900 dark:text-white mb-6">The FINSA Hub</h2>
                  <p className="text-slate-600 dark:text-slate-400 text-lg">A centralized digital ecosystem designed to support your academic journey.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div onClick={() => navigate('/questions')} className="group bg-slate-50 dark:bg-slate-900 p-10 rounded-3xl shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer border border-slate-100 dark:border-slate-800">
                      <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-8 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                      </div>
                      <h3 className="text-2xl font-bold mb-4 font-serif text-slate-900 dark:text-white">Past Questions</h3>
                      <p className="text-slate-500 dark:text-slate-400 leading-relaxed">Access a comprehensive archive of verified past examination papers, sorted by course code.</p>
                  </div>
                  <div onClick={() => navigate('/community')} className="group bg-slate-50 dark:bg-slate-900 p-10 rounded-3xl shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer border border-slate-100 dark:border-slate-800">
                      <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center mb-8 text-rose-600 dark:text-rose-400 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                      </div>
                      <h3 className="text-2xl font-bold mb-4 font-serif text-slate-900 dark:text-white">Community</h3>
                      <p className="text-slate-500 dark:text-slate-400 leading-relaxed">Join official WhatsApp and Telegram study groups, discuss coursework, and network.</p>
                  </div>
                  <div onClick={() => navigate('/lecturers')} className="group bg-slate-50 dark:bg-slate-900 p-10 rounded-3xl shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer border border-slate-100 dark:border-slate-800">
                      <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-8 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                      </div>
                      <h3 className="text-2xl font-bold mb-4 font-serif text-slate-900 dark:text-white">Faculty Directory</h3>
                      <p className="text-slate-500 dark:text-slate-400 leading-relaxed">Connect with your lecturers, view their research interests, and access contact info.</p>
                  </div>
              </div>
          </div>
      </section>

      {/* 4. NEWS & EVENTS */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900 transition-colors reveal">
          <div className="container mx-auto px-4">
              <div className="flex flex-col lg:flex-row gap-16">
                  <div className="lg:w-1/3">
                      <h2 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 dark:text-white mb-8">Departmental News</h2>
                      <p className="text-slate-600 dark:text-slate-400 text-lg mb-10 leading-relaxed">Stay updated with official announcements, exam schedules, seminar notifications, and scholarship opportunities.</p>
                      <button onClick={() => navigate('/announcements')} className="px-10 py-4 bg-indigo-900 text-white font-bold hover:bg-indigo-800 transition shadow-xl uppercase tracking-widest text-xs">View All Updates</button>
                  </div>
                  <div className="lg:w-2/3">
                      <div className="grid gap-8">
                          {announcements.length > 0 ? (
                              announcements.map((news) => (
                                  <div key={news.id} className="group flex flex-col sm:flex-row gap-8 p-8 border border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900/50 hover:shadow-lg transition-all bg-white dark:bg-slate-950 cursor-pointer rounded-2xl" onClick={() => navigate('/announcements')}>
                                      <div className="w-auto sm:w-24 shrink-0 flex flex-row sm:flex-col items-center sm:items-center text-center border-b sm:border-b-0 sm:border-r border-slate-100 dark:border-slate-800 pb-4 sm:pb-0 sm:pr-8 justify-center gap-4 sm:gap-0">
                                          <span className="block text-4xl md:text-5xl font-serif font-black text-indigo-300 dark:text-indigo-500/50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{new Date(news.date).getDate()}</span>
                                          <span className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">{new Date(news.date).toLocaleDateString(undefined, {month: 'short'})}</span>
                                      </div>
                                      <div>
                                          <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors font-serif">{news.title}</h3>
                                          <p className="text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">{news.content}</p>
                                      </div>
                                  </div>
                              ))
                          ) : (
                              <div className="text-slate-400 italic p-12 border border-dashed border-slate-200 dark:border-slate-800 text-center rounded-2xl">No recent announcements found.</div>
                          )}
                      </div>
                  </div>
              </div>
              <AdBanner />
          </div>
      </section>

      {/* 5. FOOTER CTA */}
      <section className="py-28 bg-indigo-950 text-white text-center reveal transition-colors">
          <div className="container mx-auto px-4 max-w-4xl">
              <h2 className="text-4xl md:text-6xl font-serif font-bold mb-8">Ready to Excel?</h2>
              <p className="text-indigo-200 text-xl mb-12 font-light">Join thousands of students using the FINSA portal to access resources, connect with mentors, and master their degree.</p>
              <button onClick={() => navigate('/login')} className="px-12 py-5 bg-white text-indigo-950 font-bold rounded-full shadow-2xl hover:bg-indigo-50 transition uppercase tracking-widest text-sm transform hover:scale-105 duration-300">
                  Access Student Portal
              </button>
          </div>
      </section>

    </div>
  );
};
