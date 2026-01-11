
import React, { useEffect, useState } from 'react';

interface FAQItem {
  category: string;
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  { category: 'General', question: "What is the FINSA Portal?", answer: "FINSA (Finance Students' Association) is the official digital portal for the Finance Department of Adekunle Ajasin University. It serves as a centralized hub for academic resources, news, and student interaction." },
  { category: 'General', question: "Who can use this portal?", answer: "The portal is designed for students and staff of the Finance Department at AAUA. While guests can view public pages, logging in is required to access core features like the archives, community, and practice center." },
  { category: 'General', question: "How do I install the app on my phone?", answer: "On most Android devices, your browser will prompt you to 'Add to Home Screen'. On iOS (iPhone/iPad), tap the 'Share' button in Safari, then scroll down and select 'Add to Home Screen'. You can also visit the 'Install App' page from the main menu." },
  { category: 'General', question: "Who developed this portal?", answer: "The portal was developed by OBA, the Public Relations Officer (PRO) of the Finance Department for the 2025/2026 academic session." },
  
  { category: 'Support', question: "How do I contact support?", answer: "For all inquiries, technical issues, or support, please contact the current PRO via the official contact details provided on the site. For the 2025/2026 session, the primary contact is WhatsApp: 08142452729." },
  { category: 'Support', question: "I found a bug. What should I do?", answer: "We appreciate your help! Please take a screenshot of the issue and send it along with a brief description to the PRO's contact number." },
  
  { category: 'Academic', question: "How do I access past questions?", answer: "Navigate to the 'Resources Archives' page from the sidebar. You can then filter materials by your level, category (e.g., Past Question, Lecture Note), or search by course code and title." },
  { category: 'Academic', question: "What is the CBT Practice Center?", answer: "The Practice Center allows you to take AI-powered mock exams, generate custom quizzes on any topic, or play educational arcade games to test your knowledge and prepare for exams." },
  
  { category: 'Account', question: "How do I verify my account?", answer: "Account verification (which grants a blue badge) is handled by administrators. To be eligible, ensure your profile is complete with your full name and correct matriculation number." },
  { category: 'Account', "question": "I forgot my password.", "answer": "On the login page, click 'Forgot Password?'. Enter the email address associated with your account, and a password reset link will be sent to you." },
  { category: 'Account', question: "How do I earn badges?", answer: "Badges are awarded automatically for various activities on the portal, such as contributing materials, scoring high on tests, saving resources for study, and participating in the community. Explore the platform to discover them all!" },

  { category: 'Community', question: "Why can't I send messages in the Student Lounge?", answer: "If you're unable to send messages, you may be temporarily muted. The platform has an automated moderation system that detects and sanctions the use of inappropriate language to maintain a respectful environment." },
  { category: 'Community', question: "What happens if I use foul language?", answer: "Using foul language will result in an automatic, temporary mute from the chat. The mute duration increases with each subsequent violation. After 6 violations, your account will be automatically suspended." },
  
  { category: 'Marketplace', question: "Is the Marketplace safe?", answer: "The marketplace is a student-to-student platform. For your safety, we strongly recommend dealing only with verified users (those with a blue badge). FINSA and the department are not responsible for any transactions." }
];

const CATEGORIES = ['All', 'General', 'Academic', 'Account', 'Community', 'Marketplace', 'Support'];

export const FAQPage: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const filteredFaqs = faqs.filter(f => {
      const matchesSearch = searchTerm === '' || f.question.toLowerCase().includes(searchTerm.toLowerCase()) || f.answer.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || f.category === selectedCategory;
      return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors">
      <div className="bg-white dark:bg-slate-900 py-20 text-center border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 dark:text-white mb-4">Help Center</h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">Find answers to common questions about the FINSA portal.</p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          <aside className="lg:col-span-1 lg:sticky lg:top-8 self-start">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-800 dark:text-white mb-4">Categories</h3>
              <ul className="space-y-2">
                {CATEGORIES.map(cat => (
                  <li key={cat}>
                    <button 
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full text-left px-4 py-2.5 text-sm font-bold rounded-lg transition-colors ${selectedCategory === cat ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                    >
                      {cat}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
          
          <main className="lg:col-span-3">
            <div className="relative mb-8">
              <input 
                  type="text" 
                  placeholder="Search for answers..." 
                  className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
              />
              <svg className="w-6 h-6 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>

            <div className="space-y-4">
              {filteredFaqs.length > 0 ? filteredFaqs.map((faq, index) => (
                <div key={index} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-300">
                  <button 
                    onClick={() => setActiveIndex(activeIndex === index ? null : index)} 
                    className="w-full px-6 py-5 text-left flex justify-between items-center group focus:outline-none"
                  >
                    <span className={`font-bold text-lg transition-colors ${activeIndex === index ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}>{faq.question}</span>
                    <span className={`transform transition-transform duration-300 text-slate-500 ${activeIndex === index ? 'rotate-180 text-indigo-600' : ''}`}><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></span>
                  </button>
                  <div className={`transition-all duration-300 ease-in-out overflow-hidden ${activeIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="px-6 pb-6 pt-2 text-slate-600 dark:text-slate-400 leading-relaxed prose prose-sm max-w-none dark:prose-invert">
                        <p>{faq.answer}</p>
                      </div>
                  </div>
                </div>
              )) : (
                  <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                      <p className="text-slate-500 dark:text-slate-400 font-medium">No questions found matching your search.</p>
                  </div>
              )}
            </div>
          </main>

        </div>
      </div>
    </div>
  );
};
