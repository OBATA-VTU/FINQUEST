
import React from 'react';
import { Link } from 'react-router-dom';

const ValueCard = ({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 text-center hover:shadow-lg transition-shadow">
        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto mb-4">
            {icon}
        </div>
        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">{children}</p>
    </div>
);

export const AboutPage: React.FC = () => {
    return (
        <div className="bg-slate-50 dark:bg-slate-950 min-h-full transition-colors animate-fade-in">
            {/* Hero Section */}
            <div className="relative bg-slate-900 py-32 text-white text-center shadow-lg overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')] bg-cover opacity-20 mix-blend-soft-light"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-indigo-900/50 to-transparent"></div>
                <div className="relative z-10 container mx-auto px-4">
                    <h1 className="text-4xl md:text-6xl font-extrabold font-serif mb-4 animate-fade-in-down">About The Department of Finance</h1>
                    <p className="text-indigo-200 text-lg max-w-2xl mx-auto font-light animate-fade-in-down" style={{animationDelay: '200ms'}}>
                        Fostering the next generation of financial leaders and innovators at Adekunle Ajasin University.
                    </p>
                </div>
            </div>

            {/* Mission & Vision Section */}
            <section className="py-20 bg-white dark:bg-slate-900">
                <div className="container mx-auto px-4 max-w-5xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="animate-slide-in-up">
                            <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white mb-4">Our Mission</h2>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                To provide students with a robust and comprehensive education in finance, equipping them with the analytical skills, ethical grounding, and practical knowledge necessary to excel in the dynamic global financial industry.
                            </p>
                        </div>
                        <div className="animate-slide-in-up" style={{animationDelay: '200ms'}}>
                            <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white mb-4">Our Vision</h2>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                To be a leading center for financial education and research in Nigeria, recognized for producing innovative, ethically-minded graduates who drive economic growth and shape the future of finance.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Core Values Section */}
            <section className="py-20 bg-slate-50 dark:bg-slate-950">
                <div className="container mx-auto px-4 max-w-6xl">
                    <div className="text-center mb-12">
                         <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white mb-4">Our Core Values</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {/* FIX: Added missing 'children' prop to ValueCard components to provide descriptive text for each core value, resolving the TypeScript error. */}
                        <ValueCard title="Excellence" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6.343 17.657l-2.828 2.828M20.485 3.515l2.828 2.828M17.657 6.343l2.828-2.828M3.515 20.485l2.828-2.828M12 21v-4M21 12h-4M12 3v4M3 12h4m6 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}>
                            We pursue the highest standards in teaching, research, and learning.
                        </ValueCard>
                         <ValueCard title="Integrity" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 20.944A12.02 12.02 0 0012 22a12.02 12.02 0 009-1.056A11.955 11.955 0 0112 2.944z" /></svg>}>
                            We uphold the principles of honesty, ethics, and professional responsibility.
                        </ValueCard>
                         <ValueCard title="Community" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}>
                            We foster a supportive and collaborative environment for all our students.
                        </ValueCard>
                         <ValueCard title="Innovation" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}>
                            We embrace technology and forward-thinking to solve modern financial challenges.
                        </ValueCard>
                    </div>
                </div>
            </section>
            
            {/* The Portal Section */}
            <section className="py-20 bg-white dark:bg-slate-900">
                <div className="container mx-auto px-4 max-w-5xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white mb-4">The FINSA Digital Portal</h2>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl mx-auto">
                           This portal is the digital manifestation of our mission. Developed to enhance the academic experience, it provides students with the tools they need to succeed in one centralized, accessible platform.
                        </p>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-center md:text-left">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                            </div>
                            <div><h3 className="font-bold text-slate-800 dark:text-white">Centralized Resources</h3><p className="text-sm text-slate-500 dark:text-slate-400">Easy access to past questions and lecture notes.</p></div>
                        </div>
                         <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                             </div>
                            <div><h3 className="font-bold text-slate-800 dark:text-white">Smart Practice</h3><p className="text-sm text-slate-500 dark:text-slate-400">AI-powered CBT to test knowledge on any topic.</p></div>
                        </div>
                     </div>
                </div>
            </section>
        </div>
    );
};