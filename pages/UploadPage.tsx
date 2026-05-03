import React, { useState, FormEvent, useRef, useEffect, useContext } from 'react';
import { Level } from '../types';
import { LEVELS } from '../constants';
import { useSettings } from '../contexts/SettingsContext';
import { uploadFileToFirebase, uploadDocument, uploadToImgBB, trackAiUsage, handleFirestoreError, OperationType } from '../utils/api';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Groq } from 'groq-sdk';
import { useNavigate } from 'react-router-dom';

type UploadType = 'select' | 'document' | 'images' | 'text' | 'ai' | 'link';

const CATEGORIES = ["Past Question", "Test Question", "Lecture Note", "Handout", "Textbook", "Other"];

export const UploadPage: React.FC = () => {
    const auth = useContext(AuthContext);
    const { showNotification } = useNotification();
    const { siteSettings } = useSettings();
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
    const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    
    // Specific Fields
    const [file, setFile] = useState<File | null>(null);
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [externalLink, setExternalLink] = useState('');
    const [textContent, setTextContent] = useState('');
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const [zoomImage, setZoomImage] = useState<string | null>(null);
    
    // Processing State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<string>(''); 
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);
    const [existingQuestions, setExistingQuestions] = useState<any[]>([]);

    const canUseAi = (auth?.user?.contributionPoints || 0) >= 500;
    const isAiMode = uploadType === 'ai';

    useEffect(() => {
        const checkDuplicates = async () => {
            if (!courseCode || courseCode.length < 3) {
                setExistingQuestions([]);
                return;
            }

            try {
                const q = query(
                    collection(db, 'questions'),
                    where('courseCode', '==', courseCode.toUpperCase().replace(/\s/g, '')),
                    where('year', '==', year),
                    where('category', '==', category)
                );
                const querySnapshot = await getDocs(q);
                const matches = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setExistingQuestions(matches);
            } catch (error) {
                console.error("Duplicate check failed:", error);
            }
        };

        const timer = setTimeout(checkDuplicates, 500);
        return () => clearTimeout(timer);
    }, [courseCode, year, category]);

    const resetForm = () => {
        setFile(null);
        setImageFiles([]);
        setExternalLink('');
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
                difficulty,
                tags,
                uploadedBy: auth.user.id,
                uploadedByEmail: auth.user.email,
                uploadedByName: auth.user.username,
                status: 'pending',
                createdAt: new Date().toISOString()
            };

            if (uploadType === 'document') {
                if (!file) throw new Error("Please pick a file first.");
                setUploadStatus('Sending File...');
                const { url, path } = await uploadDocument(file, siteSettings.uploadService, siteSettings.driveFolderId, setUploadProgress);
                questionData.fileUrl = url;
                questionData.storagePath = path;
            } else if (uploadType === 'images') {
                if (imageFiles.length === 0) throw new Error("Please pick images first.");
                const imageUrls: string[] = [];
                for (let i = 0; i < imageFiles.length; i++) {
                    setUploadStatus(`Sending photo ${i + 1}/${imageFiles.length}...`);
                    
                    let url = '';
                    if (siteSettings.uploadService === 'firebase') {
                         const result = await uploadFileToFirebase(imageFiles[i], 'questions/images', (p) => {
                            const totalProgress = 10 + Math.round(((i + p / 100) / imageFiles.length) * 80);
                            setUploadProgress(totalProgress);
                         });
                         url = result.url;
                    } else {
                         url = await uploadToImgBB(imageFiles[i], (p) => {
                            const totalProgress = 10 + Math.round(((i + p / 100) / imageFiles.length) * 80);
                            setUploadProgress(totalProgress);
                         });
                    }
                    imageUrls.push(url);
                }
                questionData.fileUrl = imageUrls[0];
                questionData.pages = imageUrls;
            } else if (uploadType === 'text') {
                if (!textContent.trim()) throw new Error("Please type something first.");
                questionData.textContent = textContent;
            } else if (uploadType === 'link') {
                if (!externalLink.trim()) throw new Error("Please paste a link first.");
                questionData.fileUrl = externalLink.trim();
                questionData.storagePath = null;
            } else if (uploadType === 'ai') {
                if (!canUseAi) throw new Error("You don't have enough points for AI.");
                setUploadStatus('AI helper is writing...');
                const apiKey = process.env.GROQ_API_KEY || "";
                if (!apiKey) throw new Error("AI helper is currently unavailable.");
                const groq = new Groq({
                    apiKey: apiKey,
                    dangerouslyAllowBrowser: true,
                });
                const prompt = `Generate comprehensive, university-level study notes/lecture material on the topic: "${courseTitle}". Format in clean Markdown. Include a summary, key concepts, detailed explanation, and conclusion.`;
                const response = await groq.chat.completions.create({
                    model: "llama-3.1-8b-instant",
                    messages: [{ role: "user", content: prompt }],
                });
                trackAiUsage();
                const aiText = response.choices[0].message.content;
                if (!aiText) throw new Error("AI failed to create content.");
                questionData.textContent = aiText;
            }

            setUploadStatus('Saving progress...');
            try {
                await addDoc(collection(db, 'questions'), questionData);
            } catch (e) {
                handleFirestoreError(e, OperationType.CREATE, 'questions');
            }
            
            showNotification('Success! File sent for approval.', 'success');
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

    const addTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            if (!tags.includes(tagInput.trim())) {
                setTags([...tags, tagInput.trim()]);
            }
            setTagInput('');
        }
    };

    const removeTag = (tag: string) => {
        setTags(tags.filter(t => t !== tag));
    };

    const SelectionScreen = () => (
        <div className="max-w-6xl mx-auto animate-fade-in py-16 px-6">
            <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border border-indigo-100 dark:border-indigo-800">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                    Study Materials Portal
                </div>
                <h1 className="text-5xl md:text-7xl font-serif font-black text-slate-900 dark:text-white mb-6 tracking-tight">Share Your Materials.</h1>
                <p className="text-slate-500 dark:text-slate-400 text-xl font-medium max-w-2xl mx-auto">Choose how you want to contribute to the student study collection.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <button onClick={() => setUploadType('document')} className="group p-10 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-slate-100 dark:border-slate-800 hover:border-indigo-600 transition-all hover:-translate-y-4 shadow-2xl shadow-indigo-100 dark:shadow-none text-left relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>
                    </div>
                    <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-10 group-hover:scale-110 transition-transform shadow-inner">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Upload Document</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed font-medium">Upload PDF files, lecture notes, or textbooks from your device.</p>
                </button>

                <button onClick={() => setUploadType('images')} className="group p-10 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-slate-100 dark:border-slate-800 hover:border-emerald-600 transition-all hover:-translate-y-4 shadow-2xl shadow-emerald-100 dark:shadow-none text-left relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c0 1.1.9-2 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                    </div>
                    <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-10 group-hover:scale-110 transition-transform shadow-inner">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Snap a Photo</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed font-medium">Upload photos of your physical notes or board work.</p>
                </button>

                <button onClick={() => setUploadType('text')} className="group p-10 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-slate-100 dark:border-slate-800 hover:border-amber-600 transition-all hover:-translate-y-4 shadow-2xl shadow-amber-100 dark:shadow-none text-left relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    </div>
                    <div className="w-20 h-20 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mb-10 group-hover:scale-110 transition-transform shadow-inner">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Type a Note</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed font-medium">Type up summaries or key points directly here.</p>
                </button>

                <button onClick={() => setUploadType('link')} className="group p-10 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-slate-100 dark:border-slate-800 hover:border-sky-600 transition-all hover:-translate-y-4 shadow-2xl shadow-sky-100 dark:shadow-none text-left relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>
                    </div>
                    <div className="w-20 h-20 bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 rounded-2xl flex items-center justify-center mb-10 group-hover:scale-110 transition-transform shadow-inner">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4">External Link</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed font-medium">Link files from Google Drive, Mega, or OneDrive.</p>
                </button>

                <button 
                    onClick={() => canUseAi && setUploadType('ai')} 
                    className={`group p-10 rounded-[3rem] border-2 transition-all hover:-translate-y-4 shadow-2xl text-left relative overflow-hidden ${canUseAi ? 'bg-slate-950 border-indigo-500/30 hover:border-indigo-500 shadow-indigo-900/20' : 'bg-slate-100 dark:bg-slate-800 border-transparent opacity-60 cursor-not-allowed'}`}
                >
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                         <svg className="w-32 h-32 text-indigo-400" fill="currentColor" viewBox="0 0 24 24"><path d="M21 10.12h-6.78l2.74-2.82c-2.73-2.7-7.15-2.8-9.88-.1-2.73 2.71-2.73 7.08 0 9.79s7.15 2.71 9.88 0C18.32 15.65 19 14.1 19 12.38h2c0 2.26-.88 4.2-2.3 5.61l-1.42-1.42c1.1-1.1 1.72-2.57 1.72-4.19 0-3.31-2.69-6-6-6-3.31 0-6 2.69-6 6s2.69 6 6 6c1.33 0 2.56-.44 3.55-1.18l1.45 1.45C16.92 20.31 15.06 21 13 21c-4.41 0-8-3.59-8-8s3.59-8 8-8c2.21 0 4.21.9 5.66 2.34l2.34-2.34V10.12z"/></svg>
                    </div>
                    <div className="w-20 h-20 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mb-10 group-hover:scale-110 transition-transform shadow-inner border border-indigo-500/20">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <h3 className={`text-3xl font-black mb-4 ${canUseAi ? 'text-white' : 'text-slate-400'}`}>AI Summary</h3>
                    <p className={`text-lg leading-relaxed font-medium ${canUseAi ? 'text-indigo-200' : 'text-slate-500'}`}>Use AI to automatically write study notes for any topic.</p>
                    {!canUseAi && <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase rounded-full tracking-widest border border-amber-500/20">Locked: Need 500 Credits</div>}
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
                <h2 className="text-3xl font-serif font-black text-slate-900 dark:text-white mb-3">Course Details</h2>
                <p className="text-slate-500 dark:text-slate-400 text-xl font-medium mb-12">Please fill in the course information correctly.</p>

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
                                    <span className="text-2xl font-black text-slate-800 dark:text-white leading-tight">{file ? file.name : "Click to select a file"}</span>
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

                        {uploadType === 'link' && (
                            <div className="space-y-6">
                                <div className="w-20 h-20 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-[2rem] flex items-center justify-center mx-auto mb-4 shadow-lg">
                                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                </div>
                                <div className="space-y-3">
                                    <label className="block text-sm font-black uppercase tracking-widest text-slate-400 text-center">Paste Resource URL</label>
                                    <input 
                                        type="url" 
                                        className="w-full p-6 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 focus:border-rose-500 rounded-[2rem] outline-none font-bold text-lg dark:text-white transition-all text-center" 
                                        placeholder="https://drive.google.com/..." 
                                        value={externalLink} 
                                        onChange={e => setExternalLink(e.target.value)} 
                                        required 
                                    />
                                    <p className="text-[10px] font-black uppercase text-slate-400 text-center tracking-widest">Supports Google Drive, Mega, Dropbox, etc.</p>
                                </div>
                            </div>
                        )}

                        {uploadType === 'ai' && (
                            <div className="py-20 text-center">
                                <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-[2.5rem] mx-auto flex items-center justify-center text-emerald-500 shadow-2xl mb-8 animate-pulse border border-slate-100 dark:border-slate-800"><svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
                                <p className="text-2xl font-black text-slate-800 dark:text-slate-100">AI is ready to write</p>
                                <p className="text-sm font-black uppercase text-slate-400 mt-3 tracking-[0.3em]">Fill in the topic below to start</p>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="block text-sm font-black uppercase tracking-[0.2em] text-slate-400 ml-3">Difficulty Level</label>
                            <select value={difficulty} onChange={e => setDifficulty(e.target.value as any)} className="w-full p-6 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-indigo-500 rounded-[2rem] font-bold text-lg outline-none dark:text-white appearance-none cursor-pointer">
                                <option value="Beginner">Beginner</option>
                                <option value="Intermediate">Intermediate</option>
                                <option value="Advanced">Advanced</option>
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="block text-sm font-black uppercase tracking-[0.2em] text-slate-400 ml-3">Tags (Press Enter)</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={tagInput} 
                                    onChange={e => setTagInput(e.target.value)} 
                                    onKeyDown={addTag}
                                    className="w-full p-6 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-indigo-500 rounded-[2rem] outline-none font-bold text-lg dark:text-white transition-all shadow-sm" 
                                    placeholder="e.g. taxation, budgeting" 
                                />
                                <div className="flex flex-wrap gap-2 mt-3 px-3">
                                    {tags.map(t => (
                                        <span key={t} className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase rounded-full flex items-center gap-2">
                                            {t}
                                            <button type="button" onClick={() => removeTag(t)} className="hover:text-rose-500">&times;</button>
                                        </span>
                                    ))}
                                </div>
                            </div>
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

                    {existingQuestions.length > 0 && (
                        <div className="p-8 bg-amber-50 dark:bg-amber-900/20 rounded-[2.5rem] border border-amber-200 dark:border-amber-800 animate-fade-in">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900 flex items-center justify-center rounded-full text-amber-600 dark:text-amber-400">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                </div>
                                <h3 className="font-black text-amber-900 dark:text-amber-200 uppercase tracking-widest text-sm">Similar Resources Found</h3>
                            </div>
                            <p className="text-amber-800 dark:text-amber-300 text-sm mb-4 font-medium">The following resources already exist for this course, year, and category. Please ensure you are not uploading a duplicate.</p>
                            <div className="space-y-3">
                                {existingQuestions.map((q, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-amber-900/50 shadow-sm">
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-900 dark:text-white text-xs">{q.courseCode} - {q.year}</span>
                                            <span className="text-[10px] text-slate-500 truncate max-w-[200px]">{q.courseTitle}</span>
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-500">{q.category}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
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
                        disabled={isSubmitting || (uploadType === 'document' && !file) || (uploadType === 'images' && imageFiles.length === 0) || (uploadType === 'text' && !textContent.trim()) || (uploadType === 'link' && !externalLink.trim())} 
                        className={`w-full py-7 text-white font-black rounded-[2.5rem] shadow-3xl transition-all active:scale-95 uppercase tracking-[0.3em] text-sm ${isAiMode ? 'bg-emerald-600 shadow-emerald-500/40' : (uploadType === 'link' ? 'bg-rose-600 shadow-rose-500/40' : 'bg-indigo-600 shadow-indigo-500/40')} disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                        {isSubmitting ? 'Uploading...' : 'Submit File'}
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