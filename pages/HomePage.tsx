import React, { useEffect, useState, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Announcement, GalleryItem } from '../types';
import { db } from '../firebase';
import { collection, query, orderBy, limit, getDocs, doc, getDoc, getCountFromServer, where } from 'firebase/firestore';
import { AdBanner } from '../components/AdBanner';
import { AuthContext } from '../contexts/AuthContext';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
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
    }, { threshold: 0.1, rootMargin: '0px' });

    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach(el => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, [announcements, galleryImages, stats]); 

  useEffect(() => {
    const fetchContent = async () => {
        try {
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

  const handleCtaClick = () => {
      if (auth?.user) {
          // If user is already logged in, take them to their dashboard
          navigate('/dashboard');
      } else {
          // Otherwise take them to signup
          navigate('/signup');
      }
  };

  return (
    <div className="font-sans bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-x-hidden transition-colors duration-300">
      
      {/* Dynamic Hero Section */}
      <div className="relative h-[100vh] min-h-[700px] flex items-center justify-center bg-slate-950 overflow-hidden">
        <div className="absolute inset-0 z-0">
             <img 
                src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80" 
                alt="AAUA Campus" 
                className="w-full h-full object-cover opacity-20 animate-kenburns origin-center"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>
             
             {/* Animated Orbs */}
             <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-bounce-slow"></div>
             <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-bounce-slow" style={{animationDelay: '4s'}}></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10 text-center text-white">
            <div className="animate-fade-in-down max-w-5xl mx-auto">
                <span className="inline-block py-1.5 px-4 border border-indigo-400/30 rounded-full bg-indigo-950/40 backdrop-blur-md text-indigo-200 text-[10px] font-black tracking-[0.4em] uppercase mb-8 shadow-lg">
                    Adekunle Ajasin University
                </span>
                <h1 className="text-5xl sm:text-6xl md:text-8xl font-serif font-black leading-[1.1] mb-8 drop-shadow-2xl tracking-tighter">
                    Empowering <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-white to-indigo-200 animate-gradient-text" style={{backgroundSize: '200% auto'}}>
                        Financial Experts
                    </span>
                </h1>
                <p className="text-lg md:text-2xl text-slate-300 max-w-3xl mx-auto font-light leading-relaxed mb-12 drop-shadow-md px-6">
                    Join the digital vanguard of the Department of Finance. Excellence in academic resources, community engagement, and research.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                        onClick={handleCtaClick}
                        className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 px-10 py-5 bg-white text-indigo-950 font-bold rounded-full shadow-2xl hover:shadow-white/20 transition-all duration-300 transform hover:scale-[1.05]"
                    >
                        <span className="text-xs uppercase tracking-widest">{auth?.user ? 'Enter Portal' : 'Get Started'}</span>
                        <svg className="w-4 h-4 transition-transform group-hover:translate-x-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </button>
                    <button
                        onClick={() => navigate('/download-app')}
                        className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 px-10 py-5 border-2 border-white/20 text-white font-bold rounded-full backdrop-blur-sm hover:bg-white/10 hover:border-white/50 transition-all duration-300"
                    >
                        <span className="text-xs uppercase tracking-widest">Download App</span>
                    </button>
                    <button
                        onClick={() => navigate('/announcements')}
                        className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 px-10 py-5 border-2 border-white/20 text-white font-bold rounded-full backdrop-blur-sm hover:bg-white/10 hover:border-white/50 transition-all duration-300"
                    >
                        <span className="text-xs uppercase tracking-widest">Department News</span>
                    </button>
                </div>
            </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50 animate-bounce">
            <div className="w-5 h-8 border-2 border-white rounded-full flex justify-center p-1">
                <div className="w-1 h-2 bg-white rounded-full"></div>
            </div>
        </div>
      </div>
      
      {/* Finance Ticker */}
      <section className="bg-indigo-950 py-3 border-y border-white/10 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap">
            {[0, 1, 2, 3].map((_, i) => (
                <React.Fragment key={i}> 
                    <span className="text-[10px] font-black text-indigo-300 mx-8 uppercase tracking-widest flex items-center gap-2"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" strokeWidth={3}/></svg> Verified Archives</span>
                    <span className="text-[10px] font-black text-indigo-300 mx-8 uppercase tracking-widest flex items-center gap-2"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth={3}/></svg> CBT Practice</span>
                    <span className="text-[10px] font-black text-indigo-300 mx-8 uppercase tracking-widest flex items-center gap-2"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeWidth={2}/></svg> Community Support</span>
                </React.Fragment>
            ))}
        </div>
      </section>

      {/* Pillars of Excellence Section */}
      <section className="py-24 bg-white dark:bg-slate-950 transition-colors reveal">
          <div className="container mx-auto px-4">
              <div className="text-center max-w-3xl mx-auto mb-16">
                  <span className="text-indigo-600 font-bold tracking-widest text-[10px] uppercase block mb-3">Our Core Mandate</span>
                  <h2 className="text-3xl md:text-5xl font-serif font-black text-slate-900 dark:text-white mb-6 leading-tight">Pillars of Academic Integrity</h2>
                  <p className="text-slate-600 dark:text-slate-400 text-lg">We define the future of Nigerian finance through three primary pillars.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="p-10 rounded-[2.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 group hover:bg-indigo-600 transition-all duration-500 hover:-translate-y-2">
                      <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-950 rounded-2xl flex items-center justify-center mb-8 text-indigo-600 dark:text-indigo-400 group-hover:bg-white/20 group-hover:text-white transition-colors">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                      </div>
                      <h3 className="text-2xl font-bold mb-4 font-serif text-slate-900 dark:text-white group-hover:text-white transition-colors">Quantitative Precision</h3>
                      <p className="text-slate-500 dark:text-slate-400 group-hover:text-indigo-100 transition-colors leading-relaxed">Mastering the mathematics of markets, from risk assessment to complex financial modeling.</p>
                  </div>
                  <div className="p-10 rounded-[2.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 group hover:bg-emerald-600 transition-all duration-500 hover:-translate-y-2">
                      <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950 rounded-2xl flex items-center justify-center mb-8 text-emerald-600 dark:text-emerald-400 group-hover:bg-white/20 group-hover:text-white transition-colors">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 20.944A12.02 12.02 0 0012 22a12.02 12.02 0 009-1.056A11.955 11.955 0 0112 2.944z" /></svg>
                      </div>
                      <h3 className="text-2xl font-bold mb-4 font-serif text-slate-900 dark:text-white group-hover:text-white transition-colors">Ethical Leadership</h3>
                      <p className="text-slate-500 dark:text-slate-400 group-hover:text-emerald-50 transition-colors leading-relaxed">Instilling the moral compass required to navigate and lead corporate and public financial institutions.</p>
                  </div>
                  <div className="p-10 rounded-[2.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 group hover:bg-rose-600 transition-all duration-500 hover:-translate-y-2">
                      <div className="w-14 h-14 bg-rose-100 dark:bg-rose-950 rounded-2xl flex items-center justify-center mb-8 text-rose-600 dark:text-rose-400 group-hover:bg-white/20 group-hover:text-white transition-colors">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <h3 className="text-2xl font-bold mb-4 font-serif text-slate-900 dark:text-white group-hover:text-white transition-colors">Global Connectivity</h3>
                      <p className="text-slate-500 dark:text-slate-400 group-hover:text-rose-50 transition-colors leading-relaxed">Bridging local financial theory with global market dynamics and international standards.</p>
                  </div>
              </div>
          </div>
      </section>

      {/* HOD Welcome Section */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900 transition-colors reveal">
          <div className="container mx-auto px-4">
              <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-8 md:p-16 shadow-2xl border border-slate-100 dark:border-slate-700 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                  <div className="flex flex-col lg:flex-row items-center gap-16">
                      <div className="w-full lg:w-2/5 shrink-0">
                          <div className="relative group">
                              <div className="absolute inset-0 bg-indigo-600 rounded-[2rem] transform rotate-3 scale-95 transition-transform group-hover:rotate-1 duration-500"></div>
                              <img 
                                src={hodData?.imageUrl || "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"} 
                                alt="Head of Department" 
                                className="w-full h-auto shadow-2xl rounded-[2rem] relative z-10 object-cover aspect-[4/5]"
                              />
                          </div>
                      </div>
                      <div className="w-full lg:w-3/5 flex flex-col justify-center">
                          <div className="mb-8">
                              <span className="text-indigo-600 dark:text-indigo-400 font-black tracking-[0.3em] uppercase text-[10px] block mb-4">From the Desk of the H.O.D</span>
                              <h2 className="text-4xl md:text-5xl font-serif font-black text-slate-900 dark:text-white mb-3">{hodData?.name || "Dr. A. A. Adebayo"}</h2>
                              <p className="text-xl text-indigo-500 dark:text-indigo-400 font-bold">{hodData?.title || "Head of Department, Finance"}</p>
                          </div>
                          <div className="prose prose-xl text-slate-600 dark:text-slate-300 leading-relaxed italic border-l-8 border-indigo-200 dark:border-indigo-900 pl-10">
                            <p>"{hodData?.message || "Welcome to the Department of Finance at AAUA. Our curriculum is designed not just to teach market theories, but to instill the critical thinking and ethical grounding necessary for the modern financial landscape."}"</p>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* Professional Path Guidance */}
      <section className="py-24 bg-white dark:bg-slate-950 reveal">
          <div className="container mx-auto px-4">
              <div className="bg-slate-900 rounded-[3rem] p-12 md:p-20 text-white relative overflow-hidden shadow-2xl">
                  <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_bottom_right,_rgba(79,70,229,0.2),_transparent_60%)]"></div>
                  <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-12">
                      <div className="max-w-xl text-center lg:text-left">
                          <h2 className="text-4xl md:text-5xl font-serif font-black mb-6">Beyond the Degree</h2>
                          <p className="text-indigo-200 text-lg mb-8 leading-relaxed">Preparation for global certifications starts here. We provide guidance and resources for your professional journey.</p>
                          <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                              <span className="px-5 py-2.5 bg-white/10 rounded-full border border-white/20 text-xs font-black tracking-widest uppercase">ICAN</span>
                              <span className="px-5 py-2.5 bg-white/10 rounded-full border border-white/20 text-xs font-black tracking-widest uppercase">ACCA</span>
                              <span className="px-5 py-2.5 bg-white/10 rounded-full border border-white/20 text-xs font-black tracking-widest uppercase">CFA</span>
                              <span className="px-5 py-2.5 bg-white/10 rounded-full border border-white/20 text-xs font-black tracking-widest uppercase">CIS</span>
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 w-full lg:w-auto">
                          <div className="bg-white/5 backdrop-blur-md p-8 rounded-3xl border border-white/10 text-center">
                              <span className="block text-4xl font-black text-indigo-400 mb-1">100%</span>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Digital Support</span>
                          </div>
                          <div className="bg-white/5 backdrop-blur-md p-8 rounded-3xl border border-white/10 text-center mt-6">
                              <span className="block text-4xl font-black text-emerald-400 mb-1">24/7</span>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Resource Access</span>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* Featured News Grid */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900 transition-colors reveal">
          <div className="container mx-auto px-4">
              <div className="flex flex-col lg:flex-row gap-16 items-center">
                  <div className="lg:w-2/5 animate-slide-in-up">
                      <h2 className="text-4xl md:text-5xl font-serif font-black text-slate-900 dark:text-white mb-8">Departmental Intelligence</h2>
                      <p className="text-slate-600 dark:text-slate-400 text-lg mb-10 leading-relaxed">Stay updated with official bulletins, exam schedules, and strategic scholarship opportunities.</p>
                      <button onClick={() => navigate('/announcements')} className="group inline-flex items-center justify-center gap-4 px-10 py-5 bg-indigo-950 text-white font-bold rounded-full shadow-2xl hover:bg-indigo-900 transition uppercase tracking-widest text-[10px]">
                          <span>View All Intelligence</span>
                          <svg className="w-4 h-4 transition-transform group-hover:translate-x-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </button>
                  </div>
                  <div className="lg:w-3/5 w-full">
                      <div className="space-y-6">
                          {announcements.length > 0 ? (
                              announcements.map((news, i) => (
                                  <div key={news.id} className="group flex items-center gap-6 p-6 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 hover:shadow-2xl transition-all bg-white dark:bg-slate-900/50 backdrop-blur-sm cursor-pointer rounded-[2rem]" onClick={() => navigate('/announcements')} style={{animationDelay: `${150 * (i+1)}ms`}}>
                                      <div className="w-20 shrink-0 flex flex-col items-center text-center">
                                          <span className="block text-5xl font-serif font-black text-indigo-600/20 dark:text-indigo-500/10 group-hover:text-indigo-600 transition-colors">{new Date(news.date).getDate()}</span>
                                          <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">{new Date(news.date).toLocaleDateString(undefined, {month: 'short'})}</span>
                                      </div>
                                      <div className="border-l-2 border-slate-100 dark:border-slate-800 pl-8">
                                          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 transition-colors font-serif">{news.title}</h3>
                                          <p className="text-slate-500 dark:text-slate-400 line-clamp-2 text-sm leading-relaxed">{news.content}</p>
                                      </div>
                                  </div>
                              ))
                          ) : (
                              <div className="text-slate-400 italic p-12 border border-dashed border-slate-200 dark:border-slate-800 text-center rounded-3xl">No recent intelligence reports found.</div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-32 bg-gradient-to-br from-indigo-950 via-slate-950 to-indigo-950 text-white text-center reveal transition-colors relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/az-subtle.png')] opacity-10"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="container mx-auto px-4 max-w-4xl relative">
              <h2 className="text-5xl md:text-7xl font-serif font-black mb-8 leading-tight">Master Your <br/><span className="text-indigo-400">Financial Destiny</span></h2>
              <p className="text-slate-400 text-xl mb-14 font-light max-w-2xl mx-auto">Access the intelligence, tools, and community required to become a world-class financial expert.</p>
              <button onClick={handleCtaClick} className="group relative inline-flex items-center justify-center gap-4 px-12 py-6 bg-indigo-600 text-white font-black rounded-full shadow-2xl hover:bg-indigo-500 transition-all uppercase tracking-[0.2em] text-xs transform hover:scale-105 duration-300">
                <span className="relative z-10">{auth?.user ? 'Enter Portal' : 'Join Now'}</span>
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
          </div>
      </section>

    </div>
  );
};