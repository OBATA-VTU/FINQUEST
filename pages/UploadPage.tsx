
import React, { useState, FormEvent, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Level } from '../types';
import { LEVELS } from '../constants';
import { uploadFile, uploadToImgBB } from '../utils/api';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

type UploadType = 'select' | 'document' | 'images';
const CATEGORIES = ["Past Question", "Lecture Note", "Handout", "Textbook", "Other"];

export const UploadPage: React.FC = () => {
    const auth = useContext(AuthContext);
    const { showNotification } = useNotification();
    const navigate = useNavigate();
    const [uploadType, setUploadType] = useState<UploadType>('select');
    
    // Form fields
    const [courseCode, setCourseCode] = useState('');
    const [courseTitle, setCourseTitle] = useState('');
    const [lecturer, setLecturer] = useState('');
    const [level, setLevel] = useState<Level>(auth?.user?.level || 100);
    const [year, setYear] = useState(new Date().getFullYear());
    const [category, setCategory] = useState("Past Question");
    
    const [file, setFile] = useState<File | null>(null);
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<string>(''); 
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);

    const handleDocumentSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!courseCode || !courseTitle || !file || !auth?.user) {
            showNotification('Please fill all fields.', 'error');
            return;
        }
        setIsUploading(true);
        setUploadStatus('Starting upload...');
        setUploadProgress(5);
        try {
            const { url, path } = await uploadFile(file, 'past_questions', (progress) => {
                setUploadProgress(progress);
                setUploadStatus('Uploading Document...');
            });
            setUploadStatus('Saving record...');
            const questionData = {
                courseCode: courseCode.toUpperCase(), courseTitle, lecturer, level, year, category,
                fileUrl: url, storagePath: path, uploadedBy: auth.user.id, uploadedByEmail: auth.user.email,
                status: 'pending', createdAt: new Date().toISOString()
            };
            await addDoc(collection(db, 'questions'), questionData);
            showNotification('Document uploaded for review!', 'success');
            navigate('/questions');
        } catch (error: any) {
            showNotification(`Failed: ${error.message}`, "error");
        } finally {
            setIsUploading(false);
        }
    };

    const handleImageSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!courseCode || !courseTitle || imageFiles.length === 0 || !auth?.user) {
            showNotification('Please fill all fields and select images.', 'error');
            return;
        }
        setIsUploading(true);
        setUploadStatus('Uploading images...');
        setUploadProgress(10);
        try {
            const imageUrls: string[] = [];
            const total = imageFiles.length;
            for (let i = 0; i < total; i++) {
                setUploadStatus(`Uploading image ${i + 1} of ${total}...`);
                const url = await uploadToImgBB(imageFiles[i]);
                imageUrls.push(url);
                setUploadProgress(10 + Math.round(((i + 1) / total) * 80));
            }
            setUploadStatus('Finalizing...');
            const questionData = {
                courseCode: courseCode.toUpperCase(), courseTitle, lecturer, level, year, category,
                fileUrl: imageUrls[0], pages: imageUrls, uploadedBy: auth.user.id, uploadedByEmail: auth.user.email,
                status: 'pending', createdAt: new Date().toISOString()
            };
            await addDoc(collection(db, 'questions'), questionData);
            showNotification('Images uploaded for review!', 'success');
            navigate('/questions');
        } catch (error: any) {
             showNotification(`Failed: ${error.message}`, "error");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            if (uploadType === 'document') setFile(e.dataTransfer.files[0]);
            else if (uploadType === 'images') setImageFiles(Array.from(e.dataTransfer.files));
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex justify-center items-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transition-colors max-h-[90vh]">
                <div className="bg-indigo-900 dark:bg-slate-950 px-8 py-6 flex justify-between items-center text-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold font-serif">Contribute Material</h2>
                        <p className="text-indigo-200 text-xs">Upload past questions or notes for review.</p>
                    </div>
                    <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-8 max-h-[calc(90vh-100px)] overflow-y-auto">
                    {uploadType === 'select' && (
                        <div className="space-y-4">
                            <button onClick={() => setUploadType('document')} className="w-full p-6 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl flex items-center gap-4 group transition-all">
                                <div><h3 className="font-bold text-slate-800 dark:text-white group-hover:text-indigo-600">Document (PDF / Word)</h3><p className="text-xs text-slate-500 dark:text-slate-400">Best for typed documents or single PDF files.</p></div>
                            </button>
                            <button onClick={() => setUploadType('images')} className="w-full p-6 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl flex items-center gap-4 group transition-all">
                                <div><h3 className="font-bold text-slate-800 dark:text-white group-hover:text-emerald-600">Images (Photos)</h3><p className="text-xs text-slate-500 dark:text-slate-400">Best for photos of exam papers. Upload multiple pages.</p></div>
                            </button>
                        </div>
                    )}
                    {uploadType !== 'select' && (
                        <form onSubmit={uploadType === 'document' ? handleDocumentSubmit : handleImageSubmit} className="space-y-5">
                            <button type="button" onClick={() => setUploadType('select')} className="text-xs font-bold text-slate-400 hover:text-indigo-500 mb-2 flex items-center gap-1">&larr; Back</button>
                            <div className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${dragActive ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'}`} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
                                {uploadType === 'document' ? (<><input id="file-doc" type="file" className="hidden" onChange={(e) => e.target.files && setFile(e.target.files[0])} accept=".pdf,.doc,.docx" />{file ? <div className="flex flex-col items-center"><p className="font-bold text-slate-800 dark:text-white text-sm mb-1">{file.name}</p><button type="button" onClick={() => setFile(null)} className="text-xs text-rose-500 font-bold hover:underline mt-2">Change File</button></div> : <label htmlFor="file-doc" className="cursor-pointer flex flex-col items-center"><p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-1">Click to upload Document</p><p className="text-xs text-slate-500">PDF, DOC, DOCX</p></label>}</>) : (<><input id="file-imgs" type="file" className="hidden" multiple onChange={(e) => e.target.files && setImageFiles(Array.from(e.target.files))} accept="image/*" />{imageFiles.length > 0 ? <div className="flex flex-col items-center"><p className="font-bold text-slate-800 dark:text-white text-sm">{imageFiles.length} Images Selected</p><button type="button" onClick={() => setImageFiles([])} className="text-xs text-rose-500 font-bold hover:underline mt-2">Clear</button></div> : <label htmlFor="file-imgs" className="cursor-pointer flex flex-col items-center"><p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-1">Click to upload Images</p><p className="text-xs text-slate-500">Select multiple photos (JPG, PNG)</p></label>}</>)}
                            </div>
                            <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Category</label><select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg outline-none"><option value="Past Question">Past Question</option><option value="Lecture Note">Lecture Note</option></select></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Code</label><input type="text" value={courseCode} onChange={e => setCourseCode(e.target.value)} required className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white font-bold uppercase" placeholder="FIN 101" /></div>
                                <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Level</label><select value={level} onChange={e => setLevel(Number(e.target.value) as Level)} className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"><option value="100">100L</option><option value="200">200L</option><option value="300">300L</option><option value="400">400L</option></select></div>
                            </div>
                            <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Course Title</label><input type="text" value={courseTitle} onChange={e => setCourseTitle(e.target.value)} required className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="Intro to Business Finance" /></div>
                            <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Year</label><input type="number" value={year} onChange={e => setYear(Number(e.target.value))} required className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white" /></div>
                            {isUploading && <div className="space-y-1"><div className="flex justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400"><span>{uploadStatus}</span><span>{Math.round(uploadProgress)}%</span></div><div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden"><div className="bg-indigo-600 h-full" style={{ width: `${uploadProgress}%` }}></div></div></div>}
                            <div className="flex justify-end pt-4 gap-3">
                                <button type="button" onClick={() => navigate(-1)} disabled={isUploading} className="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold">Cancel</button>
                                <button type="submit" disabled={isUploading || (uploadType === 'document' ? !file : imageFiles.length === 0)} className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-md disabled:opacity-50">Submit Upload</button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
