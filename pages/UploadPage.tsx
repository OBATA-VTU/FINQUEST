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
        setUploadType('select');
    };

    const handleFormSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!courseCode || !courseTitle || !auth?.user) {
            showNotification('Course Code and Title are required.', 'error');
            return;
        }

        setIsSubmitting(true);
        setUploadStatus('Connecting...');
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
                if (!file) throw new Error("Please pick a file first.");
                setUploadStatus('Sending Document...');
                const { url, path } = await uploadDocument(file, 'past_questions', setUploadProgress);
                questionData.fileUrl = url;
                questionData.storagePath = path;
            } else if (uploadType === 'images') {
                if (imageFiles.length === 0) throw new Error("Please pick images first.");
                const imageUrls: string[] = [];
                for (let i = 0; i < imageFiles.length; i++) {
                    setUploadStatus(`Sending image ${i + 1}/${imageFiles.length}...`);
                    const url = await uploadToImgBB(imageFiles[i]);
                    imageUrls.push(url);
                    setUploadProgress(10 + Math.round(((i + 1) / imageFiles.length) * 80));
                }
                questionData.fileUrl = imageUrls[0];
                questionData.pages = imageUrls;
            } else if (uploadType === 'text') {
                if (!textContent.trim()) throw new Error("Text content is empty.");
                questionData.textContent = textContent;
            } else if (uploadType === 'ai') {
                if (!canUseAi) throw new Error("You don't have enough points for AI.");
                setUploadStatus('AI is writing...');
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const prompt = `Generate comprehensive, university-level study notes/lecture material on the topic: "${courseTitle}". Format in clean Markdown. Include a summary, key concepts, detailed explanation, and conclusion.`;
                const result = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
                trackAiUsage();
                const aiText = result.text;
                if (!aiText) throw new Error("AI failed to create content.");
                questionData.textContent = aiText;
            }

            setUploadStatus('Saving to archive...');
            await addDoc(collection(db, 'questions'), questionData);
            
            showNotification('Success! Sent for approval.', 'success');
            resetForm();

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

    const removeImage = (index: number) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
    };

    const SelectionScreen = () => (
        <div className="max-w-4xl mx-auto animate-fade-in py-10 px-4">
            <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-serif font-black text-slate-900 dark:text-white mb-4">What are you uploading?</h1>
                <p className="text-slate-600 dark:text-slate-400 text-xl font-medium">Choose a method to start sharing your academic resources.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <button onClick={() => setUploadType('document')} className="group p-10 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-slate-100 dark:border-slate-800 hover:border-indigo-600 transition-all hover:-translate-y-2 shadow-xl shadow-slate-200/50 dark:shadow-none text-left">
                    <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3">Upload PDF Document</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed">Choose a single PDF or Word file from your phone or computer.</p>
                </button>

                <button onClick={() => setUploadType('images')} className="group p-10 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-slate-100 dark:border-slate-800 hover:border-emerald-600 transition-all hover:-translate-y-2 shadow-xl shadow-slate-200/50 dark:shadow-none text-left">
                    <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3">Upload Photos</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed">Select pictures of question papers or lecture notes from your gallery.</p>
                </button>

                <button onClick={() => setUploadType('text')} className="group p-10 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-slate-100 dark:border-slate-800 hover:border-amber-600 transition-all hover:-translate-y-2 shadow-xl shadow-slate-200/50 dark:shadow-none text-left">
                    <div className="w-20 h-20 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3">Type Manually</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed">Type your summary or past question text directly into the portal.</p>
                </button>

                <button 
                    onClick={() => canUseAi && setUploadType('ai')} 
                    className={`group p-10 rounded-[3rem] border-2 transition-all hover:-translate-y-2 shadow-xl shadow-slate-200/50 dark:shadow-none text-left ${canUseAi ? 'bg-slate-900 border-indigo-500/30 hover:border-indigo-500' : 'bg-slate-100 dark:bg-slate-800 border-transparent opacity-60 cursor-not-allowed'}`}
                >
                    <div className="w-20 h-20 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-inner">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <h3 className={`text-2xl font-black mb-3 ${canUseAi ? 'text-white' : 'text-slate-400'}`}>Generate using AI</h3>
                    <p className={`text-lg leading-relaxed ${canUseAi ? 'text-indigo-200' : 'text-slate-500'}`}>Use artificial intelligence to create high-quality study notes for you.</p>
                    {!canUseAi && <span className="mt-6 inline-block px-5 py-2 bg-amber-500/10 text-amber-500 text-xs font-black uppercase rounded-full tracking-widest">Locked: Needs 500 Points</span>}
                </button>
            </div>
        </div>
    );

    const UploadForm = () => (
        <div className="max-w-4xl mx-auto animate-slide-in-up py-10 px-4">
            <button onClick={() => setUploadType('select')} className="mb-10 flex items-center gap-3 text-indigo-600 dark:text-indigo-400 font-black uppercase text-sm tracking-widest hover:translate-x-[-4px] transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 19l-7-7 7-7" /></svg>
                Back to Selection
            </button>

            <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-10 md:p-16 shadow-2xl border border-slate-100 dark:border-slate-800">
                <h2 className="text-3xl font-serif font-black text-slate-900 dark:text-white mb-3">Upload Details</h2>
                <p className="text-slate-500 dark:text-slate-400 text-xl font-medium mb-12">Please provide correct information for the archive.</p>

                <form onSubmit={handleFormSubmit} className="space-y-10">
                    {/* Method Specific Input Area */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                        {uploadType === 'document' && (
                            <div 
                                className={`relative border-2 border-dashed rounded-[2.5rem] p-16 text-center transition-all ${dragActive ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-300 dark:border-slate-700'}`}
                                onDragEnter={handleDrag} onDrop={handleDrop} onDragLeave={handleDrag} onDragOver={handleDrag}
                            >
                                <input id="f" type="file" className="hidden" onChange={(e) => e.target.files && setFile(e.target.files[0])} accept=".pdf,.doc,.docx" />
                                <label htmlFor="f" className="cursor-pointer flex flex-col items-center gap-5">
                                    <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-md text-indigo-600 border dark:border-slate-700"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 4v16m8-8H4" /></svg></div>
                                    <span className="text-2xl font-black text-slate-800 dark:text-white leading-tight">{file ? file.name : "Tap to pick PDF or Word file"}</span>
                                    <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Maximum size: 15MB</p>
                                </label>
                            </div>
                        )}
                        
                        {uploadType === 'images' && (
                            <div className="space-y-10">
                                <div 
                                    className={`relative border-2 border-dashed rounded-[2.5rem] p-16 text-center ${dragActive ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-300 dark:border-slate-700'}`}
                                    onDragEnter={handleDrag} onDrop={handleDrop} onDragLeave={handleDrag} onDragOver={handleDrag}
                                >
                                    <input id="f-img" type="file" className="hidden" multiple onChange={(e) => e.target.files && setImageFiles(Array.from(e.target.files))} accept="image/*" />
                                    <label htmlFor="f-img" className="cursor-pointer flex flex-col items-center gap-5">
                                        <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-md text-indigo-600 border dark:border-slate-700"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>
                                        <span className="text-2xl font-black text-slate-800 dark:text-white leading-tight">Tap to choose photos</span>
                                        <p className="text-sm font-bold uppercase tracking-widest text-slate-400">You can pick multiple images at once</p>
                                    </label>
                                </div>
                                
                                {imageFiles.length > 0 && (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-5 animate-fade-in">
                                        {imageFiles.map((f, i) => (
                                            <div key={i} className="relative group aspect-square">
                                                <img 
                                                    src={URL.createObjectURL(f)} 
                                                    className="w-full h-full object-cover rounded-3xl border-4 border-white dark:border-slate-800 shadow-2xl cursor-zoom-in hover:brightness-110 transition-all" 
                                                    alt="thumb" 
                                                    onClick={() => setZoomImage(URL.createObjectURL(f))}
                                                />
                                                <button 
                                                    type="button" 
                                                    onClick={() => removeImage(i)}
                                                    className="absolute -top-3 -right-3 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-xl transform scale-1 hover:bg-rose-600 active:scale-90 transition-all z-10"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {uploadType === 'text' && (
                            <div className="border-2 border-slate-200 dark:border-slate-700 rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-900 shadow-inner">
                                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3 bg-slate-50 dark:bg-slate-800 flex-wrap">
                                    {['bold', 'italic', 'strike', 'h2', 'ul'].map((f) => (
                                        <button key={f} type="button" onClick={() => applyFormat(f as any)} className="p-3 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 w-12 h-12 flex items-center justify-center font-black text-sm uppercase tracking-tighter transition-colors text-slate-600 dark:text-slate-300 border border-transparent hover:border-slate-300 dark:hover:border-slate-600">{f.charAt(0)}</button>
                                    ))}
                                </div>
                                <textarea 
                                    ref={textAreaRef}
                                    className="w-full h-96 p-8 resize-none bg-transparent outline-none text-slate-700 dark:text-slate-200 text-xl font-medium leading-relaxed" 
                                    placeholder="Type or paste your information here..." 
                                    value={textContent} 
                                    onChange={e => setTextContent(e.target.value)} 
                                    required 
                                />
                            </div>
                        )}

                        {uploadType === 'ai' && (
                            <div className="py-20 text-center">
                                <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-[2.5rem] mx-auto flex items-center justify-center text-emerald-500 shadow-2xl mb-8 animate-pulse border border-slate-100 dark:border-slate-800"><svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
                                <p className="text-2xl font-black text-slate-800 dark:text-slate-100">AI is ready to write</p>
                                <p className="text-sm font-black uppercase text-slate-400 mt-3 tracking-[0.3em]">Fill the topic below to begin</p>
                            </div>
                        )}
                    </div>

                    {/* Metadata Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="block text-sm font-black uppercase tracking-[0.2em] text-slate-400 ml-3">Course Code</label>
                            <input type="text" value={courseCode} onChange={e => setCourseCode(e.target.value)} required className="w-full p-6 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-600 rounded-[2rem] outline-none font-black text-lg uppercase dark:text-white transition-all shadow-sm" placeholder="e.g. FIN 201" />
                        </div>
                        <div className="space-y-3">
                            <label className="block text-sm font-black uppercase tracking-[0.2em] text-slate-400 ml-3">Full Course Title</label>
                            <input type="text" value={courseTitle} onChange={e => setCourseTitle(e.target.value)} required className="w-full p-6 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-600 rounded-[2rem] outline-none font-bold text-lg dark:text-white transition-all shadow-sm" placeholder="e.g. Corporate Finance" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="block text-sm font-black uppercase tracking-[0.2em] text-slate-400 ml-3">Academic Level</label>
                            <select value={level} onChange={e => setLevel(e.target.value)} className="w-full p-6 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-indigo-500 rounded-[2rem] font-bold text-lg outline-none dark:text-white appearance-none cursor-pointer">{LEVELS.map(l => <option key={l} value={l}>{typeof l === 'number' ? `${l} Level` : l}</option>)}</select>
                        </div>
                        <div className="space-y-3">
                            <label className="block text-sm font-black uppercase tracking-[0.2em] text-slate-400 ml-3">Material Category</label>
                            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-6 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-indigo-500 rounded-[2rem] font-bold text-lg outline-none dark:text-white appearance-none cursor-pointer">{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select>
                        </div>
                    </div>

                    {!isAiMode && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="block text-sm font-black uppercase tracking-[0.2em] text-slate-400 ml-3">Semester</label>
                                <select value={semester} onChange={e => setSemester(e.target.value as any)} className="w-full p-6 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-indigo-500 rounded-[2rem] font-bold text-lg outline-none dark:text-white cursor-pointer"><option value="N/A">General</option><option value="1">1st Semester (Alpha)</option><option value="2">2nd Semester (Omega)</option></select>
                            </div>
                            <div className="space-y-3">
                                <label className="block text-sm font-black uppercase tracking-[0.2em] text-slate-400 ml-3">Calendar Year</label>
                                <input type="number" className="w-full p-6 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-indigo-500 rounded-[2rem] font-bold text-lg outline-none dark:text-white shadow-sm" value={year} onChange={e => setYear(Number(e.target.value))} required />
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        <label className="block text-sm font-black uppercase tracking-[0.2em] text-slate-400 ml-3">Lecturer Name</label>
                        <input type="text" value={lecturer} onChange={e => setLecturer(e.target.value)} className="w-full p-6 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-indigo-500 rounded-[2rem] outline-none font-bold text-lg dark:text-white transition-all shadow-sm" placeholder="Who taught this course?" />
                    </div>
                    
                    {isSubmitting && (
                        <div className="space-y-5 p-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-[3rem] animate-pulse border border-indigo-100 dark:border-indigo-800">
                            <div className="flex justify-between text-sm font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
                                <span>{uploadStatus}</span>
                                <span>{Math.round(uploadProgress)}%</span>
                            </div>
                            <div className="w-full bg-indigo-100 dark:bg-indigo-950 rounded-full h-2.5 overflow-hidden"><div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div></div>
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={isSubmitting || (uploadType === 'document' && !file) || (uploadType === 'images' && imageFiles.length === 0) || (uploadType === 'text' && !textContent.trim())} 
                        className={`w-full py-7 text-white font-black rounded-[2.5rem] shadow-3xl transition-all active:scale-95 uppercase tracking-[0.3em] text-sm ${isAiMode ? 'bg-emerald-600 shadow-emerald-500/40' : 'bg-indigo-600 shadow-indigo-500/40'} disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                        {isSubmitting ? 'Sending Information...' : 'Finish and Submit'}
                    </button>
                </form>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 transition-colors duration-300">
            {uploadType === 'select' ? SelectionScreen() : UploadForm()}

            {/* Lightbox / Preview Modal */}
            {zoomImage && (
                <div className="fixed inset-0 bg-slate-950/95 z-[100] flex items-center justify-center p-6 backdrop-blur-xl" onClick={() => setZoomImage(null)}>
                    <div className="relative max-w-6xl w-full h-full flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setZoomImage(null)} className="absolute top-6 right-6 bg-white/10 hover:bg-rose-500 text-white p-5 rounded-full transition-all shadow-2xl z-10 active:scale-90"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M6 18L18 6M6 6l12 12" /></svg></button>
                        <img src={zoomImage} className="max-w-full max-h-[80vh] object-contain rounded-[2rem] shadow-3xl animate-pop-in" alt="zoom" />
                        <p className="mt-10 text-xs font-black uppercase tracking-[0.5em] text-slate-400 animate-pulse">Tap outside to close</p>
                    </div>
                </div>
            )}
        </div>
    );
};