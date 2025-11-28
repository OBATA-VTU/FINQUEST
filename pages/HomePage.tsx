
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Announcement, GalleryItem } from '../types';
import { db } from '../firebase';
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';

const LEVEL_IMAGES: Record<number, string> = {
    100: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80", 
    200: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80", 
    300: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80", 
    400: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
};

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryItem[]>([]);
  const [hodData, setHodData] = useState<any>(null);

  // Optimized Scroll Reveal using IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });

    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [announcements, galleryImages]); // Re-run when content loads

  useEffect(() => {
    const fetchContent = async () => {
        try {
            // News
            const q = query(collection(db, 'announcements'), orderBy('date', 'desc'), limit(3));
            const snapshot = await getDocs(q);
            setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement)));

            // Gallery
            const gQ = query(collection(db, 'gallery'), orderBy('date', 'desc'), limit(4));
            const gSnap = await getDocs(gQ);
            setGalleryImages(gSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryItem)));

            // HOD Content
            const hodDoc = await getDoc(doc(db, 'content', 'hod_message'));
            if (hodDoc.exists()) {
                setHodData(hodDoc.data());
            }
        } catch (error) {
            console.error("Failed to fetch homepage content", error);
        }
    };
    fetchContent();
  }, []);

  return (
    <div className="font-sans bg-white text-slate-800">
      
      {/* 1. HERO SECTION */}
      <div className="relative h-[90vh] min-h-[600px] flex items-center justify-center bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 z-0">
             <img 
                src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80" 
                alt="AAUA Campus" 
                className="w-full h-full object-cover scale-105 animate-[blob_20s_infinite_alternate] opacity-40 will-change-transform"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10 text-center text-white mt-16">
            <div className="animate-fade-in-down">
                <span className="inline-block py-1 px-3 border border-indigo-400/50 rounded-full bg-indigo-900/30 backdrop-blur-md text-indigo-200 text-xs font-bold tracking-[0.2em] uppercase mb-6">
                    Adekunle Ajasin University
                </span>
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold leading-tight mb-6">
                    Department of <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-white to-indigo-200">Finance</span>
                </h1>
                <p className="text-lg md:text-2xl text-slate-200 max-w-3xl mx-auto font-light leading-relaxed mb-10">
                    Empowering the next generation of financial leaders through academic excellence, ethical grounding, and innovative research.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button onClick={() => navigate('/login')} className="px-10 py-4 bg-white text-indigo-900 font-bold rounded shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:bg-indigo-50 transition-all uppercase tracking-widest text-sm">
                        Student Portal
                    </button>
                    <button onClick={() => navigate('/announcements')} className="px-10 py-4 border border-white text-white font-bold rounded hover:bg-white/10 transition-all uppercase tracking-widest text-sm">
                        Latest News
                    </button>
                </div>
            </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-white/50">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
        </div>
      </div>

      {/* 2. HOD WELCOME */}
      <section className="py-20 md:py-32 bg-white reveal">
          <div className="container mx-auto px-4">
              <div className="flex flex-col lg:flex-row items-center gap-16">
                  <div className="lg:w-1/2 relative">
                      <div className="absolute top-4 left-4 w-full h-full border-2 border-indigo-100 -z-10"></div>
                      <img 
                        src={hodData?.imageUrl || "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"} 
                        alt="Head of Department" 
                        className="w-full h-auto shadow-2xl grayscale hover:grayscale-0 transition-all duration-700"
                      />
                      <div className="absolute -bottom-6 -right-6 bg-indigo-900 text-white p-8 max-w-xs shadow-xl hidden md:block">
                          <p className="font-serif text-xl font-bold">{hodData?.name || "Dr. A. A. Adebayo"}</p>
                          <p className="text-xs text-indigo-300 uppercase tracking-widest mt-1">Head of Department</p>
                      </div>
                  </div>
                  <div className="lg:w-1/2">
                      <h2 className="text-indigo-600 font-bold tracking-widest uppercase text-sm mb-4">From the Desk of the H.O.D</h2>
                      <h3 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-8 leading-tight">
                         {hodData?.title || "Breeding Financial Experts."}
                      </h3>
                      <div className="prose prose-lg text-slate-600 mb-8">
                        <p>{hodData?.message || "Welcome to the Department of Finance at AAUA. Our curriculum is designed not just to teach market theories, but to instill the critical thinking and ethical grounding necessary for the modern financial landscape. We are committed to fostering an environment where innovation meets tradition."}</p>
                      </div>
                      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Signature_sample.svg/1200px-Signature_sample.svg.png" alt="Signature" className="h-16 opacity-40" />
                  </div>
              </div>
          </div>
      </section>

      {/* 3. FINQUEST HUB */}
      <section className="py-24 bg-slate-900 text-white relative overflow-hidden reveal">
          <div className="absolute top-0 right-0 w-2/3 h-full bg-slate-800/50 -skew-x-12 transform origin-top-right"></div>
          
          <div className="container mx-auto px-4 relative z-10">
              <div className="flex flex-col md:flex-row justify-between items-end mb-16">
                  <div className="max-w-2xl">
                    <h2 className="text-4xl font-serif font-bold mb-4">The FINQUEST Hub</h2>
                    <p className="text-slate-400 text-lg">A centralized digital ecosystem designed to support your academic journey from admission to graduation.</p>
                  </div>
                  <button onClick={() => navigate('/dashboard')} className="hidden md:block text-indigo-300 hover:text-white font-bold border-b border-indigo-300 hover:border-white pb-1 transition-colors">Enter Student Portal &rarr;</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div onClick={() => navigate('/questions')} className="group bg-white/5 border border-white/10 p-10 hover:bg-indigo-600 transition-colors duration-500 cursor-pointer">
                      <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mb-8 group-hover:bg-white group-hover:text-indigo-600 transition-colors">
                          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                      </div>
                      <h3 className="text-2xl font-bold mb-4 font-serif">Past Questions</h3>
                      <p className="text-slate-400 group-hover:text-indigo-100 leading-relaxed">
                          Access a comprehensive archive of verified past examination papers, sorted by course code and year.
                      </p>
                  </div>
                  
                  <div onClick={() => navigate('/community')} className="group bg-white/5 border border-white/10 p-10 hover:bg-rose-600 transition-colors duration-500 cursor-pointer">
                      <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mb-8 group-hover:bg-white group-hover:text-rose-600 transition-colors">
                          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                      </div>
                      <h3 className="text-2xl font-bold mb-4 font-serif">Community</h3>
                      <p className="text-slate-400 group-hover:text-rose-100 leading-relaxed">
                          Join official WhatsApp and Telegram study groups, discuss coursework, and network with peers.
                      </p>
                  </div>

                  <div onClick={() => navigate('/lecturers')} className="group bg-white/5 border border-white/10 p-10 hover:bg-emerald-600 transition-colors duration-500 cursor-pointer">
                      <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-8 group-hover:bg-white group-hover:text-emerald-600 transition-colors">
                          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                      </div>
                      <h3 className="text-2xl font-bold mb-4 font-serif">Department Directory</h3>
                      <p className="text-slate-400 group-hover:text-emerald-100 leading-relaxed">
                          Connect with your lecturers, view their research interests, and access departmental contact info.
                      </p>
                  </div>
              </div>
          </div>
      </section>

      {/* 4. NEWS & EVENTS */}
      <section className="py-24 bg-white border-y border-slate-100 reveal">
          <div className="container mx-auto px-4">
              <div className="flex flex-col lg:flex-row gap-16">
                  <div className="lg:w-1/3">
                      <h2 className="text-4xl font-serif font-bold text-slate-900 mb-6">Departmental News</h2>
                      <p className="text-slate-600 text-lg mb-8">Stay updated with official announcements, exam schedules, seminar notifications, and scholarship opportunities.</p>
                      <button onClick={() => navigate('/announcements')} className="px-8 py-4 bg-indigo-900 text-white font-bold hover:bg-indigo-800 transition shadow-xl uppercase tracking-widest text-sm">View All Updates</button>
                  </div>
                  <div className="lg:w-2/3">
                      <div className="grid gap-8">
                          {announcements.length > 0 ? (
                              announcements.map((news) => (
                                  <div key={news.id} className="group flex flex-col sm:flex-row gap-6 p-6 border border-slate-100 hover:border-indigo-100 hover:shadow-lg transition-all bg-white cursor-pointer" onClick={() => navigate('/announcements')}>
                                      <div className="w-24 shrink-0 flex flex-col text-center border-r border-slate-100 pr-6 justify-center">
                                          <span className="block text-4xl font-serif font-bold text-indigo-200 group-hover:text-indigo-600 transition-colors">{new Date(news.date).getDate()}</span>
                                          <span className="text-xs font-bold uppercase text-slate-400">{new Date(news.date).toLocaleDateString(undefined, {month: 'short'})}</span>
                                      </div>
                                      <div>
                                          <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-indigo-700 transition-colors font-serif">{news.title}</h3>
                                          <p className="text-slate-600 line-clamp-2">{news.content}</p>
                                      </div>
                                  </div>
                              ))
                          ) : (
                              <div className="text-slate-400 italic p-8 border border-dashed border-slate-200 text-center">No recent announcements found.</div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* 5. CAMPUS LIFE GALLERY */}
      <section className="py-24 bg-slate-50 reveal">
          <div className="container mx-auto px-4 text-center mb-16">
              <span className="text-indigo-600 font-bold uppercase tracking-widest text-xs">Student Experience</span>
              <h2 className="text-4xl font-serif font-bold text-slate-900 mt-3">Life at FINSA</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 h-[600px]">
             {galleryImages.length > 0 ? (
                 <>
                    {galleryImages.map((img, idx) => (
                        <div key={img.id} className={`relative group overflow-hidden ${idx === 0 ? 'col-span-2 row-span-2' : idx === 3 ? 'col-span-2 row-span-1' : ''}`}>
                            <img src={img.imageUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt={img.caption} />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                                <span className="text-white font-bold text-xl">{img.caption}</span>
                            </div>
                        </div>
                    ))}
                    {galleryImages.length < 4 && (
                         <div className="bg-slate-200 flex items-center justify-center text-slate-400">Add more photos via Admin</div>
                    )}
                 </>
             ) : (
                 // Default Placeholders if no dynamic content
                 <>
                    <div className="col-span-2 row-span-2 relative group overflow-hidden">
                        <img src="https://images.unsplash.com/photo-1523580494863-6f3031224c94?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Event" />
                    </div>
                    <div className="relative group overflow-hidden">
                        <img src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Class" />
                    </div>
                    <div className="relative group overflow-hidden">
                        <img src="https://images.unsplash.com/photo-1571260899304-425eee4c7efc?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Library" />
                    </div>
                    <div className="col-span-2 row-span-1 relative group overflow-hidden">
                        <img src="https://images.unsplash.com/photo-1427504743055-b72976e3d716?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Study" />
                    </div>
                 </>
             )}
          </div>
      </section>

      {/* 6. FOOTER CTA */}
      <section className="py-28 bg-indigo-900 text-white text-center reveal">
          <div className="container mx-auto px-4 max-w-4xl">
              <h2 className="text-4xl md:text-5xl font-serif font-bold mb-8">Ready to Excel?</h2>
              <p className="text-indigo-200 text-xl mb-12 font-light">Join thousands of students using the FINQUEST portal to access resources, connect with mentors, and master their degree.</p>
              <button onClick={() => navigate('/login')} className="px-12 py-5 bg-white text-indigo-900 font-bold rounded shadow-2xl hover:bg-indigo-50 transition uppercase tracking-widest text-sm">
                  Access Student Portal
              </button>
          </div>
      </section>

    </div>
  );
};
