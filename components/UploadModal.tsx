
import React, { useState, FormEvent, useRef, useEffect, useContext } from 'react';
import { Level } from '../types';
import { LEVELS } from '../constants';
import { uploadFile, uploadToImgBB } from '../utils/api';
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
    const [level, setLevel] = useState<Level>(100);
    const [year, setYear] = useState(new Date().getFullYear());
    const [category, setCategory] = useState("Past Question");
    
    // Document State
    const [file, setFile] = useState<File | null>(null);

    // Image State
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    
    // Processing State
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<string>(''); 
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);
    
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) {
            // Reset state on close
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
        setUploadStatus('Starting upload...');
        setUploadProgress(5);

        try {
            // Dropbox Upload
            const { url, path } = await uploadFile(file, 'past_questions', (progress) => {
                setUploadProgress(progress);
                setUploadStatus('Uploading Document...');
            });

            setUploadStatus('Saving record...');
            
            const questionData = {
                courseCode: courseCode.toUpperCase(),
                courseTitle,
                lecturer,
                level,
                year,
                category,
                fileUrl: url,
                storagePath: path,
                uploadedBy: auth.user.id,
                uploadedByEmail: auth.user.email,
                status: 'pending',
                createdAt: new Date().toISOString()
            };

            const docRef = await addDoc(collection(db, 'questions'), questionData);
            onUpload({ ...questionData, id: docRef.id });
            showNotification('Document uploaded successfully!', 'success');
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
            const total = imageFiles.length;

            // Upload images one by one or Promise.all.
            for (let i = 0; i < total; i++) {
                setUploadStatus(`Uploading image ${i + 1} of ${total}...`);
                const url = await uploadToImgBB(imageFiles[i]);
                imageUrls.push(url);
                setUploadProgress(10 + Math.round(((i + 1) / total) * 80));
            }

            setUploadStatus('Finalizing...');
            
            const questionData = {
                courseCode: courseCode.toUpperCase(),
                courseTitle,
                lecturer,
                level,
                year,
                category,
                fileUrl: imageUrls[0], // Use first image as main preview/url for backward compatibility
                pages: imageUrls, // Store all images here
                uploadedBy: auth.user.id,
                uploadedByEmail: auth.user.email,
                status: 'pending',
                createdAt: new Date().toISOString()
            };

            const docRef = await addDoc(collection(db, 'questions'), questionData);
            onUpload({ ...questionData, id: docRef.id });
            showNotification('Images uploaded successfully!', 'success');
            onClose();

        } catch (error: any) {
             console.error("Upload error:", error);
             showNotification(`Failed: ${error.message}`, "error");
        } finally {
            setIsUploading(false);
        }
    };

    // Drag & Drop Handlers
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
            if (uploadType === 'document') {
                setFile(e.dataTransfer.files[0]);
            } else if (uploadType === 'images') {
                setImageFiles(Array.from(e.dataTransfer.files));
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[80] flex justify-center items-center p-4"
            onClick={onClose}
        >
            <div 
                ref={modalRef}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-down transition-colors max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-indigo-900 px-8 py-6 flex justify-between items-center text-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold font-serif">Contribute Material</h2>
                        <p className="text-indigo-200 text-xs">Upload past questions or notes.</p>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-8">
                    
                    {/* STEP 1: SELECT TYPE */}
                    {uploadType === 'select' && (
                        <div className="space-y-4">
                            <p className="text-slate-600 dark:text-slate-300 mb-4 text-center font-medium">What format is your material?</p>
                            
                            <button 
                                onClick={() => setUploadType('document')}
                                className="w-full p-6 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl flex items-center gap-4 group transition-all"
                            >
                                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-300">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-slate-800 dark:text-white group-hover:text-indigo-600">Document (PDF / Word)</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Best for typed documents or single PDF files.</p>
                                </div>
                            </button>

                            <button 
                                onClick={() => setUploadType('images')}
                                className="w-full p-6 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl flex items-center gap-4 group transition-all"
                            >
                                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-300">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-slate-800 dark:text-white group-hover:text-emerald-600">Images (Photos)</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Best for photos of exam papers. Upload multiple pages.</p>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* STEP 2: FORMS */}
                    {uploadType !== 'select' && (
                        <form onSubmit={uploadType === 'document' ? handleDocumentSubmit : handleImageSubmit} className="space-y-5">
                            
                            <button type="button" onClick={() => setUploadType('select')} className="text-xs font-bold text-slate-400 hover:text-indigo-500 mb-2 flex items-center gap-1">
                                &larr; Back to Selection
                            </button>

                            {/* FILE INPUT AREA */}
                            <div 
                                className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${dragActive ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'}`}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                            >
                                {uploadType === 'document' ? (
                                    <>
                                        <input id="file-doc" type="file" className="hidden" onChange={(e) => e.target.files && setFile(e.target.files[0])} accept=".pdf,.doc,.docx" />
                                        {file ? (
                                            <div className="flex flex-col items-center">
                                                <p className="font-bold text-slate-800 dark:text-white text-sm mb-1">{file.name}</p>
                                                <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                                <button type="button" onClick={() => setFile(null)} className="text-xs text-rose-500 font-bold hover:underline mt-2">Change File</button>
                                            </div>
                                        ) : (
                                            <label htmlFor="file-doc" className="cursor-pointer flex flex-col items-center">
                                                <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-1">Click to upload Document</p>
                                                <p className="text-xs text-slate-500">PDF, DOC, DOCX</p>
                                            </label>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <input id="file-imgs" type="file" className="hidden" multiple onChange={(e) => e.target.files && setImageFiles(Array.from(e.target.files))} accept="image/*" />
                                        {imageFiles.length > 0 ? (
                                            <div className="flex flex-col items-center">
                                                <div className="flex -space-x-2 mb-2">
                                                    {imageFiles.slice(0, 4).map((f, i) => (
                                                        <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-bold overflow-hidden">
                                                            IMG
                                                        </div>
                                                    ))}
                                                    {imageFiles.length > 4 && <div className="w-8 h-8 rounded-full bg-slate-800 text-white border-2 border-white flex items-center justify-center text-xs font-bold">+{imageFiles.length - 4}</div>}
                                                </div>
                                                <p className="font-bold text-slate-800 dark:text-white text-sm">{imageFiles.length} Images Selected</p>
                                                <button type="button" onClick={() => setImageFiles([])} className="text-xs text-rose-500 font-bold hover:underline mt-2">Clear Selection</button>
                                            </div>
                                        ) : (
                                            <label htmlFor="file-imgs" className="cursor-pointer flex flex-col items-center">
                                                <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-1">Click to upload Images</p>
                                                <p className="text-xs text-slate-500">Select multiple photos (JPG, PNG)</p>
                                            </label>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* FIELDS */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Category</label>
                                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Code</label>
                                    <input type="text" value={courseCode} onChange={e => setCourseCode(e.target.value)} required className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold uppercase" placeholder="FIN 101" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Level</label>
                                    <select value={level} onChange={e => setLevel(Number(e.target.value) as Level)} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                                        {LEVELS.map(l => <option key={l} value={l}>{l}L</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Course Title</label>
                                <input type="text" value={courseTitle} onChange={e => setCourseTitle(e.target.value)} required className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Introduction to Business Finance" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Lecturer (Optional)</label>
                                <input type="text" value={lecturer} onChange={e => setLecturer(e.target.value)} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Dr. A. A. Adebayo" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Year</label>
                                <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} required className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>

                            {isUploading && (
                                <div className="space-y-1">
                                     <div className="flex justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                        <span>{uploadStatus}</span>
                                        <span>{Math.round(uploadProgress)}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                        <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end pt-4 gap-3">
                                <button type="button" onClick={onClose} disabled={isUploading} className="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                                <button type="submit" disabled={isUploading || (uploadType === 'document' ? !file : imageFiles.length === 0)} className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                                    {isUploading ? 'Processing...' : 'Submit Upload'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
