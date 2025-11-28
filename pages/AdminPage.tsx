import React, { useState, useEffect, useContext } from 'react';
import { MOCK_PENDING_UPLOADS, LEVELS } from '../constants';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";
import { AuthContext } from '../contexts/AuthContext';
import { Level } from '../types';

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'generate'>('pending');
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const auth = useContext(AuthContext);

  // AI Generator State
  const [aiCourseCode, setAiCourseCode] = useState('');
  const [aiCourseTitle, setAiCourseTitle] = useState('');
  const [aiLevel, setAiLevel] = useState<Level>(100);
  const [aiTopic, setAiTopic] = useState('');
  const [aiYear, setAiYear] = useState(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (activeTab === 'pending') {
        fetchPending();
    }
  }, [activeTab]);

  const fetchPending = async () => {
        setLoading(true);
        try {
             // Combine Mock for demo + Real pending from DB
            const q = query(collection(db, "questions"), where("status", "==", "pending"));
            const snapshot = await getDocs(q);
            const realPending = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Filter out mocks if real data exists to avoid clutter, or keep both
            setPendingItems([...MOCK_PENDING_UPLOADS, ...realPending]);
        } catch (error) {
            console.error("Error fetching pending:", error);
            setPendingItems(MOCK_PENDING_UPLOADS);
        } finally {
            setLoading(false);
        }
    };

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
      // Optimistic Update
      setPendingItems(prev => prev.filter(item => item.id !== id));

      if (id.startsWith('pq')) return; // Don't try to update mocks

      try {
          const docRef = doc(db, 'questions', id);
          if (action === 'approve') {
              await updateDoc(docRef, { status: 'approved' });
          } else {
              await deleteDoc(docRef); 
          }
      } catch (error) {
          console.error("Action failed:", error);
          alert("Failed to update database.");
      }
  };

  const handleGenerateAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!process.env.API_KEY) {
        alert("API Key missing. Cannot generate.");
        return;
    }

    setIsGenerating(true);
    setGeneratedContent('');

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Create a comprehensive university examination past question paper for the course code ${aiCourseCode} titled "${aiCourseTitle}". Level: ${aiLevel}. The year is ${aiYear}.
        
        The specific topic to focus on is: ${aiTopic}.
        
        Structure the output exactly as follows:
        1.  **Header Information**: (Course Code, Title, Time Allowed: 2 Hours, Instructions: Answer all in Section A and 2 in Section B).
        2.  **Section A**: 10 Multiple Choice Questions (labeled 1-10) with options A-D.
        3.  **Section B**: 4 Theory/Essay Questions (labeled 1-4).
        
        Output format: Plain Text (cleanly formatted). Do not use markdown bolding excessively, make it look like a standard exam paper text.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        setGeneratedContent(response.text);

    } catch (error) {
        console.error("AI Generation Error:", error);
        alert("Failed to generate content. Please try again.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleSaveGenerated = async () => {
    if (!generatedContent || !auth?.user) return;
    setIsSaving(true);
    try {
        const questionData = {
            courseCode: aiCourseCode.toUpperCase(),
            courseTitle: aiCourseTitle,
            level: aiLevel,
            year: aiYear,
            textContent: generatedContent, // Saving TEXT to DB instead of File URL
            uploadedBy: auth.user.id,
            uploadedByEmail: auth.user.email,
            status: 'approved', // Auto-approve admin generated content
            createdAt: new Date().toISOString(),
            isAiGenerated: true
        };

        await addDoc(collection(db, 'questions'), questionData);
        alert("Exam saved to database successfully!");
        
        // Reset
        setAiTopic('');
        setGeneratedContent('');
        setAiCourseTitle('');
        setAiCourseCode('');
    } catch (error) {
        console.error("Save Error:", error);
        alert("Failed to save to database.");
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
        <p className="text-slate-600 mb-8">Manage content, approve uploads, and oversee the portal.</p>

        {/* Tabs */}
        <div className="flex space-x-4 border-b border-slate-200 mb-8">
            <button 
                onClick={() => setActiveTab('pending')}
                className={`pb-4 px-2 font-medium text-sm transition-colors relative ${activeTab === 'pending' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Pending Approvals
                {activeTab === 'pending' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600"></div>}
            </button>
            <button 
                onClick={() => setActiveTab('generate')}
                className={`pb-4 px-2 font-medium text-sm transition-colors relative ${activeTab === 'generate' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Generate with AI
                {activeTab === 'generate' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600"></div>}
            </button>
        </div>

        {activeTab === 'pending' ? (
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                 <h2 className="text-lg font-bold text-slate-800">Pending Question Uploads</h2>
                 <button onClick={fetchPending} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                     Refresh
                 </button>
             </div>
             
             {loading ? (
                 <div className="p-12 text-center">Loading...</div>
             ) : pendingItems.length > 0 ? (
                 <div className="overflow-x-auto">
                     <table className="w-full text-left">
                         <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold">
                             <tr>
                                 <th className="px-6 py-4">Course</th>
                                 <th className="px-6 py-4">Title</th>
                                 <th className="px-6 py-4">Level</th>
                                 <th className="px-6 py-4">Submitted By</th>
                                 <th className="px-6 py-4">Date</th>
                                 <th className="px-6 py-4 text-right">Actions</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                             {pendingItems.map((item) => (
                                 <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                     <td className="px-6 py-4 font-medium text-slate-900">{item.courseCode}</td>
                                     <td className="px-6 py-4 text-slate-600">{item.courseTitle}</td>
                                     <td className="px-6 py-4">
                                         <span className="px-2 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">{item.level}</span>
                                     </td>
                                     <td className="px-6 py-4 text-slate-600 text-sm">{item.submittedByEmail || item.submittedBy}</td>
                                     <td className="px-6 py-4 text-slate-500 text-sm">{item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : 'N/A'}</td>
                                     <td className="px-6 py-4 text-right space-x-2">
                                         <button 
                                             onClick={() => handleAction(item.id, 'approve')}
                                             className="text-emerald-600 hover:text-emerald-800 font-medium text-sm border border-emerald-200 bg-emerald-50 px-3 py-1 rounded hover:bg-emerald-100 transition-colors"
                                         >
                                             Approve
                                         </button>
                                         <button 
                                             onClick={() => handleAction(item.id, 'reject')}
                                             className="text-rose-600 hover:text-rose-800 font-medium text-sm border border-rose-200 bg-rose-50 px-3 py-1 rounded hover:bg-rose-100 transition-colors"
                                         >
                                             Reject
                                         </button>
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
             ) : (
                 <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                     <svg className="w-12 h-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                     </svg>
                     <p>No pending approvals. Great job!</p>
                 </div>
             )}
         </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* AI Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-xl font-bold text-indigo-900 mb-4 flex items-center gap-2">
                        <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        AI Question Generator
                    </h2>
                    <p className="text-sm text-slate-500 mb-6">Enter a topic, and our AI will generate a structured exam paper. The text is saved to the database (Free Storage).</p>
                    
                    <form onSubmit={handleGenerateAI} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-slate-700">Course Code</label>
                                <input required type="text" value={aiCourseCode} onChange={e => setAiCourseCode(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="FIN 402" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Level</label>
                                <select value={aiLevel} onChange={e => setAiLevel(Number(e.target.value) as Level)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Course Title</label>
                            <input required type="text" value={aiCourseTitle} onChange={e => setAiCourseTitle(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Advanced Financial Management" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700">Year</label>
                            <input required type="number" value={aiYear} onChange={e => setAiYear(Number(e.target.value))} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Topic/Focus Area</label>
                            <textarea required rows={3} value={aiTopic} onChange={e => setAiTopic(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="e.g., Capital Budgeting Techniques, NPV vs IRR, Risk Analysis..."></textarea>
                        </div>
                        <button type="submit" disabled={isGenerating} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all">
                             {isGenerating ? 'Generating...' : 'Generate Exam Content'}
                        </button>
                    </form>
                </div>

                {/* Preview */}
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col h-full max-h-[600px]">
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Content Preview</h3>
                    <div className="flex-grow bg-white border border-slate-200 rounded-lg p-4 overflow-y-auto font-mono text-sm text-slate-700 whitespace-pre-wrap mb-4">
                        {generatedContent || <span className="text-slate-400 italic">Generated content will appear here...</span>}
                    </div>
                    <button 
                        onClick={handleSaveGenerated}
                        disabled={!generatedContent || isSaving}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? 'Saving...' : 'Save to Database (No Storage Cost)'}
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};