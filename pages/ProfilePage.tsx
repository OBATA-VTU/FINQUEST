
import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { MOCK_QUESTIONS } from '../constants'; // Reusing for "saved" example
import { QuestionGrid } from '../components/QuestionGrid';

export const ProfilePage: React.FC = () => {
  const auth = useContext(AuthContext);

  if (!auth?.user) {
      return <div className="p-8 text-center text-red-500">Please log in to view your profile.</div>;
  }

  // Mocking saved questions by taking the first 2 from the mock list
  const savedQuestions = MOCK_QUESTIONS.slice(0, 2);

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
            {/* Header Card */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden mb-8">
                <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
                <div className="px-8 pb-8">
                    <div className="relative flex justify-between items-end -mt-12 mb-6">
                        <div className="flex items-end gap-6">
                            <div className="w-24 h-24 rounded-full bg-white p-1 shadow-lg">
                                <div className="w-full h-full rounded-full bg-indigo-100 flex items-center justify-center text-3xl font-bold text-indigo-700">
                                    {auth.user.name.charAt(0).toUpperCase()}
                                </div>
                            </div>
                            <div className="mb-1">
                                <h1 className="text-2xl font-bold text-slate-900">{auth.user.name}</h1>
                                <p className="text-slate-500">{auth.user.email}</p>
                            </div>
                        </div>
                        <button className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
                            Edit Profile
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-100 pt-6">
                        <div>
                            <span className="block text-xs text-slate-500 uppercase font-semibold">Role</span>
                            <span className="text-lg font-medium capitalize text-slate-800">{auth.user.role}</span>
                        </div>
                        <div>
                             <span className="block text-xs text-slate-500 uppercase font-semibold">Level</span>
                            <span className="text-lg font-medium text-slate-800">300 Level</span>
                        </div>
                        <div>
                             <span className="block text-xs text-slate-500 uppercase font-semibold">Member Since</span>
                            <span className="text-lg font-medium text-slate-800">Sept 2023</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Saved Content Section */}
            <div>
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                    Saved Past Questions
                </h2>
                {savedQuestions.length > 0 ? (
                    <QuestionGrid questions={savedQuestions} />
                ) : (
                    <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
                        You haven't saved any questions yet.
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
