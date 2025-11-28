import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, addDoc, setDoc, getDoc } from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";
import { AuthContext } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Level, Role } from '../types';
import { LEVELS } from '../constants';
import { uploadToImgBB } from '../utils/api';

type AdminTab = 'pending' | 'content' | 'users' | 'generate' | 'news' | 'executives' | 'lecturers' | 'community';

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('pending');
  const [loading, setLoading] = useState(false);
  const auth = useContext(AuthContext);
  const { showNotification } = useNotification();

  // Data States
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [newsItems, setNewsItems] = useState<any[]>([]);
  const [execItems, setExecItems] = useState<any[]>([]);
  const [lecturerItems, setLecturerItems] = useState<any[]>([]);
  const [groupItems, setGroupItems] = useState<any[]>([]);
  
  // Website Content State
  const [hodData, setHodData] = useState({ name: '', title: '', message: '', imageUrl: '' });
  const [isSavingContent, setIsSavingContent] = useState(false);
  const [hodImageFile, setHodImageFile] = useState<File | null>(null);

  // Modal & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [modalType, setModalType] = useState<AdminTab | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [formFile, setFormFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirmation State
  const [confirmDialog, setConfirmDialog] = useState<{ id: string, collection: string, action: 'approve' | 'reject' | 'delete', title: string } | null>(null);

  // AI Generator State
  const [aiCourseCode, setAiCourseCode] = useState('');
  const [aiCourseTitle, setAiCourseTitle] = useState('');
  const [aiLevel, setAiLevel] = useState<Level>(100);
  const [aiTopic, setAiTopic] = useState('');
  const [aiYear, setAiYear] = useState(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // --- FETCHING LOGIC ---
  useEffect(() => {
    fetchDataForTab(activeTab);
  }, [activeTab]);

  const fetchDataForTab = async (tab: AdminTab) => {
    setLoading(true);
    try {
        if (tab === 'pending') {
            const q = query(collection(db, "questions"), where("status", "==", "pending"));
            const snapshot = await getDocs(q);
            setPendingItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } else if (tab === 'users') {
            const snapshot = await getDocs(collection(db, "users"));
            setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } else if (tab === 'content') {
            const docRef = doc(db, 'content', 'hod_message');
            const snapshot = await getDoc(docRef);
            if (snapshot.exists()) {
                setHodData(snapshot.data() as any);
            }
        } else if (tab === 'news') {
            const snapshot = await getDocs(collection(db, "announcements"));
            setNewsItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } else if (tab === 'executives') {
            const snapshot = await getDocs(collection(db, "executives"));
            setExecItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } else if (tab === 'lecturers') {
            const snapshot = await getDocs(collection(db, "lecturers"));
            setLecturerItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } else if (tab === 'community') {
            const snapshot = await getDocs(collection(db, "groups"));
            setGroupItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
    } catch (error) {
        console.error(`Error fetching ${tab}:`, error);
    } finally {
        setLoading(false);
    }
  };

  // --- CONTENT ACTIONS ---
  const handleSaveContent = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSavingContent(true);
      try {
          let url = hodData.imageUrl;
          if (hodImageFile) {
              url = await uploadToImgBB(hodImageFile);
          }
          await setDoc(doc(db, 'content', 'hod_message'), { ...hodData, imageUrl: url });
          showNotification("Homepage content updated!", "success");
      } catch (error) {
          showNotification("Failed to update content", "error");
      } finally {
          setIsSavingContent(false);
      }
  };

  // --- GENERIC ACTIONS ---
  const handleDelete = (id: string, collectionName: string, title: string) => {
      setConfirmDialog({ id, collection: collectionName, action: 'delete', title });
  };

  const executeAction = async () => {
      if (!confirmDialog) return;
      const { id, collection: colName, action } = confirmDialog;

      try {
          const docRef = doc(db, colName, id);
          if (action === 'delete' || action === 'reject') {
              await deleteDoc(docRef);
              showNotification("Item deleted", "info");
          } else if (action === 'approve') {
              await updateDoc(docRef, { status: 'approved' });
              showNotification("Item approved", "success");
          }
          fetchDataForTab(activeTab);
      } catch (error) {
          showNotification("Action failed", "error");
      } finally {
          setConfirmDialog(null);
      }
  };

  const updateUserRole = async (userId: string, newRole: Role) => {
      try {
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, { role: newRole });
          setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
          showNotification(`Role updated to ${newRole}`, "success");
      } catch (error) {
          showNotification("Failed to update role", "error");
      }
  };

  // --- MODAL & FORM HANDLERS ---
  const openAddModal = (type: AdminTab) => {
      setModalType(type);
      setEditingItem(null);
      setFormData({}); 
      setFormFile(null);
      setIsModalOpen(true);
  };

  const openEditModal = (type: AdminTab, item: any) => {
      setModalType(type);
      setEditingItem(item);
      setFormData(item);
      setFormFile(null);
      setIsModalOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setFormFile(e.target.files[0]);
      }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!modalType) return;
      setIsSubmitting(true);

      try {
          let imageUrl = formData.imageUrl || '';
          if (formFile) {
              imageUrl = await uploadToImgBB(formFile);
          }

          const collectionName = 
              modalType === 'news' ? 'announcements' :
              modalType === 'executives' ? 'executives' :
              modalType === 'lecturers' ? 'lecturers' : 
              modalType === 'community' ? 'groups' : '';
          
          if (!collectionName) return;

          const dataToSave = { ...formData, imageUrl };

          if (editingItem) {
              await updateDoc(doc(db, collectionName, editingItem.id), dataToSave);
              showNotification("Updated successfully", "success");
          } else {
              if (modalType === 'news') dataToSave.date = new Date().toISOString();
              await addDoc(collection(db, collectionName), dataToSave);
              showNotification("Created successfully", "success");
          }

          setIsModalOpen(false);
          fetchDataForTab(modalType);
      } catch (error) {
          showNotification("Failed to save", "error");
      } finally {
          setIsSubmitting(false);
      }
  };

  // --- AI HANDLERS ---
  const handleGenerateAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiCourseCode || !aiTopic) { showNotification("Missing fields", "error"); return; }
    setIsGenerating(true);
    setGeneratedContent('');

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Create a university exam paper for ${aiCourseCode}: ${aiCourseTitle}. Level: ${aiLevel}. Year: ${aiYear}. Topic: ${aiTopic}. Structure: Header, Section A (10 MCQs), Section B (4 Theory). Plain text format.`;
        
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        if (response.text) {
             setGeneratedContent(response.text);
             showNotification("Generated successfully", "success");
        }
    } catch (error: any) {
        showNotification(error.message || "AI Error", "error");
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
            textContent: generatedContent,
            uploadedBy: auth.user.id,
            uploadedByEmail: auth.user.email,
            status: 'approved',
            createdAt: new Date().toISOString(),
            isAiGenerated: true
        };
        await addDoc(collection(db, 'questions'), questionData);
        showNotification("Saved to database!", "success");
        setGeneratedContent('');
    } catch (error) {
        showNotification("Failed to save", "error");
    } finally {
        setIsSaving(false);
    }
  };

  const TabButton = ({ id, label }: { id: AdminTab, label: string }) => (
    <button 
        onClick={() => setActiveTab(id)}
        className={`pb-4 px-3 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === id ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
    >
        {label}
        {activeTab === id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600"></div>}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-8 md:py-12 relative">
      
      {/* Confirmation Modal */}
      {confirmDialog && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-fade-in-down">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Confirm Action</h3>
                  <p className="text-slate-600 mb-6">
                      Are you sure you want to <span className="font-bold uppercase text-rose-600">{confirmDialog.action}</span>: <br/> 
                      <span className="italic">"{confirmDialog.title}"</span>?
                  </p>
                  <div className="flex justify-end gap-3">
                      <button onClick={() => setConfirmDialog(null)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">Cancel</button>
                      <button onClick={executeAction} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-md">Confirm</button>
                  </div>
              </div>
          </div>
      )}

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 m-4 animate-fade-in-down">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-indigo-900">
                        {editingItem ? 'Edit' : 'Add New'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    {/* Fields */}
                    {modalType === 'news' && (
                        <>
                            <div><label className="block text-sm font-bold mb-1">Title</label><input name="title" required value={formData.title || ''} onChange={handleFormChange} className="w-full border p-2 rounded" /></div>
                            <div><label className="block text-sm font-bold mb-1">Content</label><textarea name="content" required rows={4} value={formData.content || ''} onChange={handleFormChange} className="w-full border p-2 rounded" /></div>
                            <div><label className="block text-sm font-bold mb-1">Author</label><input name="author" required value={formData.author || ''} onChange={handleFormChange} className="w-full border p-2 rounded" /></div>
                        </>
                    )}
                    {modalType === 'executives' && (
                        <>
                            <div><label className="block text-sm font-bold mb-1">Name</label><input name="name" required value={formData.name || ''} onChange={handleFormChange} className="w-full border p-2 rounded" /></div>
                            <div><label className="block text-sm font-bold mb-1">Position</label><input name="position" required value={formData.position || ''} onChange={handleFormChange} className="w-full border p-2 rounded" /></div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Level</label>
                                <select name="level" value={formData.level || 100} onChange={handleFormChange} className="w-full border p-2 rounded">
                                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                        </>
                    )}
                    {modalType === 'lecturers' && (
                        <>
                            <div><label className="block text-sm font-bold mb-1">Name</label><input name="name" required value={formData.name || ''} onChange={handleFormChange} className="w-full border p-2 rounded" /></div>
                            <div><label className="block text-sm font-bold mb-1">Title (e.g. Dr., Prof.)</label><input name="title" required value={formData.title || ''} onChange={handleFormChange} className="w-full border p-2 rounded" /></div>
                            <div><label className="block text-sm font-bold mb-1">Specialization</label><input name="specialization" required value={formData.specialization || ''} onChange={handleFormChange} className="w-full border p-2 rounded" /></div>
                        </>
                    )}
                    {modalType === 'community' && (
                        <>
                            <div><label className="block text-sm font-bold mb-1">Group Name</label><input name="name" required value={formData.name || ''} onChange={handleFormChange} className="w-full border p-2 rounded" /></div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Platform</label>
                                <select name="platform" value={formData.platform || 'WhatsApp'} onChange={handleFormChange} className="w-full border p-2 rounded">
                                    <option value="WhatsApp">WhatsApp</option>
                                    <option value="Telegram">Telegram</option>
                                    <option value="Discord">Discord</option>
                                </select>
                            </div>
                            <div><label className="block text-sm font-bold mb-1">Link</label><input name="link" required value={formData.link || ''} onChange={handleFormChange} className="w-full border p-2 rounded" /></div>
                            <div><label className="block text-sm font-bold mb-1">Description</label><input name="description" required value={formData.description || ''} onChange={handleFormChange} className="w-full border p-2 rounded" /></div>
                        </>
                    )}

                    {modalType !== 'community' && (
                        <div>
                            <label className="block text-sm font-bold mb-1">Image</label>
                            <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-sm text-slate-500"/>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded hover:bg-slate-50">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700 disabled:opacity-50">
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
        <p className="text-slate-600 mb-8">Full content management system for FINQUEST.</p>

        {/* Scrollable Tabs */}
        <div className="flex overflow-x-auto space-x-6 border-b border-slate-200 mb-8 pb-1 scrollbar-hide">
            <TabButton id="pending" label="Pending Qs" />
            <TabButton id="content" label="Website Content" />
            <TabButton id="users" label="Users" />
            <TabButton id="news" label="News" />
            <TabButton id="executives" label="Executives" />
            <TabButton id="lecturers" label="Lecturers" />
            <TabButton id="community" label="Community" />
            <TabButton id="generate" label="AI Generator" />
        </div>

        {/* --- TAB CONTENT --- */}
        
        {/* 1. PENDING APPROVALS */}
        {activeTab === 'pending' && (
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                 <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                     <h2 className="font-bold text-slate-800">Pending Uploads</h2>
                     <button onClick={() => fetchDataForTab('pending')} className="text-indigo-600 text-sm font-bold">Refresh</button>
                 </div>
                 {loading ? <div className="p-12 text-center">Loading...</div> : pendingItems.length === 0 ? <div className="p-12 text-center text-slate-500">No pending items.</div> : (
                     <table className="w-full text-left text-sm">
                         <thead className="bg-slate-50 border-b border-slate-100"><tr><th className="p-4">Course</th><th className="p-4">Uploader</th><th className="p-4 text-right">Actions</th></tr></thead>
                         <tbody>
                             {pendingItems.map(item => (
                                 <tr key={item.id} className="border-b last:border-0 hover:bg-slate-50">
                                     <td className="p-4">
                                         <div className="font-bold">{item.courseCode}</div>
                                         <div className="text-xs text-slate-500">{item.courseTitle}</div>
                                     </td>
                                     <td className="p-4">{item.submittedByEmail || 'Unknown'}</td>
                                     <td className="p-4 text-right space-x-2">
                                         <button onClick={() => setConfirmDialog({id: item.id, collection: 'questions', action: 'approve', title: item.courseCode})} className="text-emerald-600 font-bold hover:underline">Approve</button>
                                         <button onClick={() => setConfirmDialog({id: item.id, collection: 'questions', action: 'reject', title: item.courseCode})} className="text-rose-600 font-bold hover:underline">Reject</button>
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 )}
             </div>
        )}

        {/* 2. WEBSITE CONTENT */}
        {activeTab === 'content' && (
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                 <h2 className="font-bold text-slate-800 mb-6 text-xl">Homepage HOD Section</h2>
                 <form onSubmit={handleSaveContent} className="space-y-6 max-w-2xl">
                     <div>
                         <label className="block text-sm font-bold mb-2">Head of Department Name</label>
                         <input type="text" value={hodData.name} onChange={e => setHodData({...hodData, name: e.target.value})} className="w-full border p-2 rounded" placeholder="e.g. Dr. A. A. Adebayo" />
                     </div>
                     <div>
                         <label className="block text-sm font-bold mb-2">Welcome Title</label>
                         <input type="text" value={hodData.title} onChange={e => setHodData({...hodData, title: e.target.value})} className="w-full border p-2 rounded" placeholder="e.g. Breeding Financial Experts" />
                     </div>
                     <div>
                         <label className="block text-sm font-bold mb-2">Welcome Message</label>
                         <textarea rows={5} value={hodData.message} onChange={e => setHodData({...hodData, message: e.target.value})} className="w-full border p-2 rounded" placeholder="Full message..." />
                     </div>
                     <div>
                         <label className="block text-sm font-bold mb-2">HOD Photo</label>
                         <input type="file" accept="image/*" onChange={e => e.target.files && setHodImageFile(e.target.files[0])} className="w-full text-sm"/>
                         {hodData.imageUrl && <div className="mt-2 text-xs text-green-600">Current image set</div>}
                     </div>
                     <button disabled={isSavingContent} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700 disabled:opacity-50">
                         {isSavingContent ? 'Updating...' : 'Update Content'}
                     </button>
                 </form>
             </div>
        )}

        {/* 3. USER MANAGEMENT */}
        {activeTab === 'users' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                     <h2 className="font-bold text-slate-800">All Users</h2>
                     <button onClick={() => fetchDataForTab('users')} className="text-indigo-600 text-sm font-bold">Refresh</button>
                </div>
                {loading ? <div className="p-12 text-center">Loading...</div> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-100"><tr><th className="p-4">User</th><th className="p-4">Role</th><th className="p-4">Action</th></tr></thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50">
                                        <td className="p-4">
                                            <div className="font-bold">{u.name}</div>
                                            <div className="text-xs text-slate-500">{u.email}</div>
                                        </td>
                                        <td className="p-4"><span className="uppercase text-xs font-bold bg-slate-100 px-2 py-1 rounded">{u.role}</span></td>
                                        <td className="p-4">
                                            <select value={u.role} onChange={(e) => updateUserRole(u.id, e.target.value as Role)} className="border rounded p-1 text-xs">
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

        {/* 4-7. CMS SECTIONS */}
        {['news', 'executives', 'lecturers', 'community'].includes(activeTab) && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h2 className="font-bold text-slate-800 capitalize">{activeTab} Management</h2>
                    <button onClick={() => openAddModal(activeTab)} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm flex items-center gap-1">
                        Add New
                    </button>
                </div>
                {loading ? <div className="p-12 text-center">Loading...</div> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                        {(activeTab === 'news' ? newsItems : activeTab === 'executives' ? execItems : activeTab === 'lecturers' ? lecturerItems : groupItems).map((item) => (
                            <div key={item.id} className="border rounded-lg p-4 flex flex-col hover:shadow-md transition bg-white">
                                <div className="flex-grow">
                                    <h4 className="font-bold text-slate-800 line-clamp-1">{item.title || item.name}</h4>
                                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">{item.content || item.description || item.specialization || item.position}</p>
                                </div>
                                <div className="flex justify-end gap-2 pt-3 border-t border-slate-50 mt-2">
                                    <button onClick={() => openEditModal(activeTab, item)} className="text-indigo-600 text-xs font-bold hover:underline">Edit</button>
                                    <button onClick={() => handleDelete(item.id, activeTab === 'news' ? 'announcements' : activeTab === 'community' ? 'groups' : activeTab, item.title || item.name)} className="text-rose-600 text-xs font-bold hover:underline">Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* 8. AI GENERATOR */}
        {activeTab === 'generate' && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-xl font-bold text-indigo-900 mb-4">AI Question Generator</h2>
                    <form onSubmit={handleGenerateAI} className="space-y-4">
                        <input type="text" placeholder="Course Code" value={aiCourseCode} onChange={e => setAiCourseCode(e.target.value)} className="w-full border p-2 rounded" />
                        <input type="text" placeholder="Course Title" value={aiCourseTitle} onChange={e => setAiCourseTitle(e.target.value)} className="w-full border p-2 rounded" />
                        <textarea placeholder="Topic" value={aiTopic} onChange={e => setAiTopic(e.target.value)} className="w-full border p-2 rounded" />
                        <button disabled={isGenerating} className="w-full bg-indigo-600 text-white py-2 rounded font-bold hover:bg-indigo-700 disabled:opacity-50">{isGenerating ? 'Generating...' : 'Generate'}</button>
                    </form>
                </div>
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col h-full max-h-[600px]">
                     <h3 className="font-bold text-slate-800 mb-2">Preview</h3>
                     <div className="flex-grow bg-white border p-4 overflow-y-auto whitespace-pre-wrap text-sm mb-4">{generatedContent || <span className="text-slate-400 italic">Result...</span>}</div>
                     <button onClick={handleSaveGenerated} disabled={!generatedContent || isSaving} className="w-full bg-emerald-600 text-white py-2 rounded font-bold hover:bg-emerald-700 disabled:opacity-50">Save</button>
                </div>
             </div>
        )}

      </div>
    </div>
  );
};