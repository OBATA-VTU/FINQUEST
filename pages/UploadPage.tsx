
import React, { useState, FormEvent, useRef, useEffect, useContext } from 'react';
import { Level } from '../types';
import { LEVELS } from '../constants';
import { uploadDocument, uploadToImgBB, trackAiUsage } from '../utils/api';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { GoogleGenAI } from "@google/genai";
import { useNavigate } from 'react-router-dom';

type UploadType = 'select' | 'document' | 'images' | 'text' | 'ai';

const CATEGORIES = ["Past Question", "Test Question", "Lecture Note", "Handout", "Textbook", "Other"];

export const UploadPage: React.FC = () => {
    const auth = useContext(AuthContext);
    const { showNotification } = useNotification();
    const navigate = useNavigate();

    const [uploadType, setUploadType] = useState<UploadType>('select');
    
    // Common Fields
    const [courseCode, setCourseCode] = useState('');
    const [courseTitle, setCourseTitle] = useState('');
    const [lecturer, setLecturer] = useState('');
    const [level, setLevel] = useState<Level | string>(auth?.user?.level?.toString() || '100');
    const [year, setYear] = useState(new Date().getFullYear());
    const [semester, setSemester] = useState<'1' | '2' | 'N/A'>('N/A');
    const [category, setCategory] = useState("Past Question");
    
    // Specific Fields
    const [file, setFile] = useState<File | null>(null);
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [textContent, setTextContent] = useState('');
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const [zoomImage, setZoomImage] = useState<string | null>(null);
    
    // Processing State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<string>(''); 
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);

    const canUseAi = (auth?.user?.contributionPoints || 0) >= 500;
    const isAiMode = uploadType === 'ai';

    const resetForm = () => {
        setFile(null);
        setImageFiles([]);
        setTextContent('');
        setCourseCode('');
        setCourseTitle('');
        setLecturer('');
        setCategory("Past Question");
        setIsSubmitting(false);
    };

    const handleFormSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!courseCode || !courseTitle || !auth?.user) {
            showNotification('Course Code and Title are required.', 'error');
            return;
        }

        setIsSubmitting(true);
        setUploadStatus('Starting...');
        setUploadProgress(5);

        try {
            const questionData: any = {
                courseCode: courseCode.toUpperCase().replace(/\s/g, ''),
                courseTitle: courseTitle.trim(),
                lecturer: lecturer.trim(),
                level: level === 'General' ? 'General' : Number(level),
                year,
                semester: semester === 'N/A' ? 'N/A' : Number(semester),
                category,
                uploadedBy: auth.user.id,
                uploadedByEmail: auth.user.email,
                uploadedByName: auth.user.username,
                status: 'pending',
                createdAt: new Date().toISOString()
            };

            if (uploadType === 'document') {
                if (!file) throw new Error("Document file not selected.");
                setUploadStatus('Uploading Document...');
                const { url, path } = await uploadDocument(file, 'past_questions', setUploadProgress);
                questionData.fileUrl = url;
                questionData.storagePath = path;
            } else if (uploadType === 'images') {
                if (imageFiles.length === 0) throw new Error("No images selected.");
                const imageUrls: string[] = [];
                for (let i = 0; i < imageFiles.length; i++) {
                    setUploadStatus(`Uploading image ${i + 1}/${imageFiles.length}...`);
                    const url = await uploadToImgBB(imageFiles[i]);
                    imageUrls.push(url);
                    setUploadProgress(10 + Math.round(((i + 1) / imageFiles.length) * 80));
                }
                questionData.fileUrl = imageUrls[0];
                questionData.pages = imageUrls;
            } else if (uploadType === 'text') {
                if (!textContent.trim()) throw new Error("Text content cannot be empty.");
                questionData.textContent = textContent;
            } else if (uploadType === 'ai') {
                if (!canUseAi) throw new Error("Insufficient points for AI generation.");
                setUploadStatus('Generating with AI...');
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const prompt = `Generate comprehensive, university-level study notes/lecture material on the topic: "${courseTitle}". Format in clean Markdown. Include a summary, key concepts, detailed explanation, and conclusion.`;
                const result = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
                trackAiUsage();
                const aiText = result.text;
                if (!aiText) throw new Error("AI failed to generate content.");
                questionData.textContent = aiText;
            }

            setUploadStatus('Saving record...');
            await addDoc(collection(db, 'questions'), questionData);
            
            showNotification('Contribution submitted for approval!', 'success');
            resetForm();
            setUploadType('select');

        } catch (error: any) {
            console.error("Upload error:", error);
            showNotification(`Failed: ${error.message}`, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.type === "dragenter" || e.type === "dragover") setDragActive(true); else if (e.type === "dragleave") setDragActive(false); };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            if (uploadType === 'document') setFile(e.dataTransfer.files[0]);
            else if (uploadType === 'images') setImageFiles(Array.from(e.dataTransfer.files));
        }
    };

    const applyFormat = (format: 'bold' | 'italic' | 'strike' | 'h2' | 'ul') => {
        const textarea = textAreaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textContent.substring(start, end);
        let prefix = '', suffix = '';
        switch (format) {
            case 'bold': prefix = '**'; suffix = '**'; break;
            case 'italic': prefix = '_'; suffix = '_'; break;
            case 'strike': prefix = '~~'; suffix = '~~'; break;
            case 'h2': prefix = '\n## '; suffix = '\n'; break;
            case 'ul': prefix = '\n- '; suffix = ''; break;
        }
        const newText = textContent.substring(0, start) + prefix + (selectedText || '') + suffix + textContent.substring(end);
        setTextContent(newText);
        setTimeout(() => {
            textarea.focus();
            if (selectedText) textarea.setSelectionRange(start + prefix.length, end + prefix.length);
            else textarea.setSelectionRange(start + prefix.length, start + prefix.length);
        }, 0);
    };

    const renderTextEditor = () => (
        <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-inner">
            <div className="p-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-1 bg-slate-50 dark:bg-slate-800 flex-wrap">
                {['bold', 'italic', 'strike', 'h2', 'ul'].map((f) => (
                    <button key={f} type="button" onClick={() => applyFormat(f as any)} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 w-9 h-9 flex items-center justify-center font-bold text-xs uppercase tracking-tighter transition-colors">{f.charAt(0)}</button>
                ))}
            </div>
            <textarea 
                ref={textAreaRef}
                className="w-full h-48 p-4 resize-none bg-transparent outline-none text-slate-700 dark:text-slate-200 text-sm font-medium" 
                placeholder="Compose your material here..." 
                value={textContent} 
                onChange={e => setTextContent(e.target.value)} 
                required 
            />
        </div>
    );

    const removeImage = (index: number) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 transition-colors">
            <div className="container mx-auto max-w-4xl">
                <div className="text-center mb-12 animate-fade-in-down">
                    <span className="text-indigo-600 font-black tracking-[0.3em] uppercase text-[10px] block mb-3">Academic Contribution</span>
                    <h1 className="text-4xl md:text-6xl font-serif font-black text-slate-900 dark:text-white">Expand the Vault</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-3 text-lg font-light leading-relaxed max-w-xl mx-auto">Your shared resources empower thousands of peers. Select your ingestion method below.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Method Selector / Sidebar */}
                    <div className="lg:col-span-4 space-y-3">
                        {(['document', 'images', 'text', 'ai'] as UploadType[]).map((type) => {
                            const icons = {
                                document: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
                                images: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
                                text: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
                                ai: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            };
                            const labels = { document: "Official PDF", images: "Photo Gallery", text: "Typed Intel", ai: "AI Synthesis" };
                            const active = uploadType === type;
                            const locked = type === 'ai' && !canUseAi;

                            return (
                                <button 
                                    key={type} 
                                    onClick={() => !locked && setUploadType(type)}
                                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${active ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-600/20 translate-x-2' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 hover:border-indigo-500'} ${locked ? 'opacity-40 cursor-not-allowed' : ''}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2.5 rounded-xl ${active ? 'bg-white/20' : 'bg-slate-50 dark:bg-slate-800'}`}>{icons[type]}</div>
                                        <span className="font-black text-[10px] uppercase tracking-widest">{labels[type]}</span>
                                    </div>
                                    {locked && <div className="w-2 h-2 bg-rose-500 rounded-full"></div>}
                                </button>
                            );
                        })}
                    </div>

                    {/* Main Form Area */}
                    <div className="lg:col-span-8">
                        <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-10 shadow-2xl border border-slate-100 dark:border-slate-800 animate-slide-in-up">
                            {uploadType === 'select' ? (
                                <div className="h-64 flex items-center justify-center text-center">
                                    <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Select Ingestion Method to Proceed</p>
                                </div>
                            ) : (
                                <form onSubmit={handleFormSubmit} className="space-y-6">
                                    {/* Upload Source Area */}
                                    <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                                        {uploadType === 'document' && (
                                            <div 
                                                className={`relative border-2 border-dashed rounded-3xl p-10 text-center transition-all ${dragActive ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-300 dark:border-slate-700'}`}
                                                onDragEnter={handleDrag} onDrop={handleDrop} onDragLeave={handleDrag} onDragOver={handleDrag}
                                            >
                                                <input id="f" type="file" className="hidden" onChange={(e) => e.target.files && setFile(e.target.files[0])} accept=".pdf,.doc,.docx" />
                                                <label htmlFor="f" className="cursor-pointer flex flex-col items-center gap-3">
                                                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-md text-indigo-600"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 4v16m8-8H4" /></svg></div>
                                                    <span className="font-bold text-slate-800 dark:text-white">{file ? file.name : "Attach Document (PDF/DOC)"}</span>
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Max size 15MB • One file per upload</p>
                                                </label>
                                            </div>
                                        )}
                                        {uploadType === 'images' && (
                                            <div className="space-y-6">
                                                <div 
                                                    className={`relative border-2 border-dashed rounded-3xl p-10 text-center ${dragActive ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-300 dark:border-slate-700'}`}
                                                    onDragEnter={handleDrag} onDrop={handleDrop} onDragLeave={handleDrag} onDragOver={handleDrag}
                                                >
                                                    <input id="f-img" type="file" className="hidden" multiple onChange={(e) => e.target.files && setImageFiles(Array.from(e.target.files))} accept="image/*" />
                                                    <label htmlFor="f-img" className="cursor-pointer flex flex-col items-center gap-3">
                                                        <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-md text-indigo-600"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>
                                                        <span className="font-bold text-slate-800 dark:text-white">Drop Photos of Inquiries</span>
                                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Multiple selection supported</p>
                                                    </label>
                                                </div>
                                                
                                                {/* Image Preview Thumbnails */}
                                                {imageFiles.length > 0 && (
                                                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 animate-fade-in">
                                                        {imageFiles.map((f, i) => (
                                                            <div key={i} className="relative group aspect-square">
                                                                <img 
                                                                    src={URL.createObjectURL(f)} 
                                                                    className="w-full h-full object-cover rounded-xl border border-white dark:border-slate-800 shadow-sm cursor-zoom-in" 
                                                                    alt="thumb" 
                                                                    onClick={() => setZoomImage(URL.createObjectURL(f))}
                                                                />
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => removeImage(i)}
                                                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg transform scale-0 group-hover:scale-100 transition-transform"
                                                                >
                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path d="M6 18L18 6M6 6l12 12" /></svg>
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {uploadType === 'text' && renderTextEditor()}
                                        {uploadType === 'ai' && (
                                            <div className="py-10 text-center">
                                                <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-3xl mx-auto flex items-center justify-center text-emerald-500 shadow-xl mb-4 animate-bounce-slow"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Neural Link Active</p>
                                                <p className="text-[10px] font-black uppercase text-slate-400 mt-1 tracking-widest">Generating High-Fidelity Study Intelligence</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Metadata Section */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-2">Reference Code</label>
                                            <input type="text" value={courseCode} onChange={e => setCourseCode(e.target.value)} required className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-indigo-500 rounded-2xl outline-none font-black text-xs uppercase" placeholder="FIN 201" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-2">Full Course Title</label>
                                            <input type="text" value={courseTitle} onChange={e => setCourseTitle(e.target.value)} required className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-sm" placeholder="e.g. Portfolio Management" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-2">Academic Level</label>
                                            <select value={level} onChange={e => setLevel(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-sm outline-none">{LEVELS.map(l => <option key={l} value={l}>{typeof l === 'number' ? `${l}L` : l}</option>)}</select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-2">Category</label>
                                            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-sm outline-none">{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select>
                                        </div>
                                    </div>

                                    {!isAiMode && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-2">Semester Cycle</label>
                                                <select value={semester} onChange={e => setSemester(e.target.value as any)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-sm outline-none"><option value="N/A">General</option><option value="1">Alpha (1st)</option><option value="2">Omega (2nd)</option></select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-2">Calendar Year</label>
                                                <input type="number" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-sm outline-none" value={year} onChange={e => setYear(Number(e.target.value))} required />
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-2">Lecturer / Source</label>
                                        <input type="text" value={lecturer} onChange={e => setLecturer(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-sm" placeholder="e.g. Dr. Sidiku" />
                                    </div>
                                    
                                    {isSubmitting && (
                                        <div className="space-y-2 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl animate-pulse">
                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                                                <span>{uploadStatus}</span>
                                                <span>{Math.round(uploadProgress)}%</span>
                                            </div>
                                            <div className="w-full bg-indigo-100 dark:bg-indigo-950 rounded-full h-1.5 overflow-hidden"><div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div></div>
                                        </div>
                                    )}

                                    <button 
                                        type="submit" 
                                        disabled={isSubmitting || (uploadType === 'document' && !file) || (uploadType === 'images' && imageFiles.length === 0) || (uploadType === 'text' && !textContent.trim())} 
                                        className={`w-full py-5 text-white font-black rounded-[2rem] shadow-2xl transition-all active:scale-95 uppercase tracking-[0.2em] text-[10px] ${isAiMode ? 'bg-emerald-600 shadow-emerald-500/30' : 'bg-indigo-600 shadow-indigo-500/30'} disabled:opacity-30`}
                                    >
                                        {isSubmitting ? 'Syncing Intel...' : 'Finalize Submission'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Lightbox / Preview Modal */}
            {zoomImage && (
                <div className="fixed inset-0 bg-slate-950/95 z-[100] flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setZoomImage(null)}>
                    <div className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setZoomImage(null)} className="absolute top-4 right-4 bg-white/10 hover:bg-rose-500 text-white p-3 rounded-full transition-all shadow-2xl z-10"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M6 18L18 6M6 6l12 12" /></svg></button>
                        <img src={zoomImage} className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-3xl animate-pop-in" alt="zoom" />
                        <p className="mt-8 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Preview Mode • Click outside to exit</p>
                    </div>
                </div>
            )}
        </div>
    );
};
