
import React, { useEffect, useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "What is FINSA?",
    answer: "FINSA (Finance Students' Association) is the official digital portal for the Finance Department of Adekunle Ajasin University. It serves as a central hub for students to access academic resources, news, and connect with the community."
  },
  {
    question: "How do I access past questions?",
    answer: "Once you log in, navigate to the 'Past Questions' page from the dashboard or sidebar. You can filter questions by level, year, and course code."
  },
  {
    question: "Is the CBT practice test free?",
    answer: "Yes, the AI-powered CBT practice test is free for all registered Finance students. You can take topic-based quizzes or full mock exams."
  },
  {
    question: "How can I join the department's WhatsApp group?",
    answer: "Go to the 'Community' page. There you will find direct links to join the official WhatsApp group, Telegram channel, and other social platforms."
  },
  {
    question: "I forgot my password. How can I reset it?",
    answer: "Currently, password reset is handled via Firebase Authentication. If you signed up with Google, use your Google account recovery. For email sign-ups, please contact the admin for assistance if you cannot access your account."
  },
  {
    question: "Can I upload past questions?",
    answer: "Yes! We encourage contributions. Go to the 'Past Questions' page and click the upload button. Your submission will be reviewed by an admin before it appears on the site."
  },
  {
    question: "Who developed this portal?",
    answer: "This portal was developed by the Public Relations Officer (PRO) of the 2025/2026 Executive Council, dedicated to serving the Finance students of AAUA."
  }
];

export const FAQPage: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const toggleFAQ = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-16 transition-colors">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif font-bold text-slate-900 dark:text-white mb-4">Frequently Asked Questions</h1>
          <p className="text-slate-600 dark:text-slate-400">Common questions about the FINSA portal and department resources.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-300"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-4 text-left flex justify-between items-center focus:outline-none hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <span className="font-bold text-slate-800 dark:text-slate-200 text-lg">{faq.question}</span>
                <span className={`transform transition-transform duration-300 ${activeIndex === index ? 'rotate-180' : ''}`}>
                  <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>
              <div 
                className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${activeIndex === index ? 'max-h-96 py-4 opacity-100' : 'max-h-0 py-0 opacity-0'}`}
              >
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-slate-500 dark:text-slate-400 mb-4">Still have questions?</p>
          <a 
            href="mailto:finsa@gmail.com" 
            className="inline-block px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition shadow-lg hover:-translate-y-1"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
};
