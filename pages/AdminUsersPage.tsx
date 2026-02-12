
import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase';
import { collection, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';
import { AuthContext } from '../contexts/AuthContext';
import { VerificationBadge } from '../components/VerificationBadge';

const ALLOWED_ROLES = ['student', 'executive', 'lecturer', 'admin', 'librarian', 'vice_president', 'supplement'];

export const AdminUsersPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const role = auth?.user?.role || 'student';
  const isSuperAdmin = role === 'admin';
  const isSupplement = role === 'supplement';
  const hasWriteAccess = isSuperAdmin || isSupplement;

  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { showNotification } = useNotification();
  
  const [promoUser, setPromoUser] = useState<any>(null);
  const [promoRole, setPromoRole] = useState('');
  const [promoDetails, setPromoDetails] = useState({ title: '', level: '100' });

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
      const lower = searchTerm.toLowerCase();
      setFilteredUsers(users.filter(u => 
          (u.name?.toLowerCase().includes(lower)) ||
          (u.email?.toLowerCase().includes(lower)) ||
          (u.username?.toLowerCase().includes(lower)) ||
          (u.matricNumber?.includes(lower))
      ));
  }, [searchTerm, users]);

  const fetchUsers = async () => {
      setLoading(true);
      try {
          const snap = await getDocs(collection(db, 'users'));
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          data.sort((a, b) => b.contributionPoints - a.contributionPoints);
          setUsers(data);
          setFilteredUsers(data);
      } finally { setLoading(false); }
  };

  const handleRoleChange = (user: any, newRole: string) => {
      if (!isSuperAdmin) { showNotification("Unauthorized", "error"); return; }
      if (newRole === 'executive' || newRole === 'lecturer') {
          setPromoUser(user);
          setPromoRole(newRole);
      } else updateUserRole(user.id, newRole);
  };

  const confirmPromotion = async () => {
      if (!promoDetails.title) return;
      try {
          await updateUserRole(promoUser.id, promoRole);
          const col = promoRole === 'executive' ? 'executives' : 'lecturers';
          const payload: any = { name: promoUser.name, imageUrl: promoUser.avatarUrl || '' };
          if (promoRole === 'executive') { payload.position = promoDetails.title; payload.level = Number(promoDetails.level); }
          else { payload.title = promoDetails.title; payload.specialization = 'Finance Scholar'; }
          await addDoc(collection(db, col), payload);
          showNotification(`${promoUser.name} Promoted to ${promoRole}.`, "success");
          setPromoUser(null);
      } catch (e) { showNotification("Promotion failed", "error"); }
  };

  const updateUserRole = async (uid: string, newRole: string) => {
      try {
          await updateDoc(doc(db, 'users', uid), { role: newRole });
          setUsers(prev => prev.map(u => u.id === uid ? { ...u, role: newRole } : u));
          showNotification("Permissions updated.", "success");
      } catch (e) { showNotification("Action failed", "error"); }
  };

  const handleVerifyToggle = async (user: any) => {
      if (!hasWriteAccess) return;
      const newValue = !user.isVerified;
      try {
          await updateDoc(doc(db, 'users', user.id), { isVerified: newValue });
          setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isVerified: newValue } : u));
          showNotification(newValue ? "Verified" : "Unverified", "success");
      } catch (e) { showNotification("Failed", "error"); }
  };

  return (
    <div className="animate-fade-in space-y-10 pb-20">
        <header className="bg-slate-900 rounded-[3rem] p-10 md:p-14 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-10 opacity-5 group"><svg className="w-64 h-64 group-hover:rotate-12 transition-transform duration-1000" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg></div>
            <div className="relative z-10">
                <h1 className="text-4xl md:text-5xl font-black font-serif tracking-tighter mb-4">Student Directory</h1>
                <p className="text-slate-400 max-w-xl font-medium">Manage permissions, verify identities, and monitor the departmental ecosystem.</p>
            </div>
        </header>

        <div className="relative max-w-2xl mx-auto">
            <input 
                type="text" 
                placeholder="Search by name, username or ID..." 
                className="w-full pl-14 pr-6 py-6 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white font-bold"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
            <svg className="w-6 h-6 text-slate-300 absolute left-5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>

        {loading ? <div className="text-center py-20 font-black uppercase text-slate-400 tracking-widest">Loading Intel...</div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredUsers.map(u => (
                    <div key={u.id} className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all duration-500 group relative">
                        <div className="flex items-center gap-6 mb-6">
                            <div className="relative shrink-0">
                                <div className="w-20 h-20 rounded-[1.5rem] overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-indigo-50 dark:border-indigo-900 shadow-inner">
                                    {u.avatarUrl ? <img src={u.avatarUrl} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full font-black text-2xl text-slate-400">{u.name?.charAt(0)}</div>}
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-900 rounded-full p-1 shadow-lg">
                                    <VerificationBadge role={u.role} isVerified={u.isVerified} className="w-6 h-6" />
                                </div>
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4 className="font-black text-lg text-slate-900 dark:text-white truncate leading-tight mb-1">{u.name}</h4>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest truncate mb-2">@{u.username || 'unknown'} • {u.level}L</p>
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded-lg uppercase tracking-tighter border border-indigo-100/50 dark:border-indigo-900/50">{u.role.replace('_', ' ')}</span>
                                    <span className="text-[10px] font-black text-slate-300 uppercase">{u.matricNumber}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => handleVerifyToggle(u)} className={`py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${u.isVerified ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                                {u.isVerified ? 'Revoke Seal' : 'Verify Identity'}
                            </button>
                            {isSuperAdmin && (
                                <select 
                                    className="py-3 px-3 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black text-[10px] uppercase tracking-widest outline-none border border-transparent focus:border-indigo-500 dark:text-slate-200"
                                    value={u.role}
                                    onChange={e => handleRoleChange(u, e.target.value)}
                                >
                                    {ALLOWED_ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                                </select>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}

        {promoUser && (
            <div className="fixed inset-0 bg-slate-950/90 z-[100] flex items-center justify-center p-6 backdrop-blur-md">
                <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] w-full max-w-md shadow-2xl border border-white/5">
                    <h3 className="text-2xl font-black dark:text-white mb-2">Assign Authority</h3>
                    <p className="text-slate-500 text-sm mb-8">Elevate <span className="font-black text-indigo-600">{promoUser.name}</span> to the {promoRole} council.</p>
                    <div className="space-y-4 mb-8">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Designation / Title</label>
                            <input className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-bold" placeholder={promoRole === 'executive' ? 'e.g. Financial Secretary' : 'e.g. Senior Lecturer'} value={promoDetails.title} onChange={e => setPromoDetails({...promoDetails, title: e.target.value})} />
                        </div>
                        {promoRole === 'executive' && (
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Tenure Level</label>
                                <select className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold dark:text-white" value={promoDetails.level} onChange={e => setPromoDetails({...promoDetails, level: e.target.value})}><option value="100">100L</option><option value="200">200L</option><option value="300">300L</option><option value="400">400L</option></select>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => setPromoUser(null)} className="flex-1 py-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Abort</button>
                        <button onClick={confirmPromotion} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-500/20 uppercase tracking-widest text-[10px]">Confirm Elevation</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
