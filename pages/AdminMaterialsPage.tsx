import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';
import { uploadDocument, deleteDocument } from '../utils/api';
import { LEVELS } from '../constants';
import { GoogleGenAI, Type } from "@google/genai";

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

  useEffect(() => {
    fetchContent();
  }, []);

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
      if (!window.confirm("Permanently delete this item?")) return;
      try {
          if (item.storagePath) {
              await deleteDocument(item.storagePath);
          }
          await deleteDoc(doc(db, 'questions', item.id));
          showNotification("Deleted", "info");
          fetchContent();
      } catch (e) { showNotification("Delete failed", "error"); }
  };

  const openModal = (item: any = null) => {
      setEditingItem(item);
      setFormData(item || { level: 100, year: new Date().getFullYear(), semester: 'N/A' });
      setFormFile(null);
      setIsModalOpen(true);
      setIsAiMode(false);
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
              if (!payload.courseTitle) throw new Error("Topic is compulsory for AI generation.");
              const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
              const prompt = `Generate comprehensive, university-level study notes/lecture material on the topic: "${payload.courseTitle}". Course Code: ${payload.courseCode}. Format in clean Markdown.`;
              const result = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
              const textContent = result.text;
              if (!textContent) throw new Error("AI failed to generate content.");
              payload.textContent = textContent;
              payload.fileUrl = null;
              payload.storagePath = null;
          } else {
              if (!editingItem && !formFile) throw new Error("File is required for new materials");
              if (formFile) {
                  const { url, path } = await uploadDocument(formFile, 'past_questions');
                  payload.fileUrl = url;
                  payload.storagePath = path;
              }
          }
          
          payload.status = 'approved';
          if (!editingItem) payload.createdAt = new Date().toISOString();

          if (editingItem) {
              await updateDoc(doc(db, 'questions', editingItem.id), payload);
          } else {
              await addDoc(collection(db, 'questions'), payload);
          }
          setIsModalOpen(false);
          fetchContent();
          showNotification(isAiMode ? "Material generated & saved!" : "Saved successfully", "success");
      } catch (e: any) { showNotification(e.message || "Error saving item", "error"); }
      finally { setIsSubmitting(false); }
  };

  return (
    <div className="animate-fade-in pb-20 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Manage Study Materials</h1>
            <button onClick={() => openModal()} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-700 shadow-md flex items-center gap-2 text-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add New
            </button>
        </div>

        {loading ? <div className="text-center py-12">Loading...</div> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {contentItems.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col relative group hover:border-indigo-200 transition-colors">
                        {item.textContent && <div className="absolute top-4 right-4 bg-emerald-100 text-emerald-600 text-[10px] font-bold px-2 py-1 rounded">AI</div>}
                        <h4 className="font-bold text-slate-800 line-clamp-1 mb-1">{item.courseTitle}</h4>
                        <p className="text-xs text-slate-500 mb-4 flex-1">{item.courseCode} • {item.level}L • {item.year}</p>
                        <div className="mt-auto flex gap-2 pt-2 border-t border-slate-100">
                            <button onClick={() => openModal(item)} className="flex-1 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100">Edit</button>
                            <button onClick={() => handleDeleteContent(item)} className="px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {isModalOpen && (
            <div className="fixed inset-0 bg-slate-900/90 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
                <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                    <div className="p-4 border-b flex justify-between items-center bg-slate-50"><h3 className="font-bold text-lg">Manage Material</h3><button onClick={() => setIsModalOpen(false)} className="p-2 bg-white rounded-full text-slate-500 shadow-sm">✕</button></div>
                    <form onSubmit={handleFormSubmit} className="p-6 space-y-4 overflow-y-auto">
                        <div className="flex gap-4 p-1 bg-slate-100 rounded-lg mb-4"><button type="button" onClick={() => setIsAiMode(false)} className={`flex-1 py-2 rounded-md font-bold text-sm transition-all ${!isAiMode ? 'bg-white text-indigo-600 shadow' : 'text-slate-500'}`}>Upload</button><button type="button" onClick={() => setIsAiMode(true)} className={`flex-1 py-2 rounded-md font-bold text-sm transition-all ${isAiMode ? 'bg-emerald-100 text-emerald-700 shadow' : 'text-slate-500'}`}>AI Generate</button></div>
                        <div><label>{isAiMode ? 'Topic' : 'Course Title'}</label><input className="w-full border p-3 rounded-xl" value={formData.courseTitle || ''} onChange={e => setFormData({...formData, courseTitle: e.target.value})} required /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label>Course Code</label><input className="w-full border p-3 rounded-xl" value={formData.courseCode || ''} onChange={e => setFormData({...formData, courseCode: e.target.value})} required={!isAiMode} /></div>
                            <div><label>Level</label><select className="w-full border p-3 rounded-xl" value={formData.level || '100'} onChange={e => setFormData({...formData, level: e.target.value})}>{LEVELS.map(l => <option key={l} value={l}>{l === 'General' ? l : `${l} Level`}</option>)}</select></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label>Semester</label><select className="w-full border p-3 rounded-xl" value={formData.semester || 'N/A'} onChange={e => setFormData({...formData, semester: e.target.value})}><option value="N/A">Not Specified</option><option value="1">1st</option><option value="2">2nd</option></select></div>
                            {!isAiMode && (<div><label>Year</label><input type="number" className="w-full border p-3 rounded-xl" value={formData.year || ''} onChange={e => setFormData({...formData, year: e.target.value})} required /></div>)}
                        </div>
                        {!isAiMode && <div><label>File</label><input type="file" className="w-full border p-3 rounded-xl" onChange={e => e.target.files && setFormFile(e.target.files[0])} accept=".pdf,.doc,.docx" /></div>}
                        <button type="submit" disabled={isSubmitting} className={`w-full py-3 text-white font-bold rounded-lg ${isAiMode ? 'bg-emerald-600' : 'bg-indigo-600'}`}>{isSubmitting ? (isAiMode ? 'Generating...' : 'Saving...') : (isAiMode ? 'Generate with AI' : 'Save Changes')}</button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};