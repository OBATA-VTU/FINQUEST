
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';
import { uploadToImgBB } from '../utils/api';

export const AdminGalleryPage: React.FC = () => {
  const [contentItems, setContentItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [formFile, setFormFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modalInputStyles = "w-full border p-3 rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none";

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
      setLoading(true);
      try {
          const snap = await getDocs(collection(db, 'gallery'));
          setContentItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } finally { setLoading(false); }
  };

  const handleDeleteContent = async (id: string) => {
      if (!window.confirm("Permanently delete this item?")) return;
      try {
          await deleteDoc(doc(db, 'gallery', id));
          showNotification("Deleted", "info");
          fetchContent();
      } catch (e) { showNotification("Delete failed", "error"); }
  };

  const openModal = (item: any = null) => {
      setEditingItem(item);
      setFormData(item || {});
      setFormFile(null);
      setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
          const payload = { ...formData };
          if (formFile) {
              payload.imageUrl = await uploadToImgBB(formFile);
          }
          if (!editingItem) payload.date = new Date().toISOString();

          if (editingItem) {
              await updateDoc(doc(db, 'gallery', editingItem.id), payload);
          } else {
              await addDoc(collection(db, 'gallery'), payload);
          }
          setIsModalOpen(false);
          fetchContent();
          showNotification("Saved successfully", "success");
      } catch (e: any) { showNotification(e.message || "Error saving item", "error"); }
      finally { setIsSubmitting(false); }
  };

  return (
    <div className="animate-fade-in pb-20 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manage Gallery</h1>
            <button onClick={() => openModal()} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-700 shadow-md flex items-center gap-2 text-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add New
            </button>
        </div>

        {loading ? <div className="text-center py-12 dark:text-slate-400">Loading...</div> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {contentItems.map(item => (
                    <div key={item.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col group hover:border-indigo-200 dark:hover:border-indigo-600 transition-colors">
                        <div className="w-full h-32 rounded-xl bg-slate-100 dark:bg-slate-700 overflow-hidden mb-3"><img src={item.imageUrl} className="w-full h-full object-cover" alt="preview" /></div>
                        <h4 className="font-bold text-slate-800 dark:text-white line-clamp-2 mb-4 flex-1">{item.caption}</h4>
                        <div className="mt-auto flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                            <button onClick={() => openModal(item)} className="flex-1 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50">Edit</button>
                            <button onClick={() => handleDeleteContent(item.id)} className="px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/30 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/50"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {isModalOpen && (
            <div className="fixed inset-0 bg-slate-900/90 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
                <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                    <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50"><h3 className="font-bold text-lg dark:text-white">Manage Gallery Item</h3><button onClick={() => setIsModalOpen(false)} className="p-2 bg-white dark:bg-slate-700 rounded-full text-slate-500 shadow-sm">✕</button></div>
                    <form onSubmit={handleFormSubmit} className="p-6 space-y-4 overflow-y-auto">
                        <div><label className="dark:text-slate-300">Caption</label><input className={modalInputStyles} value={formData.caption || ''} onChange={e => setFormData({...formData, caption: e.target.value})} required /></div>
                        <div><label className="dark:text-slate-300">Image</label><input type="file" className={`${modalInputStyles} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100`} onChange={e => e.target.files && setFormFile(e.target.files[0])} accept="image/*" /></div>
                        <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold">{isSubmitting ? 'Saving...' : 'Save Changes'}</button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};