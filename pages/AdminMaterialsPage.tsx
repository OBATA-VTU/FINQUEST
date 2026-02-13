import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';
import { uploadDocument, deleteDocument } from '../utils/api';
import { LEVELS } from '../constants';
import { GoogleGenAI } from "@google/genai";

const CATEGORIES = ["Past Question", "Test Question", "Lecture Note", "Handout", "Textbook", "Other"];

export const AdminMaterialsPage: React.FC = () => {
  const [contentItems, setContentItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [formFile, setFormFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiMode, setIsAiMode] = useState(false);

  useEffect(() => { fetchContent(); }, []);

  const fetchContent = async () => {
      setLoading(true);
      try {
          const snap = await getDocs(collection(db, 'questions'));
          let docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          docs.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setContentItems(docs);
      } finally { setLoading(false); }
  };

  const handleDeleteContent = async (item: any) => {
      if (!window.confirm("Purge this archive permanently?")) return;
      try {
          if (item.storagePath) await deleteDocument(item.storagePath);
          await deleteDoc(doc(db, 'questions', item.id));
          showNotification("Record Discarded", "info");
          fetchContent();
      } catch (e) { showNotification("Purge failed", "error"); }
  };

  const openModal = (item: any = null) => {
      setEditingItem(item);
      setFormData(item || { level: 100, year: new Date().getFullYear(), semester: 'N/A', category: 'Past Question' });
      setFormFile(null);
      setIsAiMode(false);
      setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
          const payload = { ...formData };
          payload.year = Number(payload.year);
          payload.level = payload.level === 'General' ? 'General' : Number(payload.level);
          payload.courseCode = (payload.courseCode || 'GEN').toUpperCase();
          payload.semester = payload.semester === 'N/A' ? 'N/A' : Number(payload.semester);

          if (isAiMode) {
              const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
              const prompt = `Generate comprehensive, university-level study notes/lecture material on the topic: "${payload.courseTitle}". Course Code: ${payload.courseCode}. Format in clean Markdown.`;
              const result = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
              const textContent = result.text;
              if (!textContent) throw new Error("AI engine failed to output data.");
              payload.textContent = textContent;
              payload.fileUrl = null;
              payload.storagePath = null;
          } else {
              if (formFile) {
                  const { url, path } = await uploadDocument(formFile, 'past_questions');
                  payload.fileUrl = url;
                  payload.storagePath = path;
              }
          }
          
          payload.status = 'approved';
          if (!editingItem) payload.createdAt = new Date().toISOString();

          if (editingItem) await updateDoc(doc(db, 'questions', editingItem.id), payload);
          else await addDoc(collection(db, 'questions'), payload);
          
          setIsModalOpen(false);
          fetchContent();
          showNotification(isAiMode ? "AI Intelligence Catalogued." : "Archive Updated.", "success");
      } catch (e: any) { showNotification(e.message || "Failed to commit record.", "error"); }
      finally { setIsSubmitting(false); }
  };

  return (
    <div className="animate-fade-in space-y-10 pb-20 max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white">Academic Archives</h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Verified repository of study aids and past assessments.</p>
            </div>
            <button onClick={() => openModal()} className="px-10 py-4 bg-indigo-600 text-white font-black rounded-3xl hover:bg-indigo-700 shadow-2xl shadow-indigo-500/20 transition-all active:scale-95 uppercase tracking-widest text-[10px] flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 4v16m8-8H4" /></svg>
                Ingest Material
            </button>
        </header>

        {loading ? <div className="text-center py-20 font-black uppercase text-slate-400 tracking-[0.3em]">Decoding Archives...</div> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {contentItems.map(item => (
                    <div key={item.id} className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col group relative">
                        {item.textContent && <div className="absolute top-6 right-6 bg-emerald-500 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-emerald-500/30">AI Neural Link</div>}
                        <div className="mb-6 flex justify-between items-start">
                            <span className="text-[10px] font-black uppercase text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-xl border border-indigo-100/50 dark:border-indigo-800/50">{item.courseCode}</span>
                            <span className="text-[10px] font-black text-slate-300 uppercase">{item.level}L • {item.year}</span>
                        </div>
                        <h4 className="font-black text-lg text-slate-900 dark:text-white line-clamp-2 leading-tight mb-2 group-hover:text-indigo-600 transition-colors font-serif">{item.courseTitle}</h4>
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-8 tracking-widest">{item.category}</p>
                        <div className="mt-auto flex gap-2 pt-6 border-t border-slate-50 dark:border-slate-800">
                            <button onClick={() => openModal(item)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl hover:bg-indigo-100 transition-all">Edit</button>
                            <button onClick={() => handleDeleteContent(item)} className="px-4 py-3 text-rose-500 bg-rose-50 dark:bg-rose-900/30 rounded-2xl hover:bg-rose-500 hover:text-white transition-all"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {isModalOpen && (
            <div className="fixed inset-0 bg-slate-950/90 z-[100] flex items-center justify-center p-6 backdrop-blur-md" onClick={() => setIsModalOpen(false)}>
                <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] w-full max-w-xl overflow-hidden shadow-2xl border border-white/5 animate-pop-in" onClick={e => e.stopPropagation()}>
                    <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                        <h3 className="font-black text-2xl dark:text-white font-serif">{editingItem ? 'Refine Archive' : 'New Intake'}</h3>
                        <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white dark:bg-slate-700 rounded-full text-slate-400 hover:text-rose-500 transition-colors shadow-sm">✕</button>
                    </div>
                    <form onSubmit={handleFormSubmit} className="p-8 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
                        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4">
                            <button type="button" onClick={() => setIsAiMode(false)} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${!isAiMode ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-lg' : 'text-slate-500'}`}>Physical File</button>
                            <button type="button" onClick={() => setIsAiMode(true)} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${isAiMode ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500'}`}>AI Synthesis</button>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">{isAiMode ? 'Topic of Inquiry' : 'Course Title'}</label>
                            <input className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold dark:text-white" value={formData.courseTitle || ''} onChange={e => setFormData({...formData, courseTitle: e.target.value})} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Reference Code</label>
                                <input className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold dark:text-white uppercase text-xs" value={formData.courseCode || ''} onChange={e => setFormData({...formData, courseCode: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Category Type</label>
                                <select className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black text-[10px] uppercase tracking-widest outline-none dark:text-white" value={formData.category || 'Past Question'} onChange={e => setFormData({...formData, category: e.target.value})}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Study Level</label>
                                <select className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black text-[10px] uppercase tracking-widest outline-none dark:text-white" value={formData.level ?? 100} onChange={e => setFormData({...formData, level: e.target.value})}>{LEVELS.map(l => <option key={l} value={l}>{l === 'General' ? l : `${l} Level`}</option>)}</select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Semester Cycle</label>
                                <select className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black text-[10px] uppercase tracking-widest outline-none dark:text-white" value={formData.semester || 'N/A'} onChange={e => setFormData({...formData, semester: e.target.value})}><option value="N/A">General</option><option value="1">Alpha (1st)</option><option value="2">Omega (2nd)</option></select>
                            </div>
                        </div>
                        {!isAiMode && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Academic Year</label>
                                    <input 
                                        type="number" 
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold dark:text-white" 
                                        value={formData.year ?? ''} 
                                        onChange={e => setFormData({...formData, year: e.target.value ? Number(e.target.value) : undefined})} 
                                        required 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Vault File</label>
                                    <label className="flex items-center justify-center w-full p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem] cursor-pointer hover:border-indigo-500 transition-all">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">{formFile ? 'Locked: ' + formFile.name : 'Upload PDF/Document'}</span>
                                        <input type="file" className="hidden" onChange={e => e.target.files && setFormFile(e.target.files[0])} accept=".pdf,.doc,.docx" />
                                    </label>
                                </div>
                            </div>
                        )}
                        <button type="submit" disabled={isSubmitting} className={`w-full py-5 text-white font-black rounded-3xl shadow-xl uppercase tracking-widest text-xs transition-all active:scale-95 ${isAiMode ? 'bg-emerald-600 shadow-emerald-500/20 hover:bg-emerald-700' : 'bg-indigo-600 shadow-indigo-500/20 hover:bg-indigo-700'}`}>
                            {isSubmitting ? 'Syncing...' : (isAiMode ? 'Commence Neural Synthesis' : 'Commit to Archive')}
                        </button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};