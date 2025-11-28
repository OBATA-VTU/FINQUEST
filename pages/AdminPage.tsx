import React, { useState, useEffect, useContext } from 'react';
import { MOCK_PENDING_UPLOADS, LEVELS } from '../constants';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";
import { AuthContext } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Level, Role } from '../types';

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'generate' | 'users'>('pending');
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const auth = useContext(AuthContext);
  const { showNotification } = useNotification();

  // Confirmation State
  const [confirmDialog, setConfirmDialog] = useState<{ id: string, action: 'approve' | 'reject', title: string } | null>(null);

  // AI Generator State
  const [aiCourseCode, setAiCourseCode] = useState('');
  const [aiCourseTitle, setAiCourseTitle] = useState('');
  const [aiLevel, setAiLevel] = useState<Level>(100);
  const [aiTopic, setAiTopic] = useState('');
  const [aiYear, setAiYear] = useState(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (activeTab === 'pending') {
        fetchPending();
    } else if (activeTab === 'users') {
        fetchUsers();
    }
  }, [activeTab]);

  const fetchPending = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "questions"), where("status", "==", "pending"));
            const snapshot = await getDocs(q);
            const realPending = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPendingItems([...MOCK_PENDING_UPLOADS, ...realPending]);
        } catch (error) {
            console.error("Error fetching pending:", error);
            showNotification("Failed to fetch pending items", "error");
            setPendingItems(MOCK_PENDING_UPLOADS);
        } finally {
            setLoading(false);
        }
    };

  const fetchUsers = async () => {
      setLoading(true);
      try {
          const snapshot = await getDocs(collection(db, "users"));
          const fetchedUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setUsers(fetchedUsers);
      } catch (error) {
          console.error("Error fetching users:", error);
          showNotification("Failed to fetch users", "error");
      } finally {
          setLoading(false);
      }
  };

  const updateUserRole = async (userId: string, newRole: Role) => {
      try {
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, { role: newRole });
          setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
          showNotification(`User role updated to ${newRole}`, "success");
      } catch (error) {
          console.error(error);
          showNotification("Failed to update role", "error");
      }
  };

  const requestAction = (item: any, action: 'approve' | 'reject') => {
      setConfirmDialog({
          id: item.id,
          action,
          title: `${item.courseCode} - ${item.courseTitle}`
      });
  };

  const executeAction = async () => {
      if (!confirmDialog) return;
      const { id, action } = confirmDialog;

      // Optimistic Update
      setPendingItems(prev => prev.filter(item => item.id !== id));
      setConfirmDialog(null);

      if (id.startsWith('pq')) return; // Don't try to update mocks

      try {
          const docRef = doc(db, 'questions', id);
          if (action === 'approve') {
              await updateDoc(docRef, { status: 'approved' });
              showNotification("Question approved", "success");
          } else {
              await deleteDoc(docRef); 
              showNotification("Question rejected", "info");
          }
      } catch (error) {
          console.error("Action failed:", error);
          showNotification("Failed to update database", "error");
          fetchPending(); // Revert on failure
      }
  };

  const validateForm = () => {
      const errors: { [key: string]: string } = {};
      if (!aiCourseCode.trim()) errors.code = "Course Code is required";
      if (!aiCourseTitle.trim()) errors.title = "Course Title is required";
      if (!aiTopic.trim()) errors.topic = "Topic is required";
      if (!aiYear || aiYear < 2000 || aiYear > 2100) errors.year = "Please enter a valid year";
      
      setFormErrors(errors);
      return Object.keys(errors).length === 0;
  };

  const handleGenerateAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

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

        if (response.text) {
             setGeneratedContent(response.text);
             showNotification("Content generated successfully", "success");
        } else {
            throw new Error("Empty response from AI");
        }

    } catch (error: any) {
        console.error("AI Generation Error:", error);
        showNotification(error.message || "Failed to generate content. Please try again later.", "error");
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
        showNotification("Exam saved to database successfully!", "success");
        
        // Reset
        setAiTopic('');
        setGeneratedContent('');
        setAiCourseTitle('');
        setAiCourseCode('');
        setFormErrors({});
    } catch (error) {
        console.error("Save Error:", error);
        showNotification("Failed to save to database.", "error");
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 relative">
      {/* Confirmation Modal */}
      {confirmDialog && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-fade-in-down">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Confirm Action</h3>
                  <p className="text-slate-600 mb-6">
                      Are you sure you want to <span className={`font-bold ${confirmDialog.action === 'reject' ? 'text-rose-600' : 'text-emerald-600'}`}>{confirmDialog.action.toUpperCase()}</span> the upload: <br/> 
                      <span className="italic">"{confirmDialog.title}"</span>?
                  </p>
                  <div className="flex justify-end gap-3">
                      <button 
                          onClick={() => setConfirmDialog(null)}
                          className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={executeAction}
                          className={`px-4 py-2 text-white font-bold rounded-lg shadow-md transition ${confirmDialog.action === 'reject' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                      >
                          Confirm
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
        <p className="text-slate-600 mb-8">Manage content, approve uploads, and oversee users.</p>

        {/* Tabs */}
        <div className="flex space-x-6 border-b border-slate-200 mb-8">
            <button 
                onClick={() => setActiveTab('pending')}
                className={`pb-4 px-2 font-medium text-sm transition-colors relative ${activeTab === 'pending' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Pending Approvals
                {activeTab === 'pending' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600"></div>}
            </button>
            <button 
                onClick={() => setActiveTab('users')}
                className={`pb-4 px-2 font-medium text-sm transition-colors relative ${activeTab === 'users' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                User Management
                {activeTab === 'users' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600"></div>}
            </button>
            <button 
                onClick={() => setActiveTab('generate')}
                className={`pb-4 px-2 font-medium text-sm transition-colors relative ${activeTab === 'generate' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Generate with AI
                {activeTab === 'generate' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600"></div>}
            </button>
        </div>

        {activeTab === 'pending' && (
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                 <h2 className="text-lg font-bold text-slate-800">Pending Question Uploads</h2>
                 <button onClick={fetchPending} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                     Refresh
                 </button>
             </div>
             
             {loading ? (
                 <div className="p-12 text-center flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                 </div>
             ) : pendingItems.length > 0 ? (
                 <div className="overflow-x-auto">
                     <table className="w-full text-left">
                         <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold">
                             <tr>
                                 <th className="px-6 py-4">Course</th>
                                 <th className="px-6 py-4">Details</th>
                                 <th className="px-6 py-4">Level</th>
                                 <th className="px-6 py-4">Uploader Info</th>
                                 <th className="px-6 py-4 text-right">Actions</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                             {pendingItems.map((item) => (
                                 <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                     <td className="px-6 py-4">
                                         <div className="font-bold text-slate-900">{item.courseCode}</div>
                                         <div className="text-xs text-slate-500">{item.year}</div>
                                     </td>
                                     <td className="px-6 py-4 text-slate-600 font-medium">{item.courseTitle}</td>
                                     <td className="px-6 py-4">
                                         <span className="px-2 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">{item.level}</span>
                                     </td>
                                     <td className="px-6 py-4">
                                         <div className="text-sm text-slate-900 font-medium">{item.submittedByEmail || 'Unknown'}</div>
                                         <div className="text-xs text-slate-500">{item.submittedAt ? new Date(item.submittedAt).toLocaleString() : 'Date N/A'}</div>
                                     </td>
                                     <td className="px-6 py-4 text-right space-x-2">
                                         <button 
                                             onClick={() => requestAction(item, 'approve')}
                                             className="text-emerald-600 hover:text-emerald-800 font-medium text-sm border border-emerald-200 bg-emerald-50 px-3 py-1 rounded hover:bg-emerald-100 transition-colors"
                                         >
                                             Approve
                                         </button>
                                         <button 
                                             onClick={() => requestAction(item, 'reject')}
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
                     <p>No pending approvals. Great job!</p>
                 </div>
             )}
         </div>
        )}

        {activeTab === 'users' && (
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                 <h2 className="text-lg font-bold text-slate-800">User Management</h2>
                 <button onClick={fetchUsers} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                     Refresh List
                 </button>
             </div>
             
             {loading ? (
                 <div className="p-12 text-center flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                 </div>
             ) : (
                 <div className="overflow-x-auto">
                     <table className="w-full text-left">
                         <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold">
                             <tr>
                                 <th className="px-6 py-4">User</th>
                                 <th className="px-6 py-4">Username/Matric</th>
                                 <th className="px-6 py-4">Current Role</th>
                                 <th className="px-6 py-4">Actions</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                             {users.map((user) => (
                                 <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                     <td className="px-6 py-4">
                                         <div className="font-bold text-slate-900">{user.name}</div>
                                         <div className="text-xs text-slate-500">{user.email}</div>
                                     </td>
                                     <td className="px-6 py-4">
                                         <div className="text-sm text-slate-800 font-medium">@{user.username || 'N/A'}</div>
                                         <div className="text-xs text-slate-500">{user.matricNumber || 'No Matric'}</div>
                                     </td>
                                     <td className="px-6 py-4">
                                         <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase ${
                                             user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                             user.role === 'executive' ? 'bg-amber-100 text-amber-700' :
                                             user.role === 'lecturer' ? 'bg-blue-100 text-blue-700' :
                                             'bg-slate-100 text-slate-600'
                                         }`}>
                                             {user.role}
                                         </span>
                                     </td>
                                     <td className="px-6 py-4">
                                         <select 
                                            value={user.role} 
                                            onChange={(e) => updateUserRole(user.id, e.target.value as Role)}
                                            className="text-sm border-slate-200 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                         >
                                             <option value="student">Student</option>
                                             <option value="executive">Executive</option>
                                             <option value="lecturer">Lecturer</option>
                                             <option value="admin">Admin</option>
                                         </select>
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
             )}
             </div>
        )}

        {activeTab === 'generate' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* AI Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
                    <h2 className="text-xl font-bold text-indigo-900 mb-4 flex items-center gap-2">
                        AI Question Generator
                    </h2>
                    <p className="text-sm text-slate-500 mb-6">Enter a topic, and our AI will generate a structured exam paper. The text is saved to the database (Free Storage).</p>
                    
                    <form onSubmit={handleGenerateAI} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-slate-700">Course Code <span className="text-red-500">*</span></label>
                                <input type="text" value={aiCourseCode} onChange={e => setAiCourseCode(e.target.value)} className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${formErrors.code ? 'border-red-300' : 'border-slate-300'}`} placeholder="FIN 402" />
                                {formErrors.code && <p className="text-xs text-red-500 mt-1">{formErrors.code}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Level <span className="text-red-500">*</span></label>
                                <select value={aiLevel} onChange={e => setAiLevel(Number(e.target.value) as Level)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Course Title <span className="text-red-500">*</span></label>
                            <input type="text" value={aiCourseTitle} onChange={e => setAiCourseTitle(e.target.value)} className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${formErrors.title ? 'border-red-300' : 'border-slate-300'}`} placeholder="Advanced Financial Management" />
                            {formErrors.title && <p className="text-xs text-red-500 mt-1">{formErrors.title}</p>}
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700">Year <span className="text-red-500">*</span></label>
                            <input type="number" value={aiYear} onChange={e => setAiYear(Number(e.target.value))} className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${formErrors.year ? 'border-red-300' : 'border-slate-300'}`} />
                            {formErrors.year && <p className="text-xs text-red-500 mt-1">{formErrors.year}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Topic/Focus Area <span className="text-red-500">*</span></label>
                            <textarea rows={3} value={aiTopic} onChange={e => setAiTopic(e.target.value)} className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${formErrors.topic ? 'border-red-300' : 'border-slate-300'}`} placeholder="e.g., Capital Budgeting Techniques, NPV vs IRR, Risk Analysis..."></textarea>
                            {formErrors.topic && <p className="text-xs text-red-500 mt-1">{formErrors.topic}</p>}
                        </div>
                        <button type="submit" disabled={isGenerating} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all items-center gap-2">
                             {isGenerating && <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                             {isGenerating ? 'Generating...' : 'Generate Exam Content'}
                        </button>
                    </form>
                </div>

                {/* Preview */}
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col h-full max-h-[700px]">
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Content Preview</h3>
                    <div className="flex-grow bg-white border border-slate-200 rounded-lg p-4 overflow-y-auto font-mono text-sm text-slate-700 whitespace-pre-wrap mb-4 shadow-inner min-h-[300px]">
                        {generatedContent ? (
                            <div className="animate-fade-in-down">{generatedContent}</div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                {isGenerating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mb-2"></div>
                                        <span className="italic">Thinking...</span>
                                    </>
                                ) : (
                                    <span className="italic">Generated content will appear here...</span>
                                )}
                            </div>
                        )}
                    </div>
                    <button 
                        onClick={handleSaveGenerated}
                        disabled={!generatedContent || isSaving}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        {isSaving && <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                        {isSaving ? 'Saving...' : 'Save to Database (No Storage Cost)'}
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};