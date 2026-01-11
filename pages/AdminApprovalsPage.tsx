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
  
  // Modal states
  const [previewContent, setPreviewContent] = useState<PastQuestion | null>(null);
  const [rejectingItem, setRejectingItem] = useState<PastQuestion | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

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

  const handleApprove = async (item: PastQuestion) => {
    if (!window.confirm("Approve this upload?")) return;
    try {
        const ref = doc(db, 'questions', item.id);
        await updateDoc(ref, { status: 'approved' });
        
        if (item.uploadedBy) {
            const userRef = doc(db, 'users', item.uploadedBy);
            await updateDoc(userRef, { contributionPoints: increment(10) }).catch(e => console.warn("Could not award points", e));
            
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

            // Send success notification
            await addDoc(collection(db, 'notifications'), {
                userId: item.uploadedBy,
                title: "Contribution Approved!",
                message: `Your submission for ${item.courseCode} - ${item.courseTitle} has been approved. You've earned 10 contribution points!`,
                type: 'success',
                read: false,
                createdAt: new Date().toISOString()
            });
        }
        showNotification("Question approved & 10 Points awarded!", "success");
        fetchPending();
    } catch (e) { showNotification("Approval failed", "error"); }
  };

  const handleReject = async () => {
      if (!rejectingItem) return;
      
      try {
          if (rejectingItem.storagePath) {
              await deleteDocument(rejectingItem.storagePath);
          }
          await deleteDoc(doc(db, 'questions', rejectingItem.id));

          // Send notification if reason is provided
          if (rejectionReason.trim() && rejectingItem.uploadedBy) {
              await addDoc(collection(db, 'notifications'), {
                  userId: rejectingItem.uploadedBy,
                  title: "Contribution Rejected",
                  message: `Your submission for ${rejectingItem.courseCode} was rejected. Reason: ${rejectionReason}`,
                  type: 'warning',
                  read: false,
                  createdAt: new Date().toISOString()
              });
          }

          showNotification("Record and file rejected.", "info");
          fetchPending();
      } catch (e) { showNotification("Rejection failed", "error"); }
      finally {
          setRejectingItem(null);
          setRejectionReason('');
      }
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
                            <button onClick={() => handleApprove(item)} className="flex-1 py-2 text-center text-xs font-bold text-white bg-emerald-500 rounded hover:bg-emerald-600 transition">Approve</button>
                            <button onClick={() => setRejectingItem(item)} className="px-3 py-2 text-center text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/20 rounded hover:bg-rose-100 dark:hover:bg-rose-900/40 transition">Reject</button>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>

    {/* Rejection Modal */}
    {rejectingItem && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setRejectingItem(null)}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Reject Submission?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">Optionally provide a reason for the user.</p>
                <textarea 
                    value={rejectionReason} 
                    onChange={e => setRejectionReason(e.target.value)}
                    className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none mb-4 dark:bg-slate-700 dark:border-slate-600" 
                    rows={3} 
                    placeholder="e.g., Low image quality, duplicate file..."
                />
                <div className="flex gap-3">
                    <button onClick={() => setRejectingItem(null)} className="flex-1 py-2 rounded-lg border border-slate-300 dark:border-slate-600 font-bold text-slate-600 dark:text-slate-300">Cancel</button>
                    <button onClick={handleReject} className="flex-1 py-2 rounded-lg bg-rose-600 text-white font-bold">Confirm Reject</button>
                </div>
            </div>
        </div>
    )}

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