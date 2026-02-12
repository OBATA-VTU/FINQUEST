
import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

interface FAQItem {
  category: string;
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  { category: 'General', question: "What is the FINSA Portal?", answer: "FINSA (Finance Students' Association) is the official digital portal for the Finance Department of Adekunle Ajasin University. It serves as a centralized hub for academic resources, news, and student interaction." },
  { category: 'General', question: "How do I install the app on my phone?", answer: "On most Android devices, your browser will prompt you to 'Add to Home Screen'. On iOS (iPhone/iPad), tap the 'Share' button in Safari, then scroll down and select 'Add to Home Screen'." },
  { category: 'General', question: "Who developed this portal?", answer: "The portal was developed by OBA, the Public Relations Officer (PRO) of the Finance Department for the 2025/2026 academic session." },
  { category: 'Academic', question: "How do I access past questions?", answer: "Navigate to the 'Resources Archives' page from the sidebar. You can then filter materials by your level, category (e.g., Past Question, Lecture Note), or search by course code and title." },
  { category: 'Academic', question: "What is the CBT Practice Center?", answer: "The Practice Center allows you to take AI-powered mock exams, generate custom quizzes on any topic, or play educational arcade games to test your knowledge." },
  { category: 'Account', question: "How do I earn badges?", answer: "Badges are awarded automatically for various activities on the portal, such as contributing materials, scoring high on tests, and participating in the community." },
  { category: 'Community', question: "Why can't I send messages in the Student Lounge?", answer: "If you're unable to send messages, you may be temporarily muted for use of inappropriate language to maintain a respectful environment." }
];

const CATEGORIES = ['All', 'General', 'Academic', 'Account', 'Community'];

export const FAQPage: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [proContact, setProContact] = useState('2348142452729');

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchSettings = async () => {
        try {
            const snap = await getDoc(doc(db, 'content', 'social_links'));
            if (snap.exists() && snap.data().whatsapp) {
                const wa = snap.data().whatsapp;
                // Extract number from me/ or link
                const match = wa.match(/(?:me\/|send\?phone=)(\d+)/);
                if (match) setProContact(match[1]);
                else if (/^\d+$/.test(wa.replace(/[^\d]/g, ''))) setProContact(wa.replace(/[^\d]/g, ''));
            }
        } catch (e) {}
    };
    fetchSettings();
  }, []);

  const filteredFaqs = faqs.filter(f => {
      const matchesSearch = searchTerm === '' || f.question.toLowerCase().includes(searchTerm.toLowerCase()) || f.answer.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || f.category === selectedCategory;
      return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="bg-indigo-950 text-white py-24 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1434031211128-095490e7e73b?auto=format&fit=crop&q=80')] bg-cover opacity-10 mix-blend-overlay"></div>
        <div className="container mx-auto px-4 relative z-10">
          <span className="text-indigo-400 font-black tracking-[0.4em] uppercase text-[10px] block mb-4">Assistance Center</span>
          <h1 className="text-5xl md:text-7xl font-serif font-black mb-6 tracking-tighter">Knowledge Base</h1>
          <p className="text-indigo-200 text-lg max-w-xl mx-auto font-light leading-relaxed">Find verified answers to departmental inquiries and portal functionality.</p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="flex flex-col lg:flex-row gap-12">
          <aside className="lg:w-72 shrink-0">
            <div className="sticky top-24 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 px-2">Navigation</h3>
              <ul className="space-y-1.5">
                {CATEGORIES.map(cat => (
                  <li key={cat}>
                    <button 
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full text-left px-5 py-3.5 text-xs font-black rounded-2xl uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-indigo-600'}`}
                    >
                      {cat}
                    </button>
                  </li>
                ))}
              </ul>
              
              <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 px-2 text-center lg:text-left">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Further Enquiries</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed font-medium">Contact the current Public Relations Officer (PRO) for direct administrative support.</p>
                  <a href={`https://wa.me/${proContact}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/30 transition-all transform hover:-translate-y-1 active:scale-95">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                    Contact PRO
                  </a>
              </div>
            </div>
          </aside>
          
          <main className="flex-1 min-w-0">
            <div className="relative mb-12">
              <input 
                  type="text" 
                  placeholder="Search for solutions..." 
                  className="w-full pl-14 pr-6 py-6 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white font-bold transition-all"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
              />
              <svg className="w-6 h-6 text-slate-300 absolute left-5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>

            <div className="space-y-6">
              {filteredFaqs.length > 0 ? filteredFaqs.map((faq, index) => (
                <div key={index} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-500 group hover:shadow-2xl hover:border-indigo-500/30">
                  <button 
                    onClick={() => setActiveIndex(activeIndex === index ? null : index)} 
                    className="w-full px-10 py-8 text-left flex justify-between items-center group focus:outline-none"
                  >
                    <span className={`text-xl font-bold transition-colors font-serif leading-tight ${activeIndex === index ? 'text-indigo-600' : 'text-slate-900 dark:text-white'}`}>{faq.question}</span>
                    <div className={`p-2.5 rounded-2xl transition-all duration-500 ${activeIndex === index ? 'bg-indigo-600 text-white rotate-180 shadow-lg shadow-indigo-500/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </button>
                  <div className={`transition-all duration-500 ease-in-out overflow-hidden ${activeIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="px-10 pb-10 pt-0 text-slate-600 dark:text-slate-400 leading-relaxed text-lg font-medium">
                        <div className="h-px bg-slate-100 dark:bg-slate-800 mb-8 w-1/4"></div>
                        {faq.answer}
                      </div>
                  </div>
                </div>
              )) : (
                  <div className="text-center py-32 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                      <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Knowledge Archive Empty</p>
                  </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
