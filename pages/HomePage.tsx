
import React from 'react';
import { Page } from '../types';
import { MOCK_ANNOUNCEMENTS } from '../constants';

interface HomePageProps {
  onNavigate: (page: Page) => void;
}

const LEVEL_IMAGES: Record<number, string> = {
    100: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80", 
    200: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=80", 
    300: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=800&q=80", 
    400: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80" 
};

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  return (
    <div className="font-sans overflow-x-hidden">
      {/* Hero Section */}
      <div className="relative bg-slate-900 text-white min-h-[500px] lg:min-h-[600px] flex items-center overflow-hidden py-12 lg:py-0">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
             <img 
                src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80" 
                alt="University Campus" 
                className="w-full h-full object-cover opacity-30"
             />
             <div className="absolute inset-0 bg-gradient-to-r from-indigo-950 via-purple-950/90 to-indigo-900/80"></div>
        </div>

        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none z-0">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
            <div className="absolute top-0 -right-4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left mt-8 lg:mt-0">
            <div className="inline-block px-3 py-1 mb-4 lg:mb-6 rounded-full bg-indigo-800/50 border border-indigo-500/30 backdrop-blur-sm text-indigo-200 text-xs lg:text-sm font-semibold tracking-wide uppercase">
              The Official FINQUEST Portal
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold leading-tight mb-4 lg:mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
              Master Your <br />
              <span className="text-white">Finance Degree.</span>
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-indigo-200 mb-6 lg:mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Access a comprehensive repository of past questions, connect with top lecturers, and stay updated with FINQUEST.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <button
                onClick={() => onNavigate('questions')}
                className="px-6 py-3.5 bg-white text-indigo-900 font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 text-sm md:text-base"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
                Browse Questions
              </button>
              <button
                onClick={() => onNavigate('community')}
                className="px-6 py-3.5 bg-indigo-700/50 backdrop-blur-sm border border-indigo-500/50 text-white font-bold rounded-xl hover:bg-indigo-700 hover:border-indigo-500 transition-all duration-300 text-sm md:text-base"
              >
                Join Community
              </button>
            </div>
          </div>
          
          <div className="hidden lg:block relative">
            <div className="relative bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500 group">
                <div className="absolute inset-0 rounded-2xl overflow-hidden -z-10">
                     <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80" alt="Analytics" className="w-full h-full object-cover opacity-20" />
                </div>
                <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-4">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <div className="ml-auto text-xs text-indigo-200 font-mono">FINQUEST_V1.0</div>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center justify-between text-indigo-200 text-sm">
                        <span>Market Analysis</span>
                        <span className="text-green-400">+24.5%</span>
                    </div>
                    <div className="h-24 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-lg flex items-end p-2 gap-2">
                         <div className="w-1/5 h-[40%] bg-indigo-400 rounded-sm"></div>
                         <div className="w-1/5 h-[60%] bg-indigo-400 rounded-sm"></div>
                         <div className="w-1/5 h-[30%] bg-indigo-400 rounded-sm"></div>
                         <div className="w-1/5 h-[80%] bg-indigo-300 rounded-sm"></div>
                         <div className="w-1/5 h-[65%] bg-indigo-400 rounded-sm"></div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="bg-white border-b border-slate-100 relative -mt-8 mx-4 md:mx-auto max-w-6xl rounded-xl shadow-lg p-6 md:p-8 z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-x-0 md:divide-x divide-slate-100">
            <div className="pb-4 md:pb-0 border-b md:border-b-0 border-slate-50">
                <p className="text-2xl md:text-4xl font-bold text-indigo-600">500+</p>
                <p className="text-[10px] md:text-sm text-slate-500 font-medium uppercase tracking-wide mt-1">Past Questions</p>
            </div>
            <div className="pb-4 md:pb-0 border-b md:border-b-0 border-slate-50">
                <p className="text-2xl md:text-4xl font-bold text-purple-600">4</p>
                <p className="text-[10px] md:text-sm text-slate-500 font-medium uppercase tracking-wide mt-1">Academic Levels</p>
            </div>
            <div>
                <p className="text-2xl md:text-4xl font-bold text-rose-600">20+</p>
                <p className="text-[10px] md:text-sm text-slate-500 font-medium uppercase tracking-wide mt-1">Lecturers</p>
            </div>
            <div className="border-none">
                <p className="text-2xl md:text-4xl font-bold text-emerald-600">24/7</p>
                <p className="text-[10px] md:text-sm text-slate-500 font-medium uppercase tracking-wide mt-1">Access</p>
            </div>
        </div>
      </div>

      {/* Quick Access Section */}
      <div className="py-12 md:py-20 container mx-auto px-4">
        <div className="text-center mb-10 md:mb-16">
            <h2 className="text-2xl md:text-4xl font-bold text-slate-900 mb-3">Quick Access by Level</h2>
            <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto px-4">Select your level to instantly filter course materials, past questions, and resources tailored for you.</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[100, 200, 300, 400].map((level) => (
                <div key={level} onClick={() => onNavigate('questions')} className="group cursor-pointer">
                    <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden shadow-md transition-all duration-300 group-hover:shadow-2xl group-hover:-translate-y-2">
                        {/* Background Image */}
                        <div className="absolute inset-0">
                            <img 
                                src={LEVEL_IMAGES[level]} 
                                alt={`${level} Level`} 
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className={`absolute inset-0 bg-gradient-to-t opacity-90 transition-opacity ${
                                level === 100 ? 'from-blue-900/95 to-blue-600/40' : 
                                level === 200 ? 'from-indigo-900/95 to-indigo-600/40' :
                                level === 300 ? 'from-purple-900/95 to-purple-600/40' :
                                'from-rose-900/95 to-rose-600/40'
                            }`}></div>
                        </div>

                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 z-10">
                            <span className="text-5xl md:text-6xl font-black opacity-20 group-hover:opacity-40 transition-opacity duration-300 transform translate-y-4">{level}</span>
                            <h3 className="text-2xl md:text-3xl font-bold mt-2 shadow-sm">{level} Level</h3>
                            <p className="text-white/90 mt-2 text-xs md:text-sm text-center font-medium">
                                {level === 100 ? 'Foundational Courses' : 
                                 level === 200 ? 'Core Finance Principles' : 
                                 level === 300 ? 'Advanced Analysis' : 'Professional Application'}
                            </p>
                            <span className="mt-6 md:mt-8 px-5 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-xs md:text-sm font-bold group-hover:bg-white group-hover:text-slate-900 transition-colors flex items-center gap-2">
                                View Materials 
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </div>

       {/* Feature Section: Why Choose FINQUEST */}
       <div className="py-12 md:py-20 bg-white">
        <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row items-center gap-10 md:gap-16">
                <div className="lg:w-1/2 relative order-2 lg:order-1">
                    <div className="absolute -top-4 -left-4 w-full h-full bg-indigo-100 rounded-2xl"></div>
                    <img 
                        src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
                        alt="Financial Planning" 
                        className="relative rounded-2xl shadow-xl w-full h-auto object-cover"
                    />
                </div>
                <div className="lg:w-1/2 order-1 lg:order-2">
                    <span className="text-indigo-600 font-bold uppercase tracking-wider text-xs md:text-sm">Why Use This Portal?</span>
                    <h2 className="text-2xl md:text-4xl font-bold text-slate-900 mt-2 mb-4">Built for the Modern Finance Student</h2>
                    <p className="text-slate-600 text-base md:text-lg leading-relaxed mb-6">
                        We understand the rigors of the department. This platform bridges the gap between students and resources, ensuring you have the tools to excel in every semester.
                    </p>
                    
                    <ul className="space-y-4">
                        <li className="flex items-start gap-3">
                            <div className="mt-1 w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm md:text-base">Organized Archives</h4>
                                <p className="text-xs md:text-sm text-slate-500">No more asking seniors for PDFs. Everything is categorized by level and course code.</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm md:text-base">Community Driven</h4>
                                <p className="text-xs md:text-sm text-slate-500">Upload your own resources to help juniors and peers. It's a collective effort.</p>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
       </div>

      {/* Latest Announcements */}
      <div className="bg-slate-50 py-12 md:py-20">
        <div className="container mx-auto px-4">
            <div className="flex justify-between items-end mb-8 md:mb-12">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Latest Updates</h2>
                    <p className="text-sm md:text-base text-slate-600 mt-2">What's happening in the Finance Department.</p>
                </div>
                <button onClick={() => onNavigate('announcements')} className="text-indigo-600 font-semibold hover:text-indigo-800 text-sm hidden md:block">View All News &rarr;</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {MOCK_ANNOUNCEMENTS.slice(0, 3).map((news) => (
                    <div key={news.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-lg transition-shadow">
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{news.date}</span>
                        <h3 className="text-lg font-bold text-slate-800 mt-3 mb-2 line-clamp-2">{news.title}</h3>
                        <p className="text-slate-500 text-sm line-clamp-3 mb-4">{news.content}</p>
                        <button onClick={() => onNavigate('announcements')} className="text-sm font-medium text-slate-900 hover:text-indigo-600 underline decoration-slate-300 underline-offset-4">Read more</button>
                    </div>
                ))}
            </div>
             <div className="mt-8 text-center md:hidden">
                <button onClick={() => onNavigate('announcements')} className="text-indigo-600 font-bold text-sm">View All News &rarr;</button>
             </div>
        </div>
      </div>

      {/* Mission Section */}
      <div className="py-16 md:py-20 bg-indigo-900 text-white relative overflow-hidden">
        <div className="container mx-auto px-4 text-center relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">Our Mission</h2>
            <p className="text-lg md:text-3xl font-serif italic text-indigo-200 max-w-4xl mx-auto leading-relaxed">
                "To breed financial experts equipped with the knowledge, integrity, and skills to dominate the global financial landscape."
            </p>
        </div>
      </div>
    </div>
  );
};
