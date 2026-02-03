
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

const CATEGORIES = ["Past Question", "Lecture Note", "Handout", "Textbook", "Other"];

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
    
    // Processing State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<string>(''); 
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);

    const canUseAi = (auth?.user?.contributionPoints || 0) >= 500;
    const isAdmin = ['admin', 'librarian', 'vice_president', 'supplement'].includes(auth?.user?.role || '');

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
                courseCode: courseCode.toUpperCase(),
                courseTitle,
                lecturer,
                level: level === 'General' ? 'General' : Number(level),
                year,
                semester: semester === 'N/A' ? 'N/A' : Number(semester),
                category,
                uploadedBy: auth.user.id,
                uploadedByEmail: auth.user.email,
                uploadedByName: auth.user.username,
                status: 'pending', // User uploads always require approval
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

        const newText = 
            textContent.substring(0, start) + 
            prefix + 
            (selectedText || '') + 
            suffix + 
            textContent.substring(end);

        setTextContent(newText);
        
        setTimeout(() => {
            textarea.focus();
            if (selectedText) {
                textarea.setSelectionRange(start + prefix.length, end + prefix.length);
            } else {
                textarea.setSelectionRange(start + prefix.length, start + prefix.length);
            }
        }, 0);
    };

    const renderTextEditor = () => (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
            <div className="p-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-1 bg-slate-50 dark:bg-slate-800 flex-wrap">
                <button type="button" onClick={() => applyFormat('bold')} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 w-9 h-9 flex items-center justify-center font-bold" title="Bold">B</button>
                <button type="button" onClick={() => applyFormat('italic')} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 w-9 h-9 flex items-center justify-center italic font-serif" title="Italic">I</button>
                <button type="button" onClick={() => applyFormat('strike')} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 w-9 h-9 flex items-center justify-center line-through" title="Strikethrough">S</button>
                <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                <button type="button" onClick={() => applyFormat('h2')} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 w-9 h-9 flex items-center justify-center font-bold text-sm" title="Heading">H2</button>
                <button type="button" onClick={() => applyFormat('ul')} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 w-9 h-9 flex items-center justify-center" title="List Item">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" /></svg>
                </button>
            </div>
            <textarea 
                ref={textAreaRef}
                className="w-full h-64 p-4 resize-none bg-transparent outline-none text-slate-700 dark:text-slate-200" 
                placeholder="Type your material here... Use the tools above for formatting." 
                value={textContent} 
                onChange={e => setTextContent(e.target.value)} 
                required 
            />
        </div>
    );

    const renderChoice = (type: UploadType, icon: React.ReactNode, title: string, desc: string, enabled = true, special = false) => (
        <button 
            onClick={() => enabled && setUploadType(type)}
            disabled={!enabled}
            className={`w-full p-6 border-2 rounded-2xl flex items-center gap-4 group transition-all text-left relative overflow-hidden ${enabled ? 'hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer' : 'opacity-50 cursor-not-allowed'} ${special ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20' : 'border-slate-200 dark:border-slate-700'}`}
        >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-300 ${special ? 'bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300' : 'bg-indigo-100 dark:bg-indigo-900'}`}>{icon}</div>
            <div>
                <h3 className="font-bold text-slate-800 dark:text-white group-hover:text-indigo-600">{title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
            </div>
            {!enabled && <div className="absolute top-2 right-2 text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">500+ Pts Required</div>}
        </button>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4">
            <div className="container mx-auto max-w-2xl">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">Contribute Material</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Share your resources and earn contribution points.</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700">
                    {uploadType === 'select' ? (
                        <div className="space-y-4 animate-fade-in">
                            {/* NEW: Removed the old "send to PRO" message for documents */}
                            {renderChoice('document', <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, "Upload Document", "PDF, Word, etc. (Direct Upload)")}
                            {renderChoice('images', <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>, "Upload Images", "Photos of exam papers")}
                            {renderChoice('text', <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>, "Type Out Material", "Manually type notes or questions")}
                            {renderChoice('ai', <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>, "Generate with AI", "Create notes on any topic", canUseAi, true)}
                        </div>
                    ) : (
                        <form onSubmit={handleFormSubmit} className="space-y-5 animate-fade-in-up">
                            <button type="button" onClick={() => setUploadType('select')} className="text-xs font-bold text-slate-400 hover:text-indigo-500 flex items-center gap-1">&larr; Back</button>
                            
                            {/* DYNAMIC UPLOAD AREA */}
                            {uploadType === 'document' && <div className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all ${dragActive ? 'border-indigo-500' : 'border-slate-300'}`} onDragEnter={handleDrag} onDrop={handleDrop} onDragLeave={handleDrag} onDragOver={handleDrag}><input id="f" type="file" className="hidden" onChange={(e) => e.target.files && setFile(e.target.files[0])} accept=".pdf,.doc,.docx" /><label htmlFor="f" className="cursor-pointer">{file ? file.name : "Click or drag document"}</label></div>}
                            {uploadType === 'images' && <div className={`relative border-2 border-dashed rounded-xl p-6 text-center ${dragActive ? 'border-indigo-500' : 'border-slate-300'}`} onDragEnter={handleDrag} onDrop={handleDrop} onDragLeave={handleDrag} onDragOver={handleDrag}><input id="f-img" type="file" className="hidden" multiple onChange={(e) => e.target.files && setImageFiles(Array.from(e.target.files))} accept="image/*" /><label htmlFor="f-img" className="cursor-pointer">{imageFiles.length > 0 ? `${imageFiles.length} images selected` : "Click or drag images"}</label></div>}
                            {uploadType === 'text' && renderTextEditor()}
                            {uploadType === 'ai' && <div className="bg-amber-50 p-4 rounded-xl text-center text-amber-800 text-sm font-medium">AI will generate content based on the Course Title you provide below.</div>}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Code</label><input type="text" value={courseCode} onChange={e => setCourseCode(e.target.value)} required className="w-full p-3 border rounded-xl" placeholder="FIN 101" /></div>
                                <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Title</label><input type="text" value={courseTitle} onChange={e => setCourseTitle(e.target.value)} required className="w-full p-3 border rounded-xl" placeholder="e.g. Intro to Finance" /></div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Level</label><select value={level} onChange={e => setLevel(e.target.value)} className="w-full p-3 border rounded-xl bg-white">{LEVELS.map(l => <option key={l} value={l}>{typeof l === 'number' ? `${l}L` : l}</option>)}</select></div>
                                <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Semester</label><select value={semester} onChange={e => setSemester(e.target.value as any)} className="w-full p-3 border rounded-xl bg-white"><option value="N/A">Not Specified</option><option value="1">1st Semester</option><option value="2">2nd Semester</option></select></div>
                            </div>

                            <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Lecturer (Optional)</label><input type="text" value={lecturer} onChange={e => setLecturer(e.target.value)} className="w-full p-3 border rounded-xl" placeholder="e.g. Dr. A. Adebayo" /></div>
                            
                            {isSubmitting && <div className="space-y-1"><div className="flex justify-between text-xs font-bold text-indigo-600"><span>{uploadStatus}</span><span>{Math.round(uploadProgress)}%</span></div><div className="w-full bg-slate-200 rounded-full h-2"><div className="bg-indigo-600 h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div></div></div>}

                            <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50">{isSubmitting ? 'Submitting...' : 'Submit Contribution'}</button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};