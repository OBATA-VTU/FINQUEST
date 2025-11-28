import React, { useContext, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { MOCK_QUESTIONS } from '../constants'; // Reusing for "saved" example
import { QuestionGrid } from '../components/QuestionGrid';
import { EditProfileModal } from '../components/EditProfileModal';

export const ProfilePage: React.FC = () => {
  const auth = useContext(AuthContext);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  if (!auth?.user) {
      return <div className="p-8 text-center text-red-500">Please log in to view your profile.</div>;
  }

  // Mocking saved questions
  const savedQuestions = MOCK_QUESTIONS.slice(0, 2);

  return (
    <div className="min-h-screen bg-slate-50 py-8 md:py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
            {/* Header Card */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden mb-8">
                <div className="h-24 md:h-32 bg-gradient-to-r from-indigo-500 to-purple-600 relative">
                     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                </div>
                <div className="px-4 md:px-8 pb-8">
                    <div className="relative flex flex-col md:flex-row justify-between items-center md:items-end -mt-12 mb-6">
                        <div className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6 text-center md:text-left">
                            <div className="w-28 h-28 rounded-full bg-white p-1.5 shadow-lg overflow-hidden relative">
                                {auth.user.avatarUrl ? (
                                    <img src={auth.user.avatarUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    <div className="w-full h-full rounded-full bg-indigo-100 flex items-center justify-center text-3xl font-bold text-indigo-700">
                                        {auth.user.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="mb-1">
                                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{auth.user.name}</h1>
                                <p className="text-sm md:text-base text-slate-500">{auth.user.email}</p>
                                <p className="text-sm text-indigo-600 font-bold bg-indigo-50 inline-block px-2 rounded-md mt-1">@{auth.user.username}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsEditModalOpen(true)}
                            className="mt-6 md:mt-0 px-6 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-indigo-300 transition w-full md:w-auto flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            Edit Profile
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 md:gap-6 border-t border-slate-100 pt-6 text-center md:text-left">
                        <div className="p-3 bg-slate-50 rounded-lg">
                            <span className="block text-[10px] md:text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Role</span>
                            <span className="text-sm md:text-lg font-bold capitalize text-indigo-700">{auth.user.role}</span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                             <span className="block text-[10px] md:text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Level</span>
                            <span className="text-sm md:text-lg font-bold text-slate-800">{auth.user.level} L</span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                             <span className="block text-[10px] md:text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Matric No</span>
                            <span className="text-sm md:text-lg font-bold text-slate-800 font-mono">{auth.user.matricNumber || '---'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Saved Content Section */}
            <div>
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <span className="bg-rose-100 p-1.5 rounded-lg text-rose-500">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                    </span>
                    Saved / Bookmarked
                </h2>
                {savedQuestions.length > 0 ? (
                    <QuestionGrid questions={savedQuestions} />
                ) : (
                    <div className="bg-white p-12 rounded-xl border border-slate-200 border-dashed text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                        </div>
                        <p className="text-slate-500 font-medium">You haven't saved any questions yet.</p>
                        <p className="text-sm text-slate-400 mt-1">Bookmark important papers to access them quickly here.</p>
                    </div>
                )}
            </div>
        </div>
      </div>

      <EditProfileModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} />
    </div>
  );
};