
import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase';
import { collection, getDocs, updateDoc, doc, deleteDoc, addDoc } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';
import { AuthContext } from '../contexts/AuthContext';

const ALLOWED_ROLES = ['student', 'executive', 'lecturer', 'admin', 'librarian', 'vice_president'];

export const AdminUsersPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const isSuperAdmin = auth?.user?.role === 'admin';

  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { showNotification } = useNotification();
  
  // Promotion Modal
  const [promoUser, setPromoUser] = useState<any>(null);
  const [promoRole, setPromoRole] = useState('');
  const [promoDetails, setPromoDetails] = useState({ title: '', level: '100' });

  // Notification Modal
  const [notifyUser, setNotifyUser] = useState<any>(null);
  const [notificationMsg, setNotificationMsg] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
      if (!searchTerm) {
          setFilteredUsers(users);
      } else {
          const lower = searchTerm.toLowerCase();
          setFilteredUsers(users.filter(u => 
              (u.name && u.name.toLowerCase().includes(lower)) ||
              (u.email && u.email.toLowerCase().includes(lower)) ||
              (u.username && u.username.toLowerCase().includes(lower)) ||
              (u.matricNumber && u.matricNumber.includes(lower))
          ));
      }
  }, [searchTerm, users]);

  const fetchUsers = async () => {
      setLoading(true);
      try {
          const snap = await getDocs(collection(db, 'users'));
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setUsers(data);
          setFilteredUsers(data);
      } finally { setLoading(false); }
  };

  const handleRoleChange = (user: any, newRole: string) => {
      if (!isSuperAdmin) return;
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
      if (!isSuperAdmin) return;
      if (!window.confirm("Suspend this user account?")) return;
      showNotification("User suspension requires backend function (not implemented)", "info");
  };

  const handleDelete = async (uid: string) => {
      if (!isSuperAdmin) return;
      if (!window.confirm("Permanently delete this user database record?")) return;
      try {
          await deleteDoc(doc(db, 'users', uid));
          setUsers(prev => prev.filter(u => u.id !== uid));
          showNotification("User record deleted", "success");
      } catch (e) { showNotification("Delete failed", "error"); }
  };

  const handleSendNotification = async () => {
      if (!notifyUser || !notificationMsg.trim()) return;
      try {
          await addDoc(collection(db, 'notifications'), {
              userId: notifyUser.id,
              message: notificationMsg,
              type: 'info',
              read: false,
              createdAt: new Date().toISOString()
          });
          showNotification("Notification sent successfully!", "success");
          setNotifyUser(null);
          setNotificationMsg('');
      } catch (e: any) {
          console.error(e);
          const msg = e.message || "Unknown error";
          showNotification(`Failed: ${msg}`, "error");
      }
  };

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h1 className="text-2xl font-bold text-slate-900">User Management {isSuperAdmin ? '' : '(Read Only)'}</h1>
            <div className="relative w-full md:w-64">
                <input 
                    type="text" 
                    placeholder="Search users..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <svg className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
        </div>
        
        {loading ? <div className="text-center py-20">Loading...</div> : (
            <div className="grid gap-4">
                {filteredUsers.length === 0 ? <div className="text-center py-10 text-slate-500">No users found matching "{searchTerm}"</div> : filteredUsers.map(u => (
                    <div key={u.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 overflow-hidden">
                                {u.avatarUrl ? <img src={u.avatarUrl} className="w-full h-full object-cover" /> : u.name?.[0]}
                            </div>
                            <div>
                                <p className="font-bold text-slate-900">{u.name} <span className="text-xs text-slate-400 font-normal">(@{u.username || '---'})</span></p>
                                <p className="text-xs text-slate-500">{u.email} • <span className="font-mono bg-slate-100 px-1 rounded">{u.matricNumber || 'No Matric'}</span></p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                            {isSuperAdmin ? (
                                <>
                                    <select 
                                        value={u.role} 
                                        onChange={(e) => handleRoleChange(u, e.target.value)} 
                                        className="p-2 text-sm border rounded-lg bg-slate-50 font-medium"
                                    >
                                        {ALLOWED_ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                                    </select>
                                    
                                    <button onClick={() => setNotifyUser(u)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded" title="Send Notification">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                    </button>

                                    <button onClick={() => handleBan(u.id)} className="p-2 text-amber-500 hover:bg-amber-50 rounded" title="Suspend">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    </button>
                                    <button onClick={() => handleDelete(u.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded" title="Delete">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </>
                            ) : (
                                <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold uppercase text-slate-500">{u.role}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* Promotion Modal */}
        {promoUser && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl">
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

        {/* Notification Modal */}
        {notifyUser && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl animate-fade-in-down">
                    <h3 className="font-bold text-lg mb-2">Message to {notifyUser.name}</h3>
                    <p className="text-xs text-slate-500 mb-4">This will appear in their dashboard notifications.</p>
                    <textarea 
                        className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none mb-4" 
                        rows={4} 
                        placeholder="Type your message here..."
                        value={notificationMsg}
                        onChange={(e) => setNotificationMsg(e.target.value)}
                    ></textarea>
                    <div className="flex gap-2">
                        <button onClick={() => setNotifyUser(null)} className="flex-1 py-2 border rounded-lg font-bold text-slate-600">Cancel</button>
                        <button onClick={handleSendNotification} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700">Send</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
