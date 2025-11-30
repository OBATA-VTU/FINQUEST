
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, updateDoc, doc, deleteDoc, addDoc } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';

const ALLOWED_ROLES = ['student', 'executive', 'lecturer', 'admin'];

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();
  
  // Promotion Modal
  const [promoUser, setPromoUser] = useState<any>(null);
  const [promoRole, setPromoRole] = useState('');
  const [promoDetails, setPromoDetails] = useState({ title: '', level: '100' });

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
      setLoading(true);
      try {
          const snap = await getDocs(collection(db, 'users'));
          setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } finally { setLoading(false); }
  };

  const handleRoleChange = (user: any, newRole: string) => {
      if (newRole === 'executive' || newRole === 'lecturer') {
          setPromoUser(user);
          setPromoRole(newRole);
      } else {
          updateUserRole(user.id, newRole);
      }
  };

  const confirmPromotion = async () => {
      if (!promoDetails.title) return;
      try {
          // 1. Update User Role
          await updateUserRole(promoUser.id, promoRole);
          
          // 2. Create Public Profile
          const col = promoRole === 'executive' ? 'executives' : 'lecturers';
          const payload: any = {
              name: promoUser.name,
              imageUrl: promoUser.avatarUrl || '',
          };
          
          if (promoRole === 'executive') {
              payload.position = promoDetails.title;
              payload.level = Number(promoDetails.level);
          } else {
              payload.title = promoDetails.title;
              payload.specialization = 'General';
          }

          await addDoc(collection(db, col), payload);
          showNotification(`User promoted to ${promoRole} and profile created.`, "success");
          setPromoUser(null);
      } catch (e) { showNotification("Promotion failed", "error"); }
  };

  const updateUserRole = async (uid: string, role: string) => {
      try {
          await updateDoc(doc(db, 'users', uid), { role });
          setUsers(prev => prev.map(u => u.id === uid ? { ...u, role } : u));
          showNotification("Role updated", "success");
      } catch (e) { showNotification("Update failed", "error"); }
  };

  const handleBan = async (uid: string) => {
      if (!window.confirm("Suspend this user account?")) return;
      // In a real app, you'd disable the auth account via Admin SDK function
      // For now, we can set a flag
      showNotification("User suspension requires backend function (not implemented)", "info");
  };

  const handleDelete = async (uid: string) => {
      if (!window.confirm("Permanently delete this user database record?")) return;
      try {
          await deleteDoc(doc(db, 'users', uid));
          setUsers(prev => prev.filter(u => u.id !== uid));
          showNotification("User record deleted", "success");
      } catch (e) { showNotification("Delete failed", "error"); }
  };

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">User Management</h1>
        
        {loading ? <div className="text-center py-20">Loading...</div> : (
            <div className="grid gap-4">
                {users.map(u => (
                    <div key={u.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">{u.name?.[0]}</div>
                            <div>
                                <p className="font-bold text-slate-900">{u.name}</p>
                                <p className="text-xs text-slate-500">{u.email}</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                            <select 
                                value={u.role} 
                                onChange={(e) => handleRoleChange(u, e.target.value)} 
                                className="p-2 text-sm border rounded-lg bg-slate-50 font-medium"
                            >
                                {ALLOWED_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <button onClick={() => handleBan(u.id)} className="p-2 text-amber-500 hover:bg-amber-50 rounded" title="Suspend"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></button>
                            <button onClick={() => handleDelete(u.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded" title="Delete"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* Promotion Modal */}
        {promoUser && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-white p-6 rounded-xl w-full max-w-sm">
                    <h3 className="font-bold text-lg mb-4">Promote to {promoRole}</h3>
                    <div className="space-y-3">
                        <input className="w-full border p-2 rounded" placeholder="Position / Title (e.g. President)" value={promoDetails.title} onChange={e => setPromoDetails({...promoDetails, title: e.target.value})} />
                        {promoRole === 'executive' && (
                            <select className="w-full border p-2 rounded" value={promoDetails.level} onChange={e => setPromoDetails({...promoDetails, level: e.target.value})}>
                                <option value="100">100 Level</option>
                                <option value="200">200 Level</option>
                                <option value="300">300 Level</option>
                                <option value="400">400 Level</option>
                            </select>
                        )}
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button onClick={() => setPromoUser(null)} className="flex-1 py-2 border rounded">Cancel</button>
                        <button onClick={confirmPromotion} className="flex-1 py-2 bg-indigo-600 text-white rounded font-bold">Confirm</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
