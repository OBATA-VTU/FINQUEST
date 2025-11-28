
import React from 'react';
import { MOCK_GROUPS } from '../constants';

export const CommunityPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
            <h1 className="text-4xl font-extrabold text-indigo-900 mb-4">Student Community Hub</h1>
            <p className="text-lg text-slate-600">Connect, study, and grow with your peers. Join official departmental groups and specialized study circles.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {MOCK_GROUPS.map((group) => (
                <div key={group.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden border border-slate-100 flex flex-col">
                    <div className={`h-24 ${
                        group.platform === 'WhatsApp' ? 'bg-green-500' : 
                        group.platform === 'Telegram' ? 'bg-blue-400' : 'bg-indigo-500'
                    } flex items-center justify-center`}>
                        {/* Icons based on platform */}
                        <span className="text-white text-4xl font-bold opacity-50">{group.platform}</span>
                    </div>
                    <div className="p-6 flex-grow flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-bold text-slate-800">{group.name}</h3>
                            <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2 py-1 rounded-full">{group.members} Members</span>
                        </div>
                        <p className="text-slate-600 mb-6 flex-grow">{group.description}</p>
                        <a 
                            href={group.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`w-full py-3 rounded-lg text-center font-bold text-white transition-transform transform hover:scale-105 ${
                                group.platform === 'WhatsApp' ? 'bg-green-500 hover:bg-green-600' : 
                                group.platform === 'Telegram' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                        >
                            Join Group
                        </a>
                    </div>
                </div>
            ))}

            {/* Discussion Forum Teaser */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-lg p-8 text-white flex flex-col justify-center text-center">
                <div className="mb-4 text-4xl">💬</div>
                <h3 className="text-xl font-bold mb-2">Discussion Forum</h3>
                <p className="text-slate-300 mb-6">Have a specific question about a course? Post it on our student forum.</p>
                <button disabled className="w-full py-3 bg-white/10 rounded-lg text-slate-400 font-semibold border border-white/10 cursor-not-allowed">
                    Coming Soon
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
