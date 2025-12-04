
// ... imports
import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, addDoc, increment } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';
import { deleteFile } from '../utils/api';
import { PastQuestion } from '../types';
import { AuthContext } from '../contexts/AuthContext';

export const AdminApprovalsPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const role = auth?.user?.role || 'student';
  const isLibrarian = role === 'librarian';
  const isVP = role === 'vice_president';
  const isSuperAdmin = role === 'admin';

  // Determine initial tab based on role priority
  const getInitialTab = () => {
      if (isLibrarian) return 'materials';
      if (isVP) return 'lostfound';
      return 'materials'; // Default for Admin
  };

  const [activeTab, setActiveTab] = useState<'materials' | 'lostfound'>(getInitialTab());
  const [pendingItems, setPendingItems] = useState<PastQuestion[]>([]);
  const [pendingLostItems, setPendingLostItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchPending();
  }, [activeTab]);

  const fetchPending = async () => {
      setLoading(true);
      try {
          if (activeTab === 'materials') {
              const q = query(collection(db, 'questions'), where('status', '==', 'pending'));
              const snap = await getDocs(q);
              setPendingItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as PastQuestion)));
          } else {
              const q = query(collection(db, 'lost_items'), where('status', '==', 'pending'));
              const snap = await getDocs(q);
              setPendingLostItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          }
      } finally { setLoading(false); }
  };

  const handleMaterialApproval = async (item: PastQuestion, approve: boolean) => {
      if (!window.confirm(approve ? "Approve this upload?" : "Permanently reject and delete this file?")) return;
      
      try {
          const ref = doc(db, 'questions', item.id);
          if (approve) {
              await updateDoc(ref, { status: 'approved' });
              
              // Award Contributor Points
              if (item.uploadedBy) {
                  const userRef = doc(db, 'users', item.uploadedBy);
                  // Award 10 points for upload approval
                  await updateDoc(userRef, { contributionPoints: increment(10) }).catch(e => console.warn("Could not award points", e));
              }

              showNotification("Question approved & 10 Points awarded!", "success");
          } else {
              if (item.storagePath) {
                  await deleteFile(item.storagePath);
              }
              await deleteDoc(ref);
              showNotification("Record and file rejected.", "info");
          }
          fetchPending();
      } catch (e) { showNotification("Action failed", "error"); }
  };

  const handleLostItemApproval = async (item: any, approve: boolean) => {
      if (!window.confirm(approve ? "Approve this lost item and notify everyone?" : "Reject this post?")) return;

      try {
          const ref = doc(db, 'lost_items', item.id);
          if (approve) {
              // 1. Approve Item
              await updateDoc(ref, { status: 'approved' });
              
              // 2. Send Global Notification
              await addDoc(collection(db, 'notifications'), {
                  userId: 'all',
                  message: `Lost & Found Alert: ${item.itemName} found at ${item.locationFound}.`,
                  type: 'info',
                  read: false,
                  createdAt: new Date().toISOString()
              });

              showNotification("Item approved & notification sent!", "success");
          } else {
              await deleteDoc(ref);
              showNotification("Item rejected and deleted.", "info");
          }
          fetchPending();
      } catch (e) { showNotification("Action failed", "error"); }
  };

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pending Approvals</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Review user submissions.</p>
            </div>
        </div>

        {/* Tab Switcher - Only show if Super Admin (who has access to both) */}
        {isSuperAdmin && (
            <div className="flex gap-4 mb-6 border-b border-slate-200 dark:border-slate-700">
                <button 
                    onClick={() => setActiveTab('materials')}
                    className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'materials' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                    Materials ({pendingItems.length})
                </button>
                <button 
                    onClick={() => setActiveTab('lostfound')}
                    className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'lostfound' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                    Lost & Found ({pendingLostItems.length})
                </button>
            </div>
        )}

        {loading ? (
             <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>
        ) : (activeTab === 'materials' ? pendingItems.length : pendingLostItems.length) === 0 ? (
             <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-dashed border-slate-300 dark:border-slate-700">
                 <p className="text-slate-400 dark:text-slate-500 font-medium">No pending approvals in this category.</p>
             </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeTab === 'materials' ? pendingItems.map(item => (
                    <div key={item.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col hover:border-indigo-300 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                            <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded uppercase tracking-wide">{item.courseCode}</span>
                            <span className="text-xs font-medium text-slate-400">{item.level} Level</span>
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-white mb-1 line-clamp-1">{item.courseTitle}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Uploaded by: {item.uploadedByEmail || 'Unknown'}</p>
                        <div className="mt-auto pt-4 border-t border-slate-50 dark:border-slate-700 flex gap-2">
                            <a href={item.fileUrl} target="_blank" rel="noreferrer" className="flex-1 py-2 text-center text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-600 transition">Preview</a>
                            <button onClick={() => handleMaterialApproval(item, true)} className="flex-1 py-2 text-center text-xs font-bold text-white bg-emerald-500 rounded hover:bg-emerald-600 transition">Approve (+10 Pts)</button>
                            <button onClick={() => handleMaterialApproval(item, false)} className="px-3 py-2 text-center text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/20 rounded hover:bg-rose-100 dark:hover:bg-rose-900/40 transition">Reject</button>
                        </div>
                    </div>
                )) : pendingLostItems.map(item => (
                    <div key={item.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col hover:border-indigo-300 transition-colors">
                        <div className="flex gap-4 mb-4">
                            <img src={item.imageUrl} className="w-20 h-20 rounded-lg object-cover bg-slate-100 dark:bg-slate-700" />
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white mb-1">{item.itemName}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Found at: {item.locationFound}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Finder: {item.finderName}</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 bg-slate-50 dark:bg-slate-700/50 p-2 rounded italic">"{item.description}"</p>
                        <div className="mt-auto pt-4 border-t border-slate-50 dark:border-slate-700 flex gap-2">
                            <button onClick={() => handleLostItemApproval(item, true)} className="flex-1 py-2 text-center text-xs font-bold text-white bg-emerald-500 rounded hover:bg-emerald-600 transition">Approve & Notify</button>
                            <button onClick={() => handleLostItemApproval(item, false)} className="px-3 py-2 text-center text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/20 rounded hover:bg-rose-100 dark:hover:bg-rose-900/40 transition">Reject</button>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};
