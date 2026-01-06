// ... imports
import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, addDoc, increment, getDoc } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';
import { deleteDocument } from '../utils/api';
import { PastQuestion, User } from '../types';
import { AuthContext } from '../contexts/AuthContext';
import { checkAndAwardBadges } from '../utils/badges';

export const AdminApprovalsPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const role = auth?.user?.role || 'student';

  const [pendingItems, setPendingItems] = useState<PastQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();
  const [previewContent, setPreviewContent] = useState<PastQuestion | null>(null);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
      setLoading(true);
      try {
          const q = query(collection(db, 'questions'), where('status', '==', 'pending'));
          const snap = await getDocs(q);
          setPendingItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as PastQuestion)));
      } finally { setLoading(false); }
  };

  const handlePreview = (item: PastQuestion) => {
      if (item.textContent) {
          setPreviewContent(item); // Open text preview modal
      } else if (item.fileUrl) {
          window.open(item.fileUrl, '_blank', 'noreferrer'); // Open link for files/images
      } else {
          showNotification("No preview available for this item.", "info");
      }
  };

  const handleMaterialApproval = async (item: PastQuestion, approve: boolean) => {
      if (!window.confirm(approve ? "Approve this upload?" : "Permanently reject and delete this file?")) return;
      
      try {
          const ref = doc(db, 'questions', item.id);
          if (approve) {
              await updateDoc(ref, { status: 'approved' });
              
              if (item.uploadedBy) {
                  const userRef = doc(db, 'users', item.uploadedBy);
                  // Award 10 points for upload approval
                  await updateDoc(userRef, { contributionPoints: increment(10) }).catch(e => console.warn("Could not award points", e));
                  
                  // Check for badges
                  const userDoc = await getDoc(userRef);
                  if (userDoc.exists()) {
                      const user = { id: userDoc.id, ...userDoc.data() } as User;
                      const newBadges = await checkAndAwardBadges(user);
                      if (newBadges.length > 0) {
                          const allBadges = [...new Set([...(user.badges || []), ...newBadges])];
                          await updateDoc(userRef, { badges: allBadges });
                          showNotification(`Awarded ${newBadges.length} new badge(s) to the user!`, "success");
                      }
                  }
              }

              showNotification("Question approved & 10 Points awarded!", "success");
          } else {
              if (item.storagePath) {
                  await deleteDocument(item.storagePath);
              }
              await deleteDoc(ref);
              showNotification("Record and file rejected.", "info");
          }
          fetchPending();
      } catch (e) { showNotification("Action failed", "error"); }
  };

  return (
    <>
    <div className="animate-fade-in max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pending Approvals</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Review user-submitted study materials.</p>
            </div>
        </div>

        {loading ? (
             <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>
        ) : pendingItems.length === 0 ? (
             <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-dashed border-slate-300 dark:border-slate-700">
                 <p className="text-slate-400 dark:text-slate-500 font-medium">No pending material approvals.</p>
             </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingItems.map(item => (
                    <div key={item.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col hover:border-indigo-300 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                            <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded uppercase tracking-wide">{item.courseCode}</span>
                            <span className="text-xs font-medium text-slate-400">{item.level} Level</span>
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-white mb-1 line-clamp-1">{item.courseTitle}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Uploaded by: {item.uploadedByEmail || 'Unknown'}</p>
                        <div className="mt-auto pt-4 border-t border-slate-50 dark:border-slate-700 flex gap-2">
                            <button onClick={() => handlePreview(item)} className="flex-1 py-2 text-center text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-600 transition">Preview</button>
                            <button onClick={() => handleMaterialApproval(item, true)} className="flex-1 py-2 text-center text-xs font-bold text-white bg-emerald-500 rounded hover:bg-emerald-600 transition">Approve (+10 Pts)</button>
                            <button onClick={() => handleMaterialApproval(item, false)} className="px-3 py-2 text-center text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/20 rounded hover:bg-rose-100 dark:hover:bg-rose-900/40 transition">Reject</button>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>

    {/* Text Content Preview Modal */}
    {previewContent && (
        <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setPreviewContent(null)}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">{previewContent.courseTitle}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{previewContent.courseCode} • {previewContent.year}</p>
                </div>
                <div className="p-6 overflow-y-auto">
                    <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans">
                        {previewContent.textContent}
                    </pre>
                </div>
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 text-right bg-slate-50 dark:bg-slate-800/50">
                    <button onClick={() => setPreviewContent(null)} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700">Close</button>
                </div>
            </div>
        </div>
    )}
    </>
  );
};