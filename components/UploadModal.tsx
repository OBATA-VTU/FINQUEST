
import React, { useState, FormEvent, useRef, useEffect, useContext } from 'react';
import { Level } from '../types';
import { LEVELS } from '../constants';
import { uploadWithFallback, uploadToImgBB } from '../utils/api';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (newQuestion: any) => void;
}

type UploadType = 'select' | 'document' | 'images';

const CATEGORIES = ["Past Question", "Lecture Note", "Handout", "Textbook", "Other"];

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUpload }) => {
    const auth = useContext(AuthContext);
    const { showNotification } = useNotification();
    const [uploadType, setUploadType] = useState<UploadType>('select');
    
    // Common Fields
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
    
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) {
            setUploadType('select');
            setFile(null);
            setImageFiles([]);
            setCourseCode('');
            setCourseTitle('');
            setLecturer('');
            setCategory("Past Question");
            setIsUploading(false);
        }
    }, [isOpen]);

    const handleDocumentSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!courseCode || !courseTitle || !file || !auth?.user) {
            showNotification('Please fill all fields.', 'error');
            return;
        }

        setIsUploading(true);

        try {
            const { url, path } = await uploadWithFallback(file, 'past_questions', (progress, status) => {
                setUploadProgress(progress);
                setUploadStatus(status);
            });

            setUploadStatus('Saving record...');
            
            const questionData = {
                courseCode: courseCode.toUpperCase(), courseTitle, lecturer, level, year, category, fileUrl: url, storagePath: path,
                uploadedBy: auth.user.id, uploadedByEmail: auth.user.email, status: 'pending', createdAt: new Date().toISOString()
            };

            const docRef = await addDoc(collection(db, 'questions'), questionData);
            onUpload({ ...questionData, id: docRef.id });
            showNotification('Document submitted for approval!', 'success');
            onClose();

        } catch (error: any) {
            console.error("Upload error:", error);
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
            for (let i = 0; i < imageFiles.length; i++) {
                setUploadStatus(`Uploading image ${i + 1}/${imageFiles.length}...`);
                const url = await uploadToImgBB(imageFiles[i]);
                imageUrls.push(url);
                setUploadProgress(10 + Math.round(((i + 1) / imageFiles.length) * 80));
            }

            setUploadStatus('Finalizing...');
            const questionData = {
                courseCode: courseCode.toUpperCase(), courseTitle, lecturer, level, year, category, fileUrl: imageUrls[0], pages: imageUrls,
                uploadedBy: auth.user.id, uploadedByEmail: auth.user.email, status: 'pending', createdAt: new Date().toISOString()
            };

            const docRef = await addDoc(collection(db, 'questions'), questionData);
            onUpload({ ...questionData, id: docRef.id });
            showNotification('Images submitted for approval!', 'success');
            onClose();

        } catch (error: any) {
             console.error("Upload error:", error);
             showNotification(`Failed: ${error.message}`, "error");
        } finally {
            setIsUploading(false);
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[80] flex justify-center items-center p-4" onClick={onClose}>
            <div ref={modalRef} className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-down transition-colors max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="bg-indigo-900 px-8 py-6 flex justify-between items-center text-white shrink-0"><h2 className="text-xl font-bold font-serif">Contribute Material</h2><button onClick={onClose} className="text-white/70 hover:text-white">✕</button></div>

                <div className="p-8 overflow-y-auto">
                    {uploadType === 'select' && (
                        <div className="space-y-4">
                            <button onClick={() => setUploadType('document')} className="w-full p-6 border-2 border-slate-200 hover:border-indigo-500 rounded-xl flex items-center gap-4 group"><div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div><div className="text-left"><h3 className="font-bold text-slate-800 group-hover:text-indigo-600">Document (PDF/Word)</h3><p className="text-xs text-slate-500">For typed documents.</p></div></button>
                            <button onClick={() => setUploadType('images')} className="w-full p-6 border-2 border-slate-200 hover:border-emerald-500 rounded-xl flex items-center gap-4 group"><div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div><div className="text-left"><h3 className="font-bold text-slate-800 group-hover:text-emerald-600">Images (Photos)</h3><p className="text-xs text-slate-500">For photos of exam papers.</p></div></button>
                        </div>
                    )}

                    {uploadType !== 'select' && (
                        <form onSubmit={uploadType === 'document' ? handleDocumentSubmit : handleImageSubmit} className="space-y-5">
                            <button type="button" onClick={() => setUploadType('select')} className="text-xs font-bold text-slate-400 hover:text-indigo-500">&larr; Back to Selection</button>
                            
                            <div className={`relative border-2 border-dashed rounded-xl p-6 text-center ${dragActive ? 'border-indigo-500' : 'border-slate-300'}`} onDragEnter={handleDrag} onDrop={handleDrop} onDragLeave={handleDrag} onDragOver={handleDrag}>
                                {uploadType === 'document' ? (<><input id="f" type="file" className="hidden" onChange={(e) => e.target.files && setFile(e.target.files[0])} accept=".pdf,.doc,.docx" /><label htmlFor="f" className="cursor-pointer">{file ? file.name : "Click or drag document"}</label></>) : (<><input id="f-img" type="file" className="hidden" multiple onChange={(e) => e.target.files && setImageFiles(Array.from(e.target.files))} accept="image/*" /><label htmlFor="f-img" className="cursor-pointer">{imageFiles.length > 0 ? `${imageFiles.length} images selected` : "Click or drag images"}</label></>)}
                            </div>

                            <div><label className="block text-xs font-bold text-slate-700 uppercase mb-1">Category</label><select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-slate-700 uppercase mb-1">Code</label><input type="text" value={courseCode} onChange={e => setCourseCode(e.target.value)} required className="w-full p-2 border border-slate-300 rounded-lg" placeholder="FIN 101" /></div>
                                <div><label className="block text-xs font-bold text-slate-700 uppercase mb-1">Level</label><select value={level} onChange={e => setLevel(Number(e.target.value) as Level)} className="w-full p-2 border border-slate-300 rounded-lg">{LEVELS.map(l => <option key={l} value={l}>{l}L</option>)}</select></div>
                            </div>
                            <div><label className="block text-xs font-bold text-slate-700 uppercase mb-1">Course Title</label><input type="text" value={courseTitle} onChange={e => setCourseTitle(e.target.value)} required className="w-full p-2 border border-slate-300 rounded-lg" placeholder="e.g. Intro to Finance" /></div>
                            <div><label className="block text-xs font-bold text-slate-700 uppercase mb-1">Lecturer (Optional)</label><input type="text" value={lecturer} onChange={e => setLecturer(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" placeholder="e.g. Dr. A. A. Adebayo" /></div>
                            <div><label className="block text-xs font-bold text-slate-700 uppercase mb-1">Year</label><input type="number" value={year} onChange={e => setYear(Number(e.target.value))} required className="w-full p-2 border border-slate-300 rounded-lg" /></div>
                            
                            {isUploading && <div className="space-y-1"><div className="flex justify-between text-xs font-bold text-indigo-600"><span>{uploadStatus}</span><span>{Math.round(uploadProgress)}%</span></div><div className="w-full bg-slate-200 rounded-full h-2"><div className="bg-indigo-600 h-full rounded-full" style={{ width: `${uploadProgress}%` }}></div></div></div>}
                            
                            <div className="flex justify-end pt-4 gap-3">
                                <button type="button" onClick={onClose} disabled={isUploading} className="px-5 py-2.5 rounded-lg border text-slate-600 font-bold">Cancel</button>
                                <button type="submit" disabled={isUploading || (uploadType === 'document' ? !file : imageFiles.length === 0)} className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-bold disabled:opacity-50">Submit</button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
