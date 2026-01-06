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

  useEffect(() => {
    if (isOpen && auth?.user) {
        setName(auth.user.name);
        setLevel(auth.user.level || 100);
        setMatricNumber(auth.user.matricNumber || '');
        setPhoto(null);
    }
  }, [isOpen, auth?.user]);

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
        if (photo) {
            photoURL = await uploadToImgBB(photo);
            if (firebaseAuth.currentUser) {
                await updateProfile(firebaseAuth.currentUser, { photoURL });
            }
        }

        const userRef = doc(db, 'users', auth.user!.id);
        const updates = { name, level, avatarUrl: photoURL }; // Matric number is intentionally omitted
        await updateDoc(userRef, updates);

        showNotification("Profile updated! Refresh to see changes.", "success");
        onClose();
        window.location.reload(); 
    } catch (error) {
        showNotification("Failed to update profile", "error");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <div ref={modalRef} className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-down">
            <div className="bg-indigo-900 px-6 py-4 flex justify-between items-center">
                <h3 className="text-white font-bold text-lg">Edit Profile</h3>
                <button onClick={onClose} className="text-indigo-200 hover:text-white">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="flex justify-center mb-6">
                    <div className="relative group cursor-pointer">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-indigo-100 bg-slate-100">
                            {photo ? (
                                <img src={URL.createObjectURL(photo)} className="w-full h-full object-cover" alt="Preview" />
                            ) : (
                                <img src={auth.user.avatarUrl} className="w-full h-full object-cover" alt="Current" />
                            )}
                        </div>
                        <label htmlFor="edit-photo" className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full text-white text-xs font-bold cursor-pointer">Change</label>
                        <input id="edit-photo" type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Level</label>
                        <select value={level} onChange={e => setLevel(Number(e.target.value) as Level)} className="w-full px-4 py-2 border rounded-lg outline-none">
                             {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Matric No.</label>
                        <input type="text" value={matricNumber} className="w-full px-4 py-2 border rounded-lg outline-none bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed" disabled />
                         <p className="text-xs text-slate-500 mt-1">To update your matric number, please contact the current PRO.</p>
                    </div>
                </div>

                <div className="pt-4 flex gap-3">
                    <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50">Cancel</button>
                    <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-70">{loading ? 'Saving...' : 'Save'}</button>
                </div>
            </form>
        </div>
    </div>
  );
};
