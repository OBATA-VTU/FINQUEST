
import React, { useState, useContext, useRef, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Level } from '../types';
import { LEVELS } from '../constants';
import { uploadToImgBB } from '../utils/api';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth as firebaseAuth, db } from '../firebase';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const auth = useContext(AuthContext);
  const { showNotification } = useNotification();
  const [name, setName] = useState(auth?.user?.name || '');
  const [level, setLevel] = useState<Level>(auth?.user?.level || 100);
  const [matricNumber, setMatricNumber] = useState(auth?.user?.matricNumber || '');
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen && auth?.user) {
        setName(auth.user.name);
        setLevel(auth.user.level || 100);
        setMatricNumber(auth.user.matricNumber || '');
        setPhoto(null);
    }
  }, [isOpen, auth?.user]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!isOpen || !auth?.user) return null;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setPhoto(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
        let photoURL = auth.user?.avatarUrl;

        // 1. Upload new photo if selected
        if (photo) {
            photoURL = await uploadToImgBB(photo);
            if (firebaseAuth.currentUser) {
                await updateProfile(firebaseAuth.currentUser, { photoURL });
            }
        }

        // 2. Update Firestore
        const userRef = doc(db, 'users', auth.user!.id);
        const updates = {
            name,
            level,
            matricNumber,
            avatarUrl: photoURL
        };

        await updateDoc(userRef, updates);

        // 3. Update local auth state (force reload or optimistic update could go here, 
        // but AuthContext listener usually catches it if we trigger a reload, 
        // strictly updating firestore might not trigger auth listener immediately for custom fields)
        
        showNotification("Profile updated successfully! Refresh to see changes.", "success");
        onClose();
        window.location.reload(); // Simple way to ensure context refreshes
    } catch (error) {
        console.error("Update failed", error);
        showNotification("Failed to update profile", "error");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <div 
            ref={modalRef}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-down"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="bg-indigo-900 px-6 py-4 flex justify-between items-center">
                <h3 className="text-white font-bold text-lg">Edit Profile</h3>
                <button onClick={onClose} className="text-indigo-200 hover:text-white">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Photo Upload */}
                <div className="flex justify-center mb-6">
                    <div className="relative group cursor-pointer">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-indigo-100 bg-slate-100">
                            {photo ? (
                                <img src={URL.createObjectURL(photo)} className="w-full h-full object-cover" alt="Preview" />
                            ) : (
                                <img src={auth.user.avatarUrl || `https://ui-avatars.com/api/?name=${name}`} className="w-full h-full object-cover" alt="Current" />
                            )}
                        </div>
                        <label htmlFor="edit-photo" className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full text-white text-xs font-bold cursor-pointer">
                            Change
                        </label>
                        <input id="edit-photo" type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                    <input 
                        type="text" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                        required 
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Level</label>
                        <select 
                            value={level} 
                            onChange={e => setLevel(Number(e.target.value) as Level)} 
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                             {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Matric No.</label>
                        <input 
                            type="text" 
                            value={matricNumber} 
                            onChange={e => setMatricNumber(e.target.value)} 
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                        />
                    </div>
                </div>

                <div className="pt-4 flex gap-3">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="flex-1 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition disabled:opacity-70 flex justify-center items-center gap-2"
                    >
                        {loading && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};
