
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';

const ALLOWED_ROLES = ['student', 'executive', 'lecturer', 'admin'];

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
      setLoading(true);
      try {
          const snap = await getDocs(collection(db, 'users'));
          setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } finally { setLoading(false); }
  };

  const updateUserRole = async (uid: string, role: string) => {
      if (!ALLOWED_ROLES.includes(role)) {
          showNotification("Invalid role selected.", "error");
          return;
      }

      setUpdatingId(uid);
      try {
          await updateDoc(doc(db, 'users', uid), { role });
          setSuccessId(uid);
          // showNotification("User role updated", "success");
          
          // Clear success message after 2 seconds
          setTimeout(() => setSuccessId(null), 2000);
          
          // Update local state without full refetch for speed
          setUsers(prev => prev.map(u => u.id === uid ? { ...u, role } : u));
      } catch (e) { 
          showNotification("Failed to update role", "error"); 
      } finally {
          setUpdatingId(null);
      }
  };

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">User Database</h1>
        
        {loading ? (
            <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>
        ) : (
            <div className="grid gap-4">
                {users.map(u => (
                    <div key={u.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 uppercase">
                                {u.name ? u.name.charAt(0) : '?'}
                            </div>
                            <div>
                                <p className="font-bold text-slate-900">{u.name || 'No Name'}</p>
                                <p className="text-xs text-slate-500">{u.email}</p>
                                <div className="flex gap-2 mt-1">
                                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">{u.matricNumber || 'No Matric'}</span>
                                    <span className="text-[10px] bg-indigo-50 px-2 py-0.5 rounded text-indigo-600 border border-indigo-200">{u.level}L</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="w-full sm:w-auto flex items-center gap-2">
                            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1 sm:hidden">Role</label>
                            <div className="relative">
                                <select 
                                    value={u.role} 
                                    onChange={(e) => updateUserRole(u.id, e.target.value)} 
                                    disabled={updatingId === u.id}
                                    className={`w-full sm:w-32 p-2 text-sm border rounded-lg font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                                        successId === u.id 
                                        ? 'border-emerald-500 text-emerald-700 bg-emerald-50' 
                                        : 'border-slate-300 bg-white text-slate-700'
                                    }`}
                                >
                                    {ALLOWED_ROLES.map(role => (
                                        <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                                    ))}
                                </select>
                                {successId === u.id && (
                                    <div className="absolute top-1/2 -right-6 -translate-y-1/2 text-emerald-500 animate-bounce">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                )}
                                {updatingId === u.id && (
                                    <div className="absolute top-1/2 -right-6 -translate-y-1/2">
                                        <div className="animate-spin h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};
