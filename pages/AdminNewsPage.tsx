
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, deleteDoc, updateDoc, addDoc, getDoc, setDoc } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';
import { uploadToImgBB } from '../utils/api';

export const AdminNewsPage: React.FC = () => {
  const [contentItems, setContentItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [formFile, setFormFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [hodData, setHodData] = useState({ name: '', title: '', message: '', imageUrl: '' });
  const [hodImageFile, setHodImageFile] = useState<File | null>(null);

  useEffect(() => { fetchContent(); }, []);

  const fetchContent = async () => {
      setLoading(true);
      try {
          const snap = await getDocs(collection(db, 'announcements'));
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          docs.sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
          setContentItems(docs);
          
          const hDoc = await getDoc(doc(db, 'content', 'hod_message'));
          if (hDoc.exists()) setHodData(hDoc.data() as any);
      } finally { setLoading(false); }
  };

  const handleSaveHOD = async () => {
      try {
          let url = hodData.imageUrl;
          if (hodImageFile) url = await uploadToImgBB(hodImageFile);
          await setDoc(doc(db, 'content', 'hod_message'), { ...hodData, imageUrl: url });
          showNotification("HOD Broadcast Updated", "success");
      } catch (e) { showNotification("Update failed", "error"); }
  };

  const handleDeleteContent = async (id: string) => {
      if (!window.confirm("Purge this report?")) return;
      try {
          await deleteDoc(doc(db, 'announcements', id));
          showNotification("Announcement Removed", "info");
          fetchContent();
      } catch (e) { showNotification("Purge failed", "error"); }
  };

  const openModal = (item: any = null) => {
      setEditingItem(item);
      setFormData(item || { author: 'Department Admin' });
      setFormFile(null);
      setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
          const payload = { ...formData };
          if (formFile) payload.imageUrl = await uploadToImgBB(formFile);
          if (!editingItem) payload.date = new Date().toISOString();

          if (editingItem) await updateDoc(doc(db, 'announcements', editingItem.id), payload);
          else await addDoc(collection(db, 'announcements'), payload);
          
          setIsModalOpen(false);
          fetchContent();
          showNotification("Report Published.", "success");
      } catch (e: any) { showNotification("Intel upload failed.", "error"); }
      finally { setIsSubmitting(false); }
  };

  return (
    <div className="animate-fade-in space-y-10 pb-20 max-w-6xl mx-auto">
        <header>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Departmental Bulletins</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Manage public announcements and faculty messages.</p>
        </header>
        
        <section className="bg-indigo-950 rounded-[3rem] p-10 md:p-14 text-white relative overflow-hidden shadow-2xl border border-white/5">
            <div className="absolute top-0 right-0 p-10 opacity-10"><svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" /></svg></div>
            <div className="relative z-10">
                <h3 className="text-xl font-black mb-8 flex items-center gap-2 uppercase tracking-widest text-indigo-300">
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></span>
                    Faculty Representative Broadcast
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <input className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold placeholder:text-slate-500" placeholder="Faculty Name (e.g. Dr. Adebayo)" value={hodData.name} onChange={e => setHodData({...hodData, name: e.target.value})} />
                        <input className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold placeholder:text-slate-500" placeholder="Title (e.g. Head of Department)" value={hodData.title} onChange={e => setHodData({...hodData, title: e.target.value})} />
                    </div>
                    <textarea className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold placeholder:text-slate-500 resize-none h-full" rows={3} placeholder="The message from the Desk of the H.O.D..." value={hodData.message} onChange={e => setHodData({...hodData, message: e.target.value})} />
                </div>
                <div className="flex flex-col sm:flex-row gap-4 mt-6">
                    <label className="flex-1 px-6 py-4 bg-white/10 border-2 border-dashed border-white/20 rounded-2xl text-center cursor-pointer text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all flex items-center justify-center">
                        {hodImageFile ? 'Profile Photo Locked' : 'Update Profile Photo'}
                        <input type="file" className="hidden" onChange={e => e.target.files && setHodImageFile(e.target.files[0])} />
                    </label>
                    <button onClick={handleSaveHOD} className="flex-1 py-4 bg-white text-indigo-950 font-black rounded-2xl shadow-xl hover:bg-indigo-50 transition-all uppercase tracking-widest text-[10px]">Sync Faculty Message</button>
                </div>
            </div>
        </section>

        <div className="flex justify-between items-end border-b border-slate-100 dark:border-slate-800 pb-6">
            <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white">Active Feed</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Live announcements appearing on student dashboard</p>
            </div>
            <button onClick={() => openModal()} className="px-8 py-3.5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 transition-all active:scale-95 uppercase tracking-widest text-[10px] flex items-center gap-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 4v16m8-8H4" /></svg>
                Draft Intel
            </button>
        </div>

        {loading ? <div className="text-center py-20 text-slate-400 uppercase tracking-widest font-black">Syncing archives...</div> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {contentItems.map(item => (
                    <div key={item.id} className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col group hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden">
                        <div className="h-48 bg-slate-50 dark:bg-slate-800 relative overflow-hidden">
                            {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt="intel" /> : <div className="w-full h-full flex items-center justify-center opacity-10"><svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg></div>}
                            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur dark:bg-slate-900/90 px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest text-slate-500 border border-black/5">{new Date(item.date).toLocaleDateString()}</div>
                        </div>
                        <div className="p-8 flex-1 flex flex-col">
                            <h4 className="font-black text-xl text-slate-900 dark:text-white leading-tight mb-3 font-serif group-hover:text-indigo-600 transition-colors">{item.title}</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 mb-8 leading-relaxed">{item.content}</p>
                            <div className="mt-auto flex gap-3 pt-6 border-t border-slate-50 dark:border-slate-800">
                                <button onClick={() => openModal(item)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl hover:bg-indigo-100 transition-all">Edit</button>
                                <button onClick={() => handleDeleteContent(item.id)} className="px-4 py-3 text-rose-500 bg-rose-50 dark:bg-rose-900/30 rounded-xl hover:bg-rose-500 hover:text-white transition-all"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {isModalOpen && (
            <div className="fixed inset-0 bg-slate-950/90 z-[100] flex items-center justify-center p-6 backdrop-blur-md" onClick={() => setIsModalOpen(false)}>
                <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh] border border-white/5 animate-pop-in" onClick={e => e.stopPropagation()}>
                    <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                        <h3 className="font-black text-2xl dark:text-white font-serif">Compose Intel</h3>
                        <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white dark:bg-slate-700 rounded-full text-slate-400 hover:text-rose-500 transition-colors shadow-sm">✕</button>
                    </div>
                    <form onSubmit={handleFormSubmit} className="p-8 space-y-5 overflow-y-auto custom-scrollbar">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Intel Heading</label>
                            <input className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold dark:text-white" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Source Author</label>
                                <input className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold dark:text-white text-xs" value={formData.author || ''} onChange={e => setFormData({...formData, author: e.target.value})} required />
                            </div>
                            <div className="relative">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Attachment</label>
                                <label className="flex items-center justify-center w-full p-4 bg-slate-50 dark:bg-slate-800 border border-transparent hover:border-indigo-500 rounded-2xl cursor-pointer transition-all">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 truncate">{formFile ? 'Locked' : 'Attach JPG'}</span>
                                    <input type="file" className="hidden" onChange={e => e.target.files && setFormFile(e.target.files[0])} accept="image/*" />
                                </label>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Intel Body</label>
                            <textarea className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold dark:text-white min-h-[200px]" value={formData.content || ''} onChange={e => setFormData({...formData, content: e.target.value})} required />
                        </div>
                        <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-xl shadow-indigo-500/20 uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all active:scale-95">
                            {isSubmitting ? 'Transmitting...' : 'Dispatch Bulletin'}
                        </button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};
