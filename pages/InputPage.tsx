import React, { useState, FormEvent, useContext } from 'react';
import { uploadDocument } from '../utils/api';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

export const InputPage: React.FC = () => {
    const auth = useContext(AuthContext);
    const { showNotification } = useNotification();

    const [courseCode, setCourseCode] = useState('');
    const [courseTitle, setCourseTitle] = useState('');
    const [file, setFile] = useState<File | null>(null);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<string>('');
    const [uploadProgress, setUploadProgress] = useState(0);

    const resetForm = () => {
        setFile(null);
        setCourseCode('');
        setCourseTitle('');
        setIsSubmitting(false);
        setUploadProgress(0);
        setUploadStatus('');
    };

    const handleFormSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!courseCode || !courseTitle || !file || !auth?.user) {
            showNotification('All fields and a file are required.', 'error');
            return;
        }

        setIsSubmitting(true);
        setUploadStatus('Starting upload...');
        setUploadProgress(5);

        try {
            // Using a separate folder for testing to avoid clutter
            const { url, path } = await uploadDocument(file, 'test_uploads', setUploadProgress);

            const questionData = {
                courseCode: courseCode.toUpperCase(),
                courseTitle,
                level: auth.user.level || 100,
                year: new Date().getFullYear(),
                category: "Past Question",
                fileUrl: url,
                storagePath: path,
                uploadedBy: auth.user.id,
                uploadedByEmail: auth.user.email,
                uploadedByName: auth.user.username,
                status: 'pending',
                createdAt: new Date().toISOString()
            };

            await addDoc(collection(db, 'questions'), questionData);
            
            showNotification('Test upload successful! Submitted for approval.', 'success');
            resetForm();

        } catch (error: any) {
            console.error("Test upload error:", error);
            showNotification(`Upload Failed: ${error.message}`, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-12 px-4 flex items-center justify-center">
            <div className="w-full max-w-lg">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Hidden Document Upload Test</h1>
                    <p className="text-slate-500 dark:text-slate-400">This page is for testing Google Drive uploads for regular users.</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800">
                    <form onSubmit={handleFormSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Course Code</label>
                            <input 
                                type="text" 
                                value={courseCode} 
                                onChange={e => setCourseCode(e.target.value)} 
                                required 
                                className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800" 
                                placeholder="e.g., FIN 201" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Course Title</label>
                            <input 
                                type="text" 
                                value={courseTitle} 
                                onChange={e => setCourseTitle(e.target.value)} 
                                required 
                                className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800" 
                                placeholder="e.g., Corporate Finance" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Document File</label>
                            <input 
                                type="file" 
                                onChange={(e) => e.target.files && setFile(e.target.files[0])} 
                                required 
                                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:bg-slate-800"
                                accept=".pdf,.doc,.docx"
                            />
                        </div>

                        {isSubmitting && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                    <span>{uploadStatus}</span>
                                    <span>{Math.round(uploadProgress)}%</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2.5 dark:bg-slate-700">
                                    <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                                </div>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={isSubmitting} 
                            className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Uploading...' : 'Upload Test Document'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};