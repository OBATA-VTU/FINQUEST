
import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { QuestionGrid } from '../components/QuestionGrid';
import { EditProfileModal } from '../components/EditProfileModal';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { PastQuestion, TestResult } from '../types';
import { VerificationBadge } from '../components/VerificationBadge';
import { getBadge } from '../utils/badges';
import { AddPasswordModal } from '../components/AddPasswordModal'; // Import AddPasswordModal

export const ProfilePage: React.FC = () => {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const [savedQuestions, setSavedQuestions] = useState<PastQuestion[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddPasswordModalOpen, setIsAddPasswordModalOpen] = useState(false); // State for AddPasswordModal

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Fetch saved questions
        if (user.savedQuestions && user.savedQuestions.length > 0) {
          const q = query(collection(db, 'questions'), where('id', 'in', user.savedQuestions));
          const querySnapshot = await getDocs(q);
          setSavedQuestions(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PastQuestion)));
        } else {
          setSavedQuestions([]);
        }

        // Fetch test results
        const testQuery = query(collection(db, 'test_results'), where('userId', '==', user.id));
        const testSnapshot = await getDocs(testQuery);
        setTestResults(testSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TestResult)));

      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center dark:bg-slate-950">Loading profile...</div>;
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center dark:bg-slate-950">Please log in to view your profile.</div>;
  }
  
  const sortedTestResults = [...testResults].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latestTest = sortedTestResults[0];

  const topBadge = (user.badges || [])
      .map(getBadge)
      .filter(b => b)
      .sort((a, b) => b!.rank - a!.rank)[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 font-sans transition-colors p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Profile Header */}
        <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 md:p-10 text-center animate-fade-in-down">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 dark:from-indigo-950/20 to-transparent rounded-3xl opacity-50"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="relative w-32 h-32 rounded-full border-4 border-indigo-200 dark:border-indigo-700 bg-slate-100 dark:bg-slate-700 overflow-hidden shadow-lg mb-4">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-indigo-700 dark:text-indigo-300">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              {user.isVerified && <VerificationBadge role={user.role} isVerified={true} className="w-8 h-8 absolute bottom-0 right-0 transform translate-x-2 translate-y-2" />}
            </div>
            <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">{user.name}</h1>
                {topBadge && <span className="text-3xl" title={topBadge.name}>{topBadge.icon}</span>}
            </div>
            <p className="text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest text-sm mb-2">{user.level} Level Student</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm">@{user.username || 'N/A'} • {user.matricNumber?.toUpperCase() || 'NO ID'}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{user.email}</p>

            <div className="flex gap-4 mt-6">
                <button 
                    onClick={() => setIsEditModalOpen(true)}
                    className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 transition-transform hover:-translate-y-1 shadow-md flex items-center gap-2 text-sm"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    Edit Profile
                </button>
                {!auth?.isPasswordAccount && (
                    <button 
                        onClick={() => setIsAddPasswordModalOpen(true)} 
                        className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-full hover:bg-emerald-700 transition-transform hover:-translate-y-1 shadow-md flex items-center gap-2 text-sm"
                    >
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2v5a2 2 0 01-2 2H9a2 2 0 01-2-2V9a2 2 0 012-2h6zM21 11a1 1 0 01-1 1h-3a1 1 0 01-1-1V9a1 1 0 011-1h3a1 1 0 011 1v2zm-2 5a2 2 0 012 2v1a2 2 0 01-2 2H7a2 2 0 01-2-2v-1a2 2 0 012-2h10z" /></svg>
                        Add Password
                    </button>
                )}
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-in-up">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
                <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Contribution Points</p>
                <p className="text-4xl font-black text-indigo-600 dark:text-indigo-400">{user.contributionPoints || 0}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
                <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Tests Completed</p>
                <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{testResults.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
                <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Latest Test Score</p>
                <p className={`text-4xl font-black ${latestTest?.score >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{latestTest ? `${latestTest.score}%` : 'N/A'}</p>
            </div>
        </div>

        {/* Badges Section */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm animate-slide-in-up" style={{ animationDelay: '150ms' }}>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">My Badges</h2>
            <div className="flex flex-wrap gap-4 justify-center">
                {(user.badges && user.badges.length > 0) ? (
                    user.badges.map(badgeId => {
                        const badge = getBadge(badgeId);
                        if (!badge) return null;
                        return (
                            <div key={badge.id} className="relative group flex flex-col items-center text-center p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 transition-all hover:scale-105">
                                <span className="text-3xl mb-1">{badge.icon}</span>
                                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">{badge.name}</span>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                    {badge.description}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <p className="text-slate-500 dark:text-slate-400 italic py-6">No badges earned yet. Start exploring and contributing!</p>
                )}
            </div>
        </div>

        {/* Saved Questions Section */}
        <div className="animate-slide-in-up" style={{ animationDelay: '300ms' }}>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">My Bookmarks</h2>
          {savedQuestions.length > 0 ? (
            <QuestionGrid questions={savedQuestions} />
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center border border-dashed border-slate-300 dark:border-slate-700">
              <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
              <h3 className="mt-2 text-lg font-medium text-slate-900 dark:text-white">No bookmarks yet</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Save past questions to easily access them here.</p>
            </div>
          )}
        </div>
      </div>
      
      <EditProfileModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
      />
      {/* Add Password Modal */}
      {isAddPasswordModalOpen && (
          <AddPasswordModal
              isOpen={isAddPasswordModalOpen}
              onClose={() => setIsAddPasswordModalOpen(false)}
          />
      )}
    </div>
  );
};
