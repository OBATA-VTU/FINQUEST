
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
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
      try {
          await updateDoc(doc(db, 'users', uid), { role });
          showNotification("User role updated", "success");
          fetchUsers();
      } catch (e) { showNotification("Failed to update role", "error"); }
  };

  return (
    <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">User Management</h1>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b"><tr><th className="p-4">User</th><th className="p-4">Current Role</th><th className="p-4">Change Role</th></tr></thead>
                <tbody>
                    {loading ? <tr><td colSpan={3} className="p-8 text-center">Loading...</td></tr> : users.map(u => (
                        <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50">
                            <td className="p-4">
                                <p className="font-bold">{u.name}</p>
                                <p className="text-xs text-slate-500">{u.email}</p>
                            </td>
                            <td className="p-4"><span className="uppercase text-xs font-bold bg-slate-100 px-2 py-1 rounded border">{u.role}</span></td>
                            <td className="p-4">
                                <select value={u.role} onChange={(e) => updateUserRole(u.id, e.target.value)} className="border rounded p-1 text-xs bg-white">
                                    <option value="student">Student</option>
                                    <option value="admin">Admin</option>
                                    <option value="executive">Executive</option>
                                    <option value="lecturer">Lecturer</option>
                                </select>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};
