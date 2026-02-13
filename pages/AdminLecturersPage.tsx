import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';
import { uploadToImgBB } from '../utils/api';
import { Lecturer } from '../types';

export const AdminLecturersPage: React.FC = () => {
  const [contentItems, setContentItems] = useState<Lecturer[]>([]);
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Lecturer | null>(null);
  const [formData, setFormData] = useState<Partial<Lecturer>>({});
  const [formFile, setFormFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { fetchContent(); }, []);

  const fetchContent = async () => {
      setLoading(true);
      try {
          const snap = await getDocs(collection(db, 'lecturers'));
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Lecturer));
          // Sort by order in admin as well for consistency
          docs.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
          setContentItems(docs);
      } finally { setLoading(false); }
  };

  const handleDeleteContent = async (id: string) => {
      if (!window.confirm("Purge faculty record?")) return;
      try {
          await deleteDoc(doc(db, 'lecturers', id));
          showNotification("Record Discarded", "info");
          fetchContent();
      } catch (e) { showNotification("Purge failed", "error"); }
  };

  const openModal = (item: Lecturer | null = null) => {
      setEditingItem(item);
      setFormData(item ? { ...item } : { order: contentItems.length + 1 });
      setFormFile(null);
      setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
          const payload = { ...formData };
          if (formFile) payload.imageUrl = await uploadToImgBB(formFile);
          
          // Double check order is a number
          if (payload.order !== undefined) payload.order = Number(payload.order);

          if (editingItem) await updateDoc(doc(db, 'lecturers', editingItem.id), payload);
          else await addDoc(collection(db, 'lecturers'), payload);
          
          setIsModalOpen(false);
          fetchContent();
          showNotification("Faculty Profile Updated.", "success");
      } catch (e: any) { showNotification("Update failed.", "error"); }
      finally { setIsSubmitting(false); }
  };

  return (
    <div className="animate-fade-in space-y-10 pb-20 max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white">Academic Faculty Registry</h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Manage professional profiles of departmental scholars.</p>
            </div>
            <button onClick={() => openModal()} className="px-10 py-4 bg-indigo-600 text-white font-black rounded-3xl hover:bg-indigo-700 shadow-2xl shadow-indigo-500/20 transition-all active:scale-95 uppercase tracking-widest text-[10px] flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 4v16m8-8H4" /></svg>
                Induct Scholar
            </button>
        </header>

        {loading ? <div className="text-center py-20 font-black uppercase text-slate-400 tracking-[0.3em]">Decoding Profiles...</div> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {contentItems.map(item => (
                    <div key={item.id} className="bg-white dark:bg-slate-900 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col group hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden">
                        <div className="h-56 bg-slate-50 dark:bg-slate-800 relative overflow-hidden">
                            {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt="scholar" /> : <div className="w-full h-full flex items-center justify-center opacity-10 font-black text-5xl">{item.name?.charAt(0)}</div>}
                            <div className="absolute top-4 left-4 bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-lg border-2 border-white dark:border-slate-900">{item.order || '?'}</div>
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur dark:bg-slate-900/90 px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest text-indigo-600 border border-indigo-100/50 shadow-lg">{item.title}</div>
                        </div>
                        <div className="p-8 flex-1 flex flex-col text-center">
                            <h4 className="font-black text-2xl text-slate-900 dark:text-white leading-tight mb-2 font-serif group-hover:text-indigo-600 transition-colors">{item.name}</h4>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8 line-clamp-1">{item.specialization || 'Finance Specialist'}</p>
                            <div className="mt-auto flex gap-3 pt-6 border-t border-slate-50 dark:border-slate-800">
                                <button onClick={() => openModal(item)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl hover:bg-indigo-100 transition-all">Refine</button>
                                <button onClick={() => handleDeleteContent(item.id)} className="px-4 py-3 text-rose-500 bg-rose-50 dark:bg-rose-900/30 rounded-2xl hover:bg-rose-500 hover:text-white transition-all"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {isModalOpen && (
            <div className="fixed inset-0 bg-slate-950/90 z-[100] flex items-center justify-center p-6 backdrop-blur-md" onClick={() => setIsModalOpen(false)}>
                <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl border border-white/5 animate-pop-in" onClick={e => e.stopPropagation()}>
                    <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                        <h3 className="font-black text-2xl dark:text-white font-serif">{editingItem ? 'Edit Profile' : 'Scholar Intake'}</h3>
                        <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white dark:bg-slate-700 rounded-full text-slate-400 hover:text-rose-500 transition-colors shadow-sm">✕</button>
                    </div>
                    <form onSubmit={handleFormSubmit} className="p-8 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-1 gap-5">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Profile Hierarchy (Order)</label>
                                <input 
                                    type="number" 
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold dark:text-white" 
                                    value={formData.order ?? ''} 
                                    onChange={e => setFormData({...formData, order: e.target.value ? Number(e.target.value) : undefined})} 
                                    placeholder="e.g. 1 for Head of Department" 
                                    required 
                                />
                                <p className="text-[9px] text-slate-400 mt-2 ml-1 font-medium">Controls the position on the registry. Lower numbers (1, 2, 3...) appear first.</p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Full Identity</label>
                                <input className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold dark:text-white" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Academic Rank (e.g. Professor, Dr)</label>
                                <input className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold dark:text-white" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} required />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Core Specialization</label>
                                <input className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold dark:text-white" value={formData.specialization || ''} onChange={e => setFormData({...formData, specialization: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Official Portrait</label>
                            <label className="flex items-center justify-center w-full p-5 bg-slate-50 dark:bg-slate-800 border border-transparent hover:border-indigo-500 rounded-2xl cursor-pointer transition-all">
                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">{formFile ? 'Portrait Selected' : (formData.imageUrl ? 'Update Portrait' : 'Upload Scholar Image')}</span>
                                <input type="file" className="hidden" onChange={e => e.target.files && setFormFile(e.target.files[0])} accept="image/*" />
                            </label>
                        </div>
                        <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-xl shadow-indigo-500/20 uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all active:scale-95">
                            {isSubmitting ? 'Syncing Intel...' : (editingItem ? 'Commit Changes' : 'Induct Faculty Member')}
                        </button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};