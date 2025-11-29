
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, deleteDoc, updateDoc, addDoc, getDoc, setDoc } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';
import { uploadToImgBB, deleteFile } from '../utils/api'; // Dropbox delete imported just in case, though imgbb is used here

type ContentType = 'news' | 'executives' | 'lecturers' | 'community' | 'gallery';

export const AdminContentPage: React.FC = () => {
  const [activeContent, setActiveContent] = useState<ContentType>('news');
  const [contentItems, setContentItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [formFile, setFormFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // HOD
  const [hodData, setHodData] = useState({ name: '', title: '', message: '', imageUrl: '' });
  const [hodImageFile, setHodImageFile] = useState<File | null>(null);

  useEffect(() => {
    fetchContent(activeContent);
  }, [activeContent]);

  const fetchContent = async (type: ContentType) => {
      setLoading(true);
      try {
          let colName = type === 'news' ? 'announcements' : type === 'community' ? 'groups' : type;
          const snap = await getDocs(collection(db, colName));
          setContentItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          
          if (type === 'news') {
               const hDoc = await getDoc(doc(db, 'content', 'hod_message'));
               if (hDoc.exists()) setHodData(hDoc.data() as any);
          }
      } finally { setLoading(false); }
  };

  const handleSaveHOD = async () => {
      try {
          let url = hodData.imageUrl;
          if (hodImageFile) url = await uploadToImgBB(hodImageFile);
          await setDoc(doc(db, 'content', 'hod_message'), { ...hodData, imageUrl: url });
          showNotification("HOD Content updated", "success");
      } catch (e) { showNotification("Update failed", "error"); }
  };

  const handleDeleteContent = async (id: string) => {
      if (!window.confirm("Delete this item?")) return;
      try {
          let colName = activeContent === 'news' ? 'announcements' : activeContent === 'community' ? 'groups' : activeContent;
          await deleteDoc(doc(db, colName, id));
          showNotification("Deleted", "info");
          fetchContent(activeContent);
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
          let url = formData.imageUrl;
          if (formFile) url = await uploadToImgBB(formFile);
          
          let colName = activeContent === 'news' ? 'announcements' : activeContent === 'community' ? 'groups' : activeContent;
          const payload = { ...formData, imageUrl: url };
          
          if (activeContent === 'news' && !editingItem) payload.date = new Date().toISOString();
          if (activeContent === 'gallery' && !editingItem) payload.date = new Date().toISOString();

          if (editingItem) {
              await updateDoc(doc(db, colName, editingItem.id), payload);
          } else {
              await addDoc(collection(db, colName), payload);
          }
          setIsModalOpen(false);
          fetchContent(activeContent);
          showNotification("Saved successfully", "success");
      } catch (e) { showNotification("Error saving item", "error"); }
      finally { setIsSubmitting(false); }
  };

  return (
    <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Content Management</h1>
        
        {/* TABS */}
        <div className="flex gap-2 mb-6 border-b border-slate-200 pb-1 overflow-x-auto">
            {['news', 'executives', 'lecturers', 'community', 'gallery'].map(c => (
                <button key={c} onClick={() => setActiveContent(c as ContentType)} className={`px-4 py-2 font-bold text-sm capitalize rounded-t-lg whitespace-nowrap ${activeContent === c ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{c}</button>
            ))}
        </div>
        
        {activeContent === 'news' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 mb-6">
                <h3 className="font-bold mb-4">Homepage HOD Section</h3>
                <div className="grid gap-4">
                    <input className="border p-2 rounded" placeholder="HOD Name" value={hodData.name} onChange={e => setHodData({...hodData, name: e.target.value})} />
                    <input className="border p-2 rounded" placeholder="Title" value={hodData.title} onChange={e => setHodData({...hodData, title: e.target.value})} />
                    <textarea className="border p-2 rounded" rows={3} placeholder="Message" value={hodData.message} onChange={e => setHodData({...hodData, message: e.target.value})} />
                    <div className="flex gap-2 items-center">
                        <input type="file" onChange={e => e.target.files && setHodImageFile(e.target.files[0])} className="text-sm" />
                        <button onClick={handleSaveHOD} className="bg-slate-800 text-white px-4 py-2 rounded font-bold text-xs whitespace-nowrap">Update HOD Info</button>
                    </div>
                </div>
            </div>
        )}

        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold capitalize">{activeContent} List</h2>
            <button onClick={() => openModal()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow">+ Add New</button>
        </div>

        {loading ? <div>Loading...</div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {contentItems.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col relative group">
                        {item.imageUrl && <img src={item.imageUrl} className="w-full h-32 object-cover rounded-lg mb-3" alt="preview" />}
                        <h4 className="font-bold line-clamp-1">{item.title || item.name || item.caption}</h4>
                        <div className="mt-auto pt-4 flex gap-2">
                            <button onClick={() => openModal(item)} className="text-xs font-bold text-indigo-600 border border-indigo-200 px-3 py-1 rounded">Edit</button>
                            <button onClick={() => handleDeleteContent(item.id)} className="text-xs font-bold text-rose-600 border border-rose-200 px-3 py-1 rounded">Delete</button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* MODAL */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
                    <h3 className="font-bold text-xl mb-4 capitalize">{editingItem ? 'Edit' : 'Add'} {activeContent}</h3>
                    <form onSubmit={handleFormSubmit} className="space-y-4">
                        {(activeContent === 'news' || activeContent === 'community' || activeContent === 'gallery') && (
                            <input className="w-full border p-2 rounded" placeholder="Title / Name / Caption" value={formData.title || formData.name || formData.caption || ''} onChange={e => setFormData({...formData, title: e.target.value, name: e.target.value, caption: e.target.value})} required />
                        )}
                        {(activeContent === 'news' || activeContent === 'community') && (
                            <textarea className="w-full border p-2 rounded" rows={3} placeholder="Content / Description" value={formData.content || formData.description || ''} onChange={e => setFormData({...formData, content: e.target.value, description: e.target.value})} required />
                        )}
                        {(activeContent === 'executives' || activeContent === 'lecturers') && (
                            <>
                                <input className="w-full border p-2 rounded" placeholder="Name" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required />
                                <input className="w-full border p-2 rounded" placeholder="Position / Title" value={formData.position || formData.title || ''} onChange={e => setFormData({...formData, position: e.target.value, title: e.target.value})} required />
                            </>
                        )}
                        {(activeContent === 'executives' || activeContent === 'lecturers') && (
                             <select className="w-full border p-2 rounded" value={formData.level || '100'} onChange={e => setFormData({...formData, level: Number(e.target.value)})}>
                                 <option value="100">100 Level</option>
                                 <option value="200">200 Level</option>
                                 <option value="300">300 Level</option>
                                 <option value="400">400 Level</option>
                             </select>
                        )}
                        <div className="border-t pt-4">
                            <label className="block text-xs font-bold mb-2">Upload Image</label>
                            <input type="file" onChange={e => e.target.files && setFormFile(e.target.files[0])} />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-bold">Cancel</button>
                            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded">Save</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};
