
import React, { useState, FormEvent, useRef, useEffect, useContext } from 'react';
import { Level } from '../types';
import { LEVELS } from '../constants';
import { uploadFile } from '../utils/api';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (newQuestion: any) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUpload }) => {
    const auth = useContext(AuthContext);
    const { showNotification } = useNotification();
    const [courseCode, setCourseCode] = useState('');
    const [courseTitle, setCourseTitle] = useState('');
    const [level, setLevel] = useState<Level>(100);
    const [year, setYear] = useState(new Date().getFullYear());
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);
    
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);
    
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!courseCode || !courseTitle || !file || !auth?.user) {
            showNotification('Please fill all fields.', 'error');
            return;
        }

        try {
            setIsUploading(true);
            setUploadProgress(1); // Start indicator

            // 1. Upload File with Progress Callback
            const downloadUrl = await uploadFile(file, 'past_questions', (progress) => {
                setUploadProgress(Math.round(progress));
            });

            // 2. Create Data Object
            const questionData = {
                courseCode: courseCode.toUpperCase(),
                courseTitle,
                level,
                year,
                fileUrl: downloadUrl,
                uploadedBy: auth.user.id,
                uploadedByEmail: auth.user.email,
                status: 'pending', // Requires admin approval
                createdAt: new Date().toISOString()
            };

            // 3. Save to Firestore
            const docRef = await addDoc(collection(db, 'questions'), questionData);

            // 4. Notify Parent
            onUpload({ ...questionData, id: docRef.id });

            showNotification('Upload successful! Awaiting admin approval.', 'success');

            // Reset
            setCourseCode('');
            setCourseTitle('');
            setLevel(100);
            setYear(new Date().getFullYear());
            setFile(null);
            setUploadProgress(0);
            onClose();

        } catch (error) {
            console.error("Upload error:", error);
            showNotification("Failed to upload. Please try again.", "error");
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };
    
    const validateAndSetFile = (selectedFile: File) => {
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png',
            'image/jpg'
        ];

        if (!allowedTypes.includes(selectedFile.type)) {
            showNotification("Invalid file type. Please use PDF, DOC, or Images.", "error");
            return;
        }

        if (selectedFile.size > 10 * 1024 * 1024) {
             showNotification("File size exceeds 10MB limit.", "error");
             return;
        }

        setFile(selectedFile);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) validateAndSetFile(e.target.files[0]);
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
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
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
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-down"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-indigo-900 px-8 py-6 flex justify-between items-center text-white">
                    <div>
                        <h2 className="text-xl font-bold font-serif">Contribute Material</h2>
                        <p className="text-indigo-200 text-xs">Help your peers by archiving past questions.</p>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                    
                    {/* File Drop Zone */}
                    <div 
                        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                        
                        {file ? (
                            <div className="flex flex-col items-center">
                                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <p className="font-bold text-slate-800 text-sm">{file.name}</p>
                                <p className="text-xs text-slate-500 mb-3">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                <button type="button" onClick={() => setFile(null)} className="text-xs text-rose-500 font-bold hover:underline">Remove File</button>
                            </div>
                        ) : (
                            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                                <svg className="w-10 h-10 text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                <p className="text-sm font-bold text-indigo-600 mb-1">Click to upload</p>
                                <p className="text-xs text-slate-500">or drag and drop PDF, DOC, Images</p>
                            </label>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Code</label>
                            <input type="text" value={courseCode} onChange={e => setCourseCode(e.target.value)} required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 uppercase placeholder-slate-400" placeholder="FIN 101" />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Level</label>
                            <select value={level} onChange={e => setLevel(Number(e.target.value) as Level)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                                {LEVELS.map(l => <option key={l} value={l}>{l}L</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Course Title</label>
                        <input type="text" value={courseTitle} onChange={e => setCourseTitle(e.target.value)} required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Introduction to Business Finance" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Year</label>
                        <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>

                    {/* Progress Bar */}
                    {isUploading && (
                        <div className="space-y-1">
                             <div className="flex justify-between text-xs font-bold text-indigo-600">
                                <span>Uploading...</span>
                                <span>{uploadProgress}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-4 gap-3">
                        <button type="button" onClick={onClose} disabled={isUploading} className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition-colors">Cancel</button>
                        <button type="submit" disabled={isUploading || !file} className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                            {isUploading ? 'Processing...' : 'Submit Upload'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
