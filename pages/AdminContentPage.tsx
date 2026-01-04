import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, deleteDoc, updateDoc, addDoc, getDoc, setDoc } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';
import { uploadToImgBB, uploadFile, deleteFile } from '../utils/api';
import { LEVELS } from '../constants';
import { GoogleGenAI } from "@google/genai";
import { AuthContext } from '../contexts/AuthContext';

type ContentType = 'news' | 'executives' | 'lecturers' | 'community' | 'gallery' | 'materials';

export const AdminContentPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const role = auth?.user?.role || 'student';
  const isSuperAdmin = role === 'admin';
  const isLibrarian = role === 'librarian';
  const isVP = role === 'vice_president';
  const isSupplement = role === 'supplement';

  // Helper to determine available tabs
  const getTabs = (): ContentType[] => {
      // VP & Librarian & Supplement: Access to Materials + General Content (No Executives)
      if (isVP || isLibrarian || isSupplement) {
          return ['materials', 'news', 'lecturers', 'community', 'gallery'];
      }
      
      // Admin: All
      if (isSuperAdmin) return ['news', 'executives', 'lecturers', 'community', 'gallery', 'materials'];
      
      return [];
  };

  const tabs = getTabs();

  // Lazy initialization to ensure we start with a valid tab
  const [activeContent, setActiveContent] = useState<ContentType>(() => {
      const t = getTabs();
      // Safely default to the first available tab, or 'news' if empty
      return (t.length > 0 ? t[0] : 'news') as ContentType;
  });

  const [contentItems, setContentItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [formFile, setFormFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI Gen State
  const [isAiMode, setIsAiMode] = useState(false);

  // HOD
  const [hodData, setHodData] = useState({ name: '', title: '', message: '', imageUrl: '' });
  const [hodImageFile, setHodImageFile] = useState<File | null>(null);

  useEffect(() => {
      // Safety check: if role changes and current tab is invalid, switch to first valid
      // This prevents a VP from being stuck on 'materials' if they were previously admin (or vice versa if perms change)
      const availableTabs = getTabs();
      if (availableTabs.length > 0 && !availableTabs.includes(activeContent)) {
          setActiveContent(availableTabs[0]);
      }
  }, [role]);

  useEffect(() => {
    if (tabs.includes(activeContent)) {
        fetchContent(activeContent);
    }
  }, [activeContent]);

  const fetchContent = async (type: ContentType) => {
      setLoading(true);
      try {
          let colName = '';
          if (type === 'news') colName = 'announcements';
          else if (type === 'community') colName = 'groups';
          else if (type === 'materials') colName = 'questions';
          else colName = type;

          const snap = await getDocs(collection(db, colName));
          let docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          
          if (type === 'materials') {
              // Sort materials by creation date
              docs.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          }
          setContentItems(docs);
          
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

  const handleDeleteContent = async (item: any) => {
      if (!window.confirm("Permanently delete this item?")) return;
      try {
          let colName = '';
          if (activeContent === 'news') colName = 'announcements';
          else if (activeContent === 'community') colName = 'groups';
          else if (activeContent === 'materials') colName = 'questions';
          else colName = activeContent;

          // If material, delete from storage first
          if (activeContent === 'materials' && item.storagePath) {
              await deleteFile(item.storagePath);
          }

          await deleteDoc(doc(db, colName, item.id));
          showNotification("Deleted", "info");
          fetchContent(activeContent);
      } catch (e) { showNotification("Delete failed", "error"); }
  };

  const openModal = (item: any = null) => {
      setEditingItem(item);
      setFormData(item || {});
      setFormFile(null);
      setIsModalOpen(true);
      setIsAiMode(false); // Reset AI mode
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
          let colName = '';
          if (activeContent === 'news') colName = 'announcements';
          else if (activeContent === 'community') colName = 'groups';
          else if (activeContent === 'materials') colName = 'questions';
          else colName = activeContent;

          const payload = { ...formData };

          // Handle WhatsApp Logic for Executives
          if (activeContent === 'executives' && payload.whatsapp) {
              let wa = payload.whatsapp.trim();
              if (!wa.startsWith('http')) {
                  let cleanNumber = wa.replace(/[^\d+]/g, '');
                  if (cleanNumber.startsWith('0')) cleanNumber = '234' + cleanNumber.substring(1);
                  if (cleanNumber.startsWith('+')) cleanNumber = cleanNumber.substring(1);
                  payload.whatsapp = `https://wa.me/${cleanNumber}`;
              }
          }

          // Handle File Uploads or AI Gen
          if (activeContent === 'materials') {
              // Ensure numeric types
              payload.year = Number(payload.year || new Date().getFullYear());
              payload.level = Number(payload.level || 100);
              payload.courseCode = (payload.courseCode || 'GEN').toUpperCase();
              
              if (isAiMode) {
                  // AI GENERATION LOGIC
                  if (!payload.courseTitle) throw new Error("Topic is compulsory for AI generation.");
                  
                  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                  const prompt = `Generate comprehensive, university-level study notes/lecture material on the topic: "${payload.courseTitle}". 
                  Course Code: ${payload.courseCode}. Level: ${payload.level}. 
                  Format the output in clean Markdown. Include a summary, key concepts, detailed explanation, and conclusion.`;
                  
                  const result = await ai.models.generateContent({
                      model: 'gemini-3-flash-preview', // Use Flash for better quota
                      contents: prompt,
                  });
                  
                  const textContent = result.text;
                  if (!textContent) throw new Error("AI failed to generate content.");
                  
                  payload.textContent = textContent;
                  payload.fileUrl = null; // No physical file
                  payload.storagePath = null;
                  payload.status = 'approved';

              } else {
                  // FILE UPLOAD LOGIC
                  if (!editingItem && !formFile) throw new Error("File is required for new materials");
                  if (formFile) {
                      const { url, path } = await uploadFile(formFile, 'past_questions');
                      payload.fileUrl = url;
                      payload.storagePath = path;
                      payload.status = 'approved'; // Admin uploads are auto-approved
                  }
              }
              
              if (!editingItem) payload.createdAt = new Date().toISOString();
          } else {
              // Images for other types
              if (formFile) {
                  const url = await uploadToImgBB(formFile);
                  payload.imageUrl = url;
              }
          }
          
          if (activeContent === 'news' && !editingItem) payload.date = new Date().toISOString();
          if (activeContent === 'gallery' && !editingItem) payload.date = new Date().toISOString();

          if (editingItem) {
              await updateDoc(doc(db, colName, editingItem.id), payload);
          } else {
              await addDoc(collection(db, colName), payload);
          }

          setIsModalOpen(false);
          fetchContent(activeContent);
          showNotification(isAiMode ? "Material generated & saved!" : "Saved successfully", "success");
      } catch (e: any) { showNotification(e.message || "Error saving item", "error"); }
      finally { setIsSubmitting(false); }
  };

  return (
    <div className="animate-fade-in pb-20 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Content Manager</h1>
        
        {/* TABS */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            {tabs.map(c => (
                <button 
                    key={c} 
                    onClick={() => setActiveContent(c)} 
                    className={`px-5 py-2.5 font-bold text-sm capitalize rounded-full whitespace-nowrap transition-colors ${activeContent === c ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500'}`}
                >
                    {c}
                </button>
            ))}
        </div>
        
        {activeContent === 'news' && (
            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 mb-8">
                <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                    Homepage HOD Message
                </h3>
                <div className="space-y-3">
                    <input className="w-full border-0 rounded-xl p-3 shadow-sm" placeholder="HOD Name" value={hodData.name} onChange={e => setHodData({...hodData, name: e.target.value})} />
                    <input className="w-full border-0 rounded-xl p-3 shadow-sm" placeholder="Title" value={hodData.title} onChange={e => setHodData({...hodData, title: e.target.value})} />
                    <textarea className="w-full border-0 rounded-xl p-3 shadow-sm" rows={3} placeholder="Message" value={hodData.message} onChange={e => setHodData({...hodData, message: e.target.value})} />
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <label className="flex-1 bg-white border border-dashed border-indigo-300 rounded-xl p-3 text-center cursor-pointer text-xs font-bold text-indigo-500">
                            {hodImageFile ? 'Image Selected' : 'Upload HOD Photo'}
                            <input type="file" className="hidden" onChange={e => e.target.files && setHodImageFile(e.target.files[0])} />
                        </label>
                        <button onClick={handleSaveHOD} className="flex-1 bg-indigo-600 text-white px-4 py-3 rounded-xl font-bold text-sm shadow hover:bg-indigo-700">Update HOD Info</button>
                    </div>
                </div>
            </div>
        )}

        <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold capitalize text-slate-700">{activeContent === 'materials' ? 'Study Materials' : activeContent}</h2>
            <button onClick={() => openModal()} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-700 shadow-md flex items-center gap-2 text-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add New
            </button>
        </div>

        {loading ? <div className="text-center py-12">Loading...</div> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {contentItems.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col relative group hover:border-indigo-200 transition-colors">
                        {item.textContent && <div className="absolute top-4 right-4 bg-emerald-100 text-emerald-600 text-[10px] font-bold px-2 py-1 rounded">AI Generated</div>}
                        {item.imageUrl && (
                            <div className="w-full h-32 rounded-xl bg-slate-100 overflow-hidden mb-3">
                                <img src={item.imageUrl} className="w-full h-full object-cover" alt="preview" />
                            </div>
                        )}
                        <h4 className="font-bold text-slate-800 line-clamp-1 mb-1">{item.title || item.name || item.caption || item.courseTitle}</h4>
                        <p className="text-xs text-slate-500 line-clamp-2 mb-4">{item.position || item.description || item.content || item.courseCode}</p>
                        
                        <div className="mt-auto flex gap-2">
                            <button onClick={() => openModal(item)} className="flex-1 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100">Edit</button>
                            <button onClick={() => handleDeleteContent(item)} className="px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* FORM MODAL */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-slate-900/90 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                    <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-lg capitalize">{editingItem ? 'Edit' : 'Add'} {activeContent}</h3>
                        <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white rounded-full text-slate-500 shadow-sm">✕</button>
                    </div>
                    
                    <form onSubmit={handleFormSubmit} className="p-6 space-y-4 overflow-y-auto">
                        
                        {/* NEWS / COMMUNITY / GALLERY FIELDS */}
                        {(activeContent === 'news' || activeContent === 'community' || activeContent === 'gallery') && (
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Title / Name</label>
                                <input className="w-full border border-slate-300 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" placeholder="Enter title..." value={formData.title || formData.name || formData.caption || ''} onChange={e => setFormData({...formData, title: e.target.value, name: e.target.value, caption: e.target.value})} required />
                            </div>
                        )}
                        {(activeContent === 'news' || activeContent === 'community') && (
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Description</label>
                                <textarea className="w-full border border-slate-300 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" rows={4} placeholder="Content..." value={formData.content || formData.description || ''} onChange={e => setFormData({...formData, content: e.target.value, description: e.target.value})} required />
                            </div>
                        )}

                        {/* EXECUTIVES / LECTURERS FIELDS */}
                        {(activeContent === 'executives' || activeContent === 'lecturers') && (
                            <>
                                <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Name</label><input className="w-full border border-slate-300 p-3 rounded-xl" placeholder="Full Name" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required /></div>
                                <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Role / Title</label><input className="w-full border border-slate-300 p-3 rounded-xl" placeholder="Position" value={formData.position || formData.title || ''} onChange={e => setFormData({...formData, position: e.target.value, title: e.target.value})} required /></div>
                            </>
                        )}
                        {activeContent === 'executives' && (
                            <>
                                <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">WhatsApp Number</label><input className="w-full border border-slate-300 p-3 rounded-xl" placeholder="e.g. 08012345678" value={formData.whatsapp || ''} onChange={e => setFormData({...formData, whatsapp: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Email</label><input className="w-full border border-slate-300 p-3 rounded-xl" placeholder="email@aaua.edu.ng" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Favorite Quote</label><textarea className="w-full border border-slate-300 p-3 rounded-xl" rows={2} placeholder="Quote..." value={formData.quote || ''} onChange={e => setFormData({...formData, quote: e.target.value})} /></div>
                            </>
                        )}
                        {(activeContent === 'executives' || activeContent === 'lecturers') && (
                             <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Level</label>
                                <select className="w-full border border-slate-300 p-3 rounded-xl bg-white" value={formData.level || '100'} onChange={e => setFormData({...formData, level: Number(e.target.value)})}>
                                    <option value="100">100 Level</option>
                                    <option value="200">200 Level</option>
                                    <option value="300">300 Level</option>
                                    <option value="400">400 Level</option>
                                </select>
                             </div>
                        )}

                        {/* MATERIALS FIELDS */}
                        {activeContent === 'materials' && (
                            <>
                                <div className="flex gap-4 p-1 bg-slate-100 rounded-lg mb-4">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsAiMode(false)}
                                        className={`flex-1 py-2 rounded-md font-bold text-sm transition-all ${!isAiMode ? 'bg-white text-indigo-600 shadow' : 'text-slate-500'}`}
                                    >
                                        Upload Document
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setIsAiMode(true)}
                                        className={`flex-1 py-2 rounded-md font-bold text-sm transition-all ${isAiMode ? 'bg-emerald-100 text-emerald-700 shadow' : 'text-slate-500'}`}
                                    >
                                        AI Generate Notes
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                                        {isAiMode ? 'Topic (Compulsory)' : 'Course Title'}
                                    </label>
                                    <input 
                                        className="w-full border p-3 rounded-xl font-bold" 
                                        placeholder={isAiMode ? "e.g. Introduction to Capital Budgeting" : "Intro to Finance"} 
                                        value={formData.courseTitle || ''} 
                                        onChange={e => setFormData({...formData, courseTitle: e.target.value})} 
                                        required 
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                                            Course Code {isAiMode && '(Optional)'}
                                        </label>
                                        <input 
                                            className="w-full border p-3 rounded-xl uppercase" 
                                            placeholder="FIN 101" 
                                            value={formData.courseCode || ''} 
                                            onChange={e => setFormData({...formData, courseCode: e.target.value})} 
                                            required={!isAiMode} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                                            Level {isAiMode && '(Optional)'}
                                        </label>
                                        <select className="w-full border p-3 rounded-xl bg-white" value={formData.level || '100'} onChange={e => setFormData({...formData, level: e.target.value})}>
                                            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </div>
                                </div>
                                
                                {!isAiMode && (
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Year</label>
                                        <input type="number" className="w-full border p-3 rounded-xl" placeholder="2023" value={formData.year || ''} onChange={e => setFormData({...formData, year: e.target.value})} required />
                                    </div>
                                )}
                            </>
                        )}

                        {/* FILE UPLOAD SECTION */}
                        {(!isAiMode) && (
                            <div className="pt-4">
                                <label className="block w-full border-2 border-dashed border-slate-300 p-4 rounded-xl text-center cursor-pointer hover:bg-slate-50 transition-colors">
                                    <span className="text-sm font-bold text-slate-500">
                                        {formFile ? `File Selected: ${formFile.name}` : (activeContent === 'materials' ? 'Upload PDF/Doc' : 'Upload Image (Optional)')}
                                    </span>
                                    <input type="file" className="hidden" onChange={e => e.target.files && setFormFile(e.target.files[0])} accept={activeContent === 'materials' ? ".pdf,.doc,.docx" : "image/*"} />
                                </label>
                            </div>
                        )}

                        <button type="submit" disabled={isSubmitting} className={`w-full py-4 text-white font-bold rounded-xl shadow-lg mt-4 disabled:opacity-70 ${isAiMode ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                            {isSubmitting ? (isAiMode ? 'Generating...' : 'Saving...') : (isAiMode ? 'Generate Material with AI' : 'Save Changes')}
                        </button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};
