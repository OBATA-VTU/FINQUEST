
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';
import { deleteFile } from '../utils/api';
import { PastQuestion } from '../types';

export const AdminApprovalsPage: React.FC = () => {
  const [pendingItems, setPendingItems] = useState<PastQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();

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

  const handleApproval = async (item: PastQuestion, approve: boolean) => {
      try {
          const ref = doc(db, 'questions', item.id);
          if (approve) {
              await updateDoc(ref, { status: 'approved' });
              showNotification("Question approved!", "success");
          } else {
              // REJECTION: DELETE FROM DROPBOX & DB
              if (item.storagePath) {
                  await deleteFile(item.storagePath);
                  showNotification("File deleted from storage.", "info");
              }
              await deleteDoc(ref);
              showNotification("Record removed.", "info");
          }
          fetchPending();
      } catch (e) { showNotification("Action failed", "error"); }
  };

  return (
    <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Pending Approvals</h1>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 border-b"><tr><th className="p-4">Material</th><th className="p-4">Uploader</th><th className="p-4 text-right">Action</th></tr></thead>
                 <tbody>
                     {loading ? (
                         <tr><td colSpan={3} className="p-8 text-center">Loading...</td></tr>
                     ) : pendingItems.length === 0 ? (
                         <tr><td colSpan={3} className="p-8 text-center text-slate-400">No pending items.</td></tr>
                     ) : (
                         pendingItems.map(item => (
                             <tr key={item.id} className="border-b last:border-0 hover:bg-slate-50">
                                 <td className="p-4">
                                     <p className="font-bold text-indigo-900">{item.courseCode}</p>
                                     <p className="text-xs text-slate-500">{item.courseTitle}</p>
                                     <a href={item.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 hover:underline">View File</a>
                                 </td>
                                 <td className="p-4 text-slate-500">{item.uploadedByEmail || 'Unknown'}</td>
                                 <td className="p-4 text-right space-x-2">
                                     <button onClick={() => handleApproval(item, true)} className="text-emerald-600 font-bold hover:bg-emerald-50 px-3 py-1 rounded border border-emerald-200">Approve</button>
                                     <button onClick={() => handleApproval(item, false)} className="text-rose-600 font-bold hover:bg-rose-50 px-3 py-1 rounded border border-rose-200">Reject & Delete</button>
                                 </td>
                             </tr>
                         ))
                     )}
                 </tbody>
             </table>
        </div>
    </div>
  );
};
