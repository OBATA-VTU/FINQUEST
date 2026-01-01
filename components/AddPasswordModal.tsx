import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

interface AddPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddPasswordModal: React.FC<AddPasswordModalProps> = ({ isOpen, onClose }) => {
    const auth = useContext(AuthContext);
    const { showNotification } = useNotification();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) {
            showNotification("Password must be at least 6 characters.", "warning");
            return;
        }
        if (password !== confirmPassword) {
            showNotification("Passwords do not match.", "error");
            return;
        }
        setLoading(true);
        try {
            if (auth) {
                await auth.addPassword(password);
            }
            onClose();
        } catch (e) {
            // Notification handled in context
        } finally {
            setLoading(false);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Add a Password</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Create a password to enable email & password sign-in.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="password" autoFocus required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="New Password" />
                    <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Confirm Password" />
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-3 border border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
                        <button type="submit" disabled={loading} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">{loading ? 'Saving...' : 'Set Password'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
