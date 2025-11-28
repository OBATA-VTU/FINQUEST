import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Announcement } from '../types';
import { db } from '../firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

const LEVEL_IMAGES: Record<number, string> = {
    100: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80", 
    200: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80", 
    300: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80", 
    400: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
};

// Hook for scroll animations
const useScrollReveal = () => {
    useEffect(() => {
        const reveals = document.querySelectorAll('.reveal');
        const handleScroll = () => {
            const windowHeight = window.innerHeight;
            const elementVisible = 150;
            reveals.forEach((reveal) => {
                const elementTop = reveal.getBoundingClientRect().top;
                if (elementTop < windowHeight - elementVisible) {
                    reveal.classList.add('active');
                }
            });
        };
        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Trigger once on load
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);
};

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  useScrollReveal();
  
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    const fetchNews = async () => {
        try {
            const q = query(collection(db, 'announcements'), orderBy('date', 'desc'), limit(3));
            const snapshot = await getDocs(q);
            const news = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
            setAnnouncements(news);
        } catch (error) {
            console.error("Failed to fetch news", error);
        }
    };
    fetchNews();
  }, []);

  return (
    <div className="font-sans overflow-x-hidden bg-white text-slate-800">
      
      {/* 1. HERO SECTION: Institutional & Grand */}
      <div className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
        {/* Background Slider Effect */}
        <div className="absolute inset-0 z-0">
             <img 
                src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80" 
                alt="AAUA Campus" 
                className="w-full h-full object-cover scale-105 animate-[blob_20s_infinite_alternate]"
             />
             <div className="absolute inset-0 bg-slate-900/70"></div>
             <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/20 to-slate-900"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10 text-center text-white mt-16">
            <div className="animate-fade-in-down">
                <span className="inline-block py-1 px-3 border border-indigo-400/50 rounded-full bg-indigo-900/30 backdrop-blur-md text-indigo-200 text-xs font-bold tracking-[0.2em] uppercase mb-6">
                    Adekunle Ajasin University, Akungba-Akoko
                </span>
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold leading-tight mb-6">
                    Department of <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-white to-indigo-200">Finance</span>
                </h1>
                <p className="text-lg md:text-2xl text-slate-200 max-w-3xl mx-auto font-light leading-relaxed mb-10">
                    Fostering a culture of academic excellence, ethical leadership, and global financial expertise since inception.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button onClick={() => navigate('/login')} className="px-8 py-4 bg-white text-indigo-900 font-bold rounded-sm shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:bg-indigo-50 transition-all uppercase tracking-widest text-sm">
                        Student Portal
                    </button>
                    <button onClick={() => navigate('/announcements')} className="px-8 py-4 border border-white text-white font-bold rounded-sm hover:bg-white/10 transition-all uppercase tracking-widest text-sm">
                        Latest News
                    </button>
                </div>
            </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-white/50">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
        </div>
      </div>

      {/* 2. HOD WELCOME: Official Message */}
      <section className="py-20 md:py-28 bg-white reveal">
          <div className="container mx-auto px-4">
              <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
                  <div className="lg:w-1/2 relative">
                      <div className="absolute top-4 left-4 w-full h-full border-2 border-indigo-100 rounded-sm -z-10"></div>
                      <img 
                        src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
                        alt="Head of Department" 
                        className="w-full h-auto rounded-sm shadow-xl grayscale hover:grayscale-0 transition-all duration-700"
                      />
                      <div className="absolute bottom-0 left-0 bg-indigo-900 text-white p-6 max-w-xs">
                          <p className="font-serif text-xl font-bold">Dr. A. A. Adebayo</p>
                          <p className="text-xs text-indigo-300 uppercase tracking-widest mt-1">Head of Department</p>
                      </div>
                  </div>
                  <div className="lg:w-1/2">
                      <h2 className="text-indigo-600 font-bold tracking-widest uppercase text-sm mb-4">Welcome Message</h2>
                      <h3 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-6 leading-tight">Breeding the Next Generation of Financial Experts.</h3>
                      <p className="text-slate-600 text-lg leading-relaxed mb-6">
                          "Welcome to the Department of Finance at AAUA. Our curriculum is designed not just to teach market theories, but to instill the critical thinking and ethical grounding necessary for the modern financial landscape."
                      </p>
                      <p className="text-slate-600 text-lg leading-relaxed mb-8">
                          "Through FINQUEST, we are bridging the gap between traditional learning and digital accessibility, ensuring every student has the resources to thrive."
                      </p>
                      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Signature_sample.svg/1200px-Signature_sample.svg.png" alt="Signature" className="h-12 opacity-60" />
                  </div>
              </div>
          </div>
      </section>

      {/* 3. FINQUEST HUB: The Tools */}
      <section className="py-20 bg-slate-900 text-white relative overflow-hidden reveal">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-slate-800/50 skew-x-12 transform origin-top-right"></div>
          
          <div className="container mx-auto px-4 relative z-10">
              <div className="text-center max-w-3xl mx-auto mb-16">
                  <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">The FINQUEST Digital Hub</h2>
                  <p className="text-slate-400 text-lg">Centralized academic resources tailored for your success at every level.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Card 1 */}
                  <div onClick={() => navigate('/questions')} className="group bg-white/5 border border-white/10 p-8 hover:bg-indigo-600 transition-colors duration-300 cursor-pointer rounded-sm">
                      <div className="w-14 h-14 bg-indigo-500/20 rounded-full flex items-center justify-center mb-6 group-hover:bg-white group-hover:text-indigo-600 transition-colors">
                          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                      </div>
                      <h3 className="text-xl font-bold mb-3">Past Question Archive</h3>
                      <p className="text-slate-400 group-hover:text-indigo-100 text-sm leading-relaxed">
                          Access thousands of verified past questions sorted by course code and year.
                      </p>
                  </div>
                  
                  {/* Card 2 */}
                  <div onClick={() => navigate('/community')} className="group bg-white/5 border border-white/10 p-8 hover:bg-rose-600 transition-colors duration-300 cursor-pointer rounded-sm">
                      <div className="w-14 h-14 bg-rose-500/20 rounded-full flex items-center justify-center mb-6 group-hover:bg-white group-hover:text-rose-600 transition-colors">
                          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                      </div>
                      <h3 className="text-xl font-bold mb-3">Student Community</h3>
                      <p className="text-slate-400 group-hover:text-rose-100 text-sm leading-relaxed">
                          Join study groups, discussion forums, and connect with peers across levels.
                      </p>
                  </div>

                  {/* Card 3 */}
                  <div onClick={() => navigate('/lecturers')} className="group bg-white/5 border border-white/10 p-8 hover:bg-emerald-600 transition-colors duration-300 cursor-pointer rounded-sm">
                      <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 group-hover:bg-white group-hover:text-emerald-600 transition-colors">
                          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                      </div>
                      <h3 className="text-xl font-bold mb-3">Faculty Directory</h3>
                      <p className="text-slate-400 group-hover:text-emerald-100 text-sm leading-relaxed">
                          Meet your lecturers, view their specializations, and access research publications.
                      </p>
                  </div>
              </div>
          </div>
      </section>

      {/* 4. ACADEMIC LEVELS: Visual Grid */}
      <section className="py-20 bg-slate-50 reveal">
          <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row justify-between items-end mb-12">
                  <div className="max-w-xl">
                      <h2 className="text-3xl font-serif font-bold text-slate-900 mb-4">Academic Programs</h2>
                      <p className="text-slate-600">Tailored resources for every stage of your undergraduate journey. Select your level to access specific course materials.</p>
                  </div>
                  <button onClick={() => navigate('/questions')} className="hidden md:block text-indigo-700 font-bold border-b-2 border-indigo-700 pb-1 hover:text-indigo-900">View All Levels &rarr;</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[100, 200, 300, 400].map((level) => (
                      <div key={level} onClick={() => navigate('/questions')} className="group relative h-96 cursor-pointer overflow-hidden rounded-sm">
                          <img 
                            src={LEVEL_IMAGES[level]} 
                            alt={`${level} Level`} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-slate-900/40 group-hover:bg-slate-900/60 transition-colors"></div>
                          <div className="absolute inset-0 p-8 flex flex-col justify-end text-white">
                              <span className="text-6xl font-serif font-bold opacity-30 absolute top-4 right-4">{level}</span>
                              <h3 className="text-2xl font-bold mb-2">{level} Level</h3>
                              <p className="text-sm text-slate-200 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                                  {level === 100 ? "Introduction to Financial Principles" :
                                   level === 200 ? "Core Micro & Macro Economics" :
                                   level === 300 ? "Advanced Investment Analysis" :
                                   "Professional Ethics & Project"}
                              </p>
                              <span className="mt-4 text-xs font-bold uppercase tracking-widest border-b border-white inline-block w-max pb-1">Enter Portal</span>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </section>

      {/* 5. NEWS & EVENTS TICKER */}
      <section className="py-20 bg-white border-y border-slate-100 reveal">
          <div className="container mx-auto px-4">
              <div className="flex flex-col lg:flex-row gap-12">
                  <div className="lg:w-1/3">
                      <h2 className="text-3xl font-serif font-bold text-slate-900 mb-6">Latest News</h2>
                      <p className="text-slate-600 mb-8">Stay updated with departmental announcements, exam schedules, and scholarship opportunities.</p>
                      <button onClick={() => navigate('/announcements')} className="px-6 py-3 bg-indigo-900 text-white font-bold rounded-sm hover:bg-indigo-800 transition">View All Updates</button>
                  </div>
                  <div className="lg:w-2/3">
                      <div className="space-y-6">
                          {announcements.length > 0 ? (
                              announcements.map((news) => (
                                  <div key={news.id} className="flex flex-col sm:flex-row gap-6 pb-6 border-b border-slate-100 last:border-0 group cursor-pointer" onClick={() => navigate('/announcements')}>
                                      <div className="w-full sm:w-32 shrink-0">
                                          <span className="block text-3xl font-serif font-bold text-slate-300 group-hover:text-indigo-600 transition-colors">{new Date(news.date).getDate()}</span>
                                          <span className="text-xs font-bold uppercase text-slate-400">{new Date(news.date).toLocaleDateString(undefined, {month: 'long'})}</span>
                                      </div>
                                      <div>
                                          <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-indigo-700 transition-colors">{news.title}</h3>
                                          <p className="text-slate-600 text-sm line-clamp-2">{news.content}</p>
                                      </div>
                                  </div>
                              ))
                          ) : (
                              <div className="text-slate-400 italic">No recent announcements found.</div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* 6. STUDENT LIFE GALLERY */}
      <section className="py-20 bg-slate-50 reveal">
          <div className="container mx-auto px-4 text-center mb-12">
              <span className="text-indigo-600 font-bold uppercase tracking-widest text-xs">Campus Experience</span>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mt-2">Life at FINSA</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 h-96 md:h-[500px]">
              <div className="col-span-1 md:col-span-2 row-span-2 relative group overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1523580494863-6f3031224c94?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Students" />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors"></div>
                  <div className="absolute bottom-4 left-4 text-white font-bold">Annual Dinner</div>
              </div>
              <div className="relative group overflow-hidden">
                   <img src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Lecture" />
              </div>
              <div className="relative group overflow-hidden">
                   <img src="https://images.unsplash.com/photo-1571260899304-425eee4c7efc?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Library" />
              </div>
              <div className="col-span-2 row-span-1 relative group overflow-hidden">
                   <img src="https://images.unsplash.com/photo-1427504743055-b72976e3d716?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Group Study" />
              </div>
          </div>
      </section>

      {/* 7. FOOTER CTA */}
      <section className="py-20 bg-indigo-900 text-white text-center reveal">
          <div className="container mx-auto px-4 max-w-3xl">
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">Ready to Excel?</h2>
              <p className="text-indigo-200 text-lg mb-10">Join the thousands of students using FINQUEST to master their finance degree.</p>
              <button onClick={() => navigate('/login')} className="px-10 py-4 bg-white text-indigo-900 font-bold rounded-sm hover:bg-indigo-50 transition shadow-xl uppercase tracking-widest text-sm">
                  Access Portal Now
              </button>
          </div>
      </section>

    </div>
  );
};