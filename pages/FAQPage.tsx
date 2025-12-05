
import React, { useEffect, useState } from 'react';

interface FAQItem {
  category: string;
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  { category: 'General', question: "What is FINSA?", answer: "FINSA (Finance Students' Association) is the official digital portal for the Finance Department of Adekunle Ajasin University." },
  { category: 'General', question: "Who developed this portal?", answer: "Developed by the Public Relations Officer (PRO) of the 2025/2026 Executive Council." },
  { category: 'Academic', question: "How do I access past questions?", answer: "Navigate to the 'Past Questions' page. You can filter by level, year, and course code." },
  { category: 'Academic', question: "Is the CBT practice test free?", answer: "Yes, the AI-powered CBT practice test is free for all registered Finance students." },
  { category: 'Account', question: "I forgot my password.", answer: "Use the 'Forgot Password' link on the login page to reset it via email." },
  { category: 'Community', question: "How can I join the WhatsApp group?", answer: "Go to the 'Community' page for direct links to official groups." },
  { category: 'Contributions', question: "Can I upload materials?", answer: "Yes! Use the upload button on the Past Questions page. You earn points for approved uploads." }
];

const CATEGORIES = ['All', 'General', 'Academic', 'Account', 'Community', 'Contributions'];

export const FAQPage: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const filteredFaqs = faqs.filter(f => {
      const matchesSearch = f.question.toLowerCase().includes(searchTerm.toLowerCase()) || f.answer.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || f.category === selectedCategory;
      return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-16 transition-colors">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-serif font-bold text-slate-900 dark:text-white mb-4">Help Center</h1>
          <p className="text-slate-600 dark:text-slate-400">Find answers to common questions.</p>
        </div>

        <div className="mb-8">
            <input 
                type="text" 
                placeholder="Search for a question..." 
                className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
            {CATEGORIES.map(cat => (
                <button 
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                >
                    {cat}
                </button>
            ))}
        </div>

        <div className="space-y-4">
          {filteredFaqs.length > 0 ? filteredFaqs.map((faq, index) => (
            <div key={index} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button onClick={() => setActiveIndex(activeIndex === index ? null : index)} className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <span className="font-bold text-slate-800 dark:text-slate-200">{faq.question}</span>
                <span className={`transform transition-transform ${activeIndex === index ? 'rotate-180' : ''}`}>
                  <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </span>
              </button>
              {activeIndex === index && (
                  <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-700/50 animate-fade-in">
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{faq.answer}</p>
                  </div>
              )}
            </div>
          )) : (
              <div className="text-center py-10 text-slate-500">No results found.</div>
          )}
        </div>

        <div className="mt-16 text-center">
          <p className="text-slate-500 dark:text-slate-400 mb-4">Still need help?</p>
          <a href="mailto:finsa@gmail.com" className="inline-block px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition shadow-lg">Contact Support</a>
        </div>
      </div>
    </div>
  );
};
