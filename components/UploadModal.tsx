import React, { useState, FormEvent, useRef, useEffect, useContext } from 'react';
import { PastQuestion, Level } from '../types';
import { LEVELS } from '../constants';
import { uploadFile } from '../utils/api';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (newQuestion: any) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUpload }) => {
    const auth = useContext(AuthContext);
    const [courseCode, setCourseCode] = useState('');
    const [courseTitle, setCourseTitle] = useState('');
    const [level, setLevel] = useState<Level>(100);
    const [year, setYear] = useState(new Date().getFullYear());
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    
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
            alert('Please fill all fields.');
            return;
        }

        try {
            setIsUploading(true);
            
            // 1. Upload File
            const downloadUrl = await uploadFile(file);

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

            alert('Upload successful! It will appear after admin approval.');

            // Reset
            setCourseCode('');
            setCourseTitle('');
            setLevel(100);
            setYear(new Date().getFullYear());
            setFile(null);
            onClose();

        } catch (error) {
            console.error("Upload error:", error);
            alert("Failed to upload. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        setFile(e.target.files[0]);
      }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
            onClick={onClose}
        >
            <div 
                ref={modalRef}
                className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg m-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-indigo-800">Upload Past Question</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="courseCode" className="block text-sm font-medium text-slate-700">Course Code</label>
                        <input type="text" id="courseCode" value={courseCode} onChange={e => setCourseCode(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="e.g. FIN 101" />
                    </div>
                    <div>
                        <label htmlFor="courseTitle" className="block text-sm font-medium text-slate-700">Course Title</label>
                        <input type="text" id="courseTitle" value={courseTitle} onChange={e => setCourseTitle(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="e.g. Introduction to Finance" />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label htmlFor="level" className="block text-sm font-medium text-slate-700">Level</label>
                            <select id="level" value={level} onChange={e => setLevel(Number(e.target.value) as Level)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                        <div className="flex-1">
                            <label htmlFor="year" className="block text-sm font-medium text-slate-700">Year</label>
                            <input type="number" id="year" value={year} onChange={e => setYear(Number(e.target.value))} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">File (PDF, Image, Doc)</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <div className="flex text-sm text-slate-600">
                                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                                        <span>Upload a file</span>
                                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                                    </label>
                                    <p className="pl-1">or drag and drop</p>
                                </div>
                                {file ? <p className="text-xs text-slate-500">{file.name}</p> : <p className="text-xs text-slate-500">PDF, Docs, Images up to 10MB</p>}
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button type="button" onClick={onClose} disabled={isUploading} className="bg-white py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">Cancel</button>
                        <button type="submit" disabled={isUploading} className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 flex items-center">
                            {isUploading && <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                            {isUploading ? 'Uploading...' : 'Upload'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};