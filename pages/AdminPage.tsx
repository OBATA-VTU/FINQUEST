import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, addDoc, setDoc, getDoc } from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";
import { AuthContext } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Level, Role } from '../types';
import { LEVELS } from '../constants';
import { uploadToImgBB } from '../utils/api';

type AdminSection = 'dashboard' | 'content' | 'users' | 'approvals' | 'settings' | 'ai';
type ContentType = 'news' | 'executives' | 'lecturers' | 'community' | 'gallery';

export const AdminPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [activeContent, setActiveContent] = useState<ContentType>('news');
  const [loading, setLoading] = useState(false);
  const auth = useContext(AuthContext);
  const { showNotification } = useNotification();

  // Dashboard Stats
  const [stats, setStats] = useState({ users: 0, pending: 0, questions: 0 });

  // Data States
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [contentItems, setContentItems] = useState<any[]>([]);
  
  // Settings State
  const [socialLinks, setSocialLinks] = useState({ facebook: '', twitter: '', instagram: '', whatsapp: '' });
  const [adConfig, setAdConfig] = useState({ client: '', slot: '' });
  
  // HOD Data
  const [hodData, setHodData] = useState({ name: '', title: '', message: '', imageUrl: '' });
  const [hodImageFile, setHodImageFile] = useState<File | null>(null);

  // Modal & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [formFile, setFormFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI Generator
  const [aiForm, setAiForm] = useState({ code: '', title: '', level: '100', topic: '', year: new Date().getFullYear().toString() });
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingAi, setIsSavingAi] = useState(false);

  useEffect(() => {
    fetchStats();
    if (activeSection === 'users') fetchUsers();
    if (activeSection === 'approvals') fetchPending();
    if (activeSection === 'content') fetchContent(activeContent);
    if (activeSection === 'settings') fetchSettings();
  }, [activeSection, activeContent]);

  const fetchStats = async () => {
      try {
          const uSnap = await getDocs(collection(db, 'users'));
          const qSnap = await getDocs(collection(db, 'questions'));
          const pSnap = await getDocs(query(collection(db, 'questions'), where('status', '==', 'pending')));
          setStats({ users: uSnap.size, questions: qSnap.size, pending: pSnap.size });
      } catch (e) { console.error(e); }
  };

  const fetchUsers = async () => {
      setLoading(true);
      try {
          const snap = await getDocs(collection(db, 'users'));
          setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } finally { setLoading(false); }
  };

  const fetchPending = async () => {
      setLoading(true);
      try {
          const q = query(collection(db, 'questions'), where('status', '==', 'pending'));
          const snap = await getDocs(q);
          setPendingItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } finally { setLoading(false); }
  };

  const fetchContent = async (type: ContentType) => {
      setLoading(true);
      try {
          let colName = type === 'news' ? 'announcements' : type === 'community' ? 'groups' : type;
          const snap = await getDocs(collection(db, colName));
          setContentItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));

          // Fetch HOD if news is selected (just as a place to put it)
          if (type === 'news') {
               const hDoc = await getDoc(doc(db, 'content', 'hod_message'));
               if (hDoc.exists()) setHodData(hDoc.data() as any);
          }
      } finally { setLoading(false); }
  };

  const fetchSettings = async () => {
      setLoading(true);
      try {
          const sDoc = await getDoc(doc(db, 'content', 'social_links'));
          if (sDoc.exists()) setSocialLinks(sDoc.data() as any);
          const aDoc = await getDoc(doc(db, 'content', 'adsense_config'));
          if (aDoc.exists()) setAdConfig(aDoc.data() as any);
      } finally { setLoading(false); }
  };

  // --- ACTIONS ---

  const handleApproval = async (id: string, approve: boolean) => {
      try {
          const ref = doc(db, 'questions', id);
          if (approve) {
              await updateDoc(ref, { status: 'approved' });
              showNotification("Question approved!", "success");
          } else {
              await deleteDoc(ref);
              showNotification("Question rejected and removed.", "info");
          }
          fetchPending();
          fetchStats();
      } catch (e) { showNotification("Action failed", "error"); }
  };

  const handleSaveSettings = async () => {
      try {
          await setDoc(doc(db, 'content', 'social_links'), socialLinks);
          await setDoc(doc(db, 'content', 'adsense_config'), adConfig);
          showNotification("Settings saved successfully", "success");
      } catch (e) { showNotification("Failed to save settings", "error"); }
  };

  const handleSaveHOD = async () => {
      try {
          let url = hodData.imageUrl;
          if (hodImageFile) url = await uploadToImgBB(hodImageFile);
          await setDoc(doc(db, 'content', 'hod_message'), { ...hodData, imageUrl: url });
          showNotification("HOD Content updated", "success");
      } catch (e) { showNotification("Update failed", "error"); }
  };

  const updateUserRole = async (uid: string, role: string) => {
      try {
          await updateDoc(doc(db, 'users', uid), { role });
          showNotification("User role updated", "success");
          fetchUsers();
      } catch (e) { showNotification("Failed to update role", "error"); }
  };

  const handleDeleteContent = async (id: string, type: ContentType) => {
      if (!window.confirm("Delete this item?")) return;
      try {
          let colName = type === 'news' ? 'announcements' : type === 'community' ? 'groups' : type;
          await deleteDoc(doc(db, colName, id));
          showNotification("Deleted", "info");
          fetchContent(type);
      } catch (e) { showNotification("Delete failed", "error"); }
  };

  // --- MODAL & FORM ---

  const openModal = (item: any = null) => {
      setEditingItem(item);
      setFormData(item || {});
      setFormFile(null);
      setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
          let url = formData.imageUrl;
          if (formFile) url = await uploadToImgBB(formFile);
          
          let colName = activeContent === 'news' ? 'announcements' : activeContent === 'community' ? 'groups' : activeContent;
          const payload = { ...formData, imageUrl: url };
          
          if (activeContent === 'news' && !editingItem) payload.date = new Date().toISOString();
          if (activeContent === 'gallery' && !editingItem) payload.date = new Date().toISOString();

          if (editingItem) {
              await updateDoc(doc(db, colName, editingItem.id), payload);
          } else {
              await addDoc(collection(db, colName), payload);
          }
          setIsModalOpen(false);
          fetchContent(activeContent);
          showNotification("Saved successfully", "success");
      } catch (e) { showNotification("Error saving item", "error"); }
      finally { setIsSubmitting(false); }
  };

  // --- AI ---
  const handleGenerateAI = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setGeneratedContent('');
    try {
        // Updated to use process.env as per guidelines, but checking if Vite env is available just in case
        const apiKey = process.env.API_KEY || import.meta.env.VITE_GOOGLE_GENAI_API_KEY;
        if (!apiKey) throw new Error("API Key missing");
        
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Create a university exam paper for "Adekunle Ajasin University Akungba Akoko AAUA, Department of Finance". Course Code: ${aiForm.code}. Title: ${aiForm.title}. Level: ${aiForm.level}. Year: ${aiForm.year}. Topic: ${aiForm.topic}. Structure: Official Header, Instructions, Section A (10 MCQs with answers at end), Section B (4 Theory Questions). Plain text format.`;
        
        const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        if (res.text) {
             setGeneratedContent(res.text);
             showNotification("Generated!", "success");
        }
    } catch (error: any) {
        showNotification(error.message, "error");
    } finally { setIsGenerating(false); }
  };

  const saveAiQuestion = async () => {
      if (!generatedContent) return;
      setIsSavingAi(true);
      try {
          await addDoc(collection(db, 'questions'), {
              courseCode: aiForm.code.toUpperCase(),
              courseTitle: aiForm.title,
              level: Number(aiForm.level),
              year: Number(aiForm.year),
              textContent: generatedContent,
              status: 'approved', // Admin generated, so auto-approve
              createdAt: new Date().toISOString(),
              isAiGenerated: true,
              uploadedBy: auth?.user?.id,
              uploadedByEmail: auth?.user?.email
          });
          showNotification("Saved to Database", "success");
          setGeneratedContent('');
      } catch (e) { 
          console.error(e);
          showNotification("Save failed. Check console.", "error"); 
      } finally {
          setIsSavingAi(false);
      }
  };

  // --- RENDER HELPERS ---
  const SidebarItem = ({ id, label, icon }: { id: AdminSection, label: string, icon: React.ReactNode }) => (
      <button 
        onClick={() => setActiveSection(id)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all mb-1 ${activeSection === id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
      >
          {icon} <span className="font-bold text-sm">{label}</span>
      </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
        
        {/* SIDEBAR */}
        <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-6 flex flex-col shrink-0">
            <h2 className="text-2xl font-serif font-bold text-indigo-900 mb-8 px-2">Admin Panel</h2>
            <nav className="space-y-1 flex-1">
                <SidebarItem id="dashboard" label="Overview" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>} />
                <SidebarItem id="approvals" label="Approvals" icon={<span className="relative"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{stats.pending > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full"></span>}</span>} />
                <SidebarItem id="content" label="CMS" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>} />
                <SidebarItem id="users" label="Users" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} />
                <SidebarItem id="ai" label="AI Generator" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>} />
                <SidebarItem id="settings" label="Settings" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
            </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-6 md:p-12 overflow-y-auto">
            
            {/* 1. OVERVIEW */}
            {activeSection === 'dashboard' && (
                <div className="space-y-8 animate-fade-in">
                    <h1 className="text-3xl font-bold text-slate-900">Dashboard Overview</h1>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="text-slate-500 font-bold uppercase text-xs tracking-wider">Total Users</h3>
                            <p className="text-4xl font-bold text-indigo-900 mt-2">{stats.users}</p>
                        </div>
                         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="text-slate-500 font-bold uppercase text-xs tracking-wider">Total Archives</h3>
                            <p className="text-4xl font-bold text-emerald-600 mt-2">{stats.questions}</p>
                        </div>
                         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
                            <h3 className="text-slate-500 font-bold uppercase text-xs tracking-wider">Pending Approvals</h3>
                            <p className="text-4xl font-bold text-rose-500 mt-2">{stats.pending}</p>
                            {stats.pending > 0 && <div className="absolute top-0 right-0 w-3 h-3 bg-rose-500 rounded-full animate-ping m-4"></div>}
                        </div>
                    </div>
                </div>
            )}

            {/* 2. SETTINGS (Socials & Ads) */}
            {activeSection === 'settings' && (
                <div className="max-w-2xl space-y-8 animate-fade-in">
                     <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                         <h3 className="text-xl font-bold text-slate-800 mb-6">Social Media Links</h3>
                         <div className="space-y-4">
                             <div><label className="block text-xs font-bold uppercase mb-1">Facebook URL</label><input className="w-full border p-2 rounded" value={socialLinks.facebook} onChange={e => setSocialLinks({...socialLinks, facebook: e.target.value})} /></div>
                             <div><label className="block text-xs font-bold uppercase mb-1">Twitter / X URL</label><input className="w-full border p-2 rounded" value={socialLinks.twitter} onChange={e => setSocialLinks({...socialLinks, twitter: e.target.value})} /></div>
                             <div><label className="block text-xs font-bold uppercase mb-1">Instagram URL</label><input className="w-full border p-2 rounded" value={socialLinks.instagram} onChange={e => setSocialLinks({...socialLinks, instagram: e.target.value})} /></div>
                             <div><label className="block text-xs font-bold uppercase mb-1">WhatsApp Group/Link</label><input className="w-full border p-2 rounded" value={socialLinks.whatsapp} onChange={e => setSocialLinks({...socialLinks, whatsapp: e.target.value})} /></div>
                         </div>
                     </div>
                     <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                         <h3 className="text-xl font-bold text-slate-800 mb-6">Google AdSense</h3>
                         <div className="space-y-4">
                             <div><label className="block text-xs font-bold uppercase mb-1">Publisher ID (ca-pub-xxx)</label><input className="w-full border p-2 rounded" value={adConfig.client} onChange={e => setAdConfig({...adConfig, client: e.target.value})} /></div>
                             <div><label className="block text-xs font-bold uppercase mb-1">Ad Slot ID</label><input className="w-full border p-2 rounded" value={adConfig.slot} onChange={e => setAdConfig({...adConfig, slot: e.target.value})} /></div>
                         </div>
                     </div>
                     <button onClick={handleSaveSettings} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700">Save All Settings</button>
                </div>
            )}

            {/* 3. CONTENT MANAGER */}
            {activeSection === 'content' && (
                <div className="animate-fade-in">
                    <div className="flex gap-2 mb-6 border-b border-slate-200 pb-1">
                        {['news', 'executives', 'lecturers', 'community', 'gallery'].map(c => (
                            <button key={c} onClick={() => setActiveContent(c as ContentType)} className={`px-4 py-2 font-bold text-sm capitalize rounded-t-lg ${activeContent === c ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{c}</button>
                        ))}
                    </div>
                    
                    {activeContent === 'news' && (
                        <div className="bg-white p-6 rounded-xl border border-slate-200 mb-6">
                            <h3 className="font-bold mb-4">Homepage HOD Section</h3>
                            <div className="grid gap-4">
                                <input className="border p-2 rounded" placeholder="HOD Name" value={hodData.name} onChange={e => setHodData({...hodData, name: e.target.value})} />
                                <input className="border p-2 rounded" placeholder="Title" value={hodData.title} onChange={e => setHodData({...hodData, title: e.target.value})} />
                                <textarea className="border p-2 rounded" rows={3} placeholder="Message" value={hodData.message} onChange={e => setHodData({...hodData, message: e.target.value})} />
                                <input type="file" onChange={e => e.target.files && setHodImageFile(e.target.files[0])} />
                                <button onClick={handleSaveHOD} className="bg-slate-800 text-white px-4 py-2 rounded font-bold w-fit">Update HOD Info</button>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold capitalize">{activeContent} List</h2>
                        <button onClick={() => openModal()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700">+ Add New</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {contentItems.map(item => (
                            <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                                {item.imageUrl && <img src={item.imageUrl} className="w-full h-32 object-cover rounded-lg mb-3" alt="preview" />}
                                <h4 className="font-bold">{item.title || item.name || item.caption}</h4>
                                <div className="mt-auto pt-4 flex gap-2">
                                    <button onClick={() => openModal(item)} className="text-xs font-bold text-indigo-600 border border-indigo-200 px-3 py-1 rounded">Edit</button>
                                    <button onClick={() => handleDeleteContent(item.id, activeContent)} className="text-xs font-bold text-rose-600 border border-rose-200 px-3 py-1 rounded">Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 4. APPROVALS */}
            {activeSection === 'approvals' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
                     <table className="w-full text-left text-sm">
                         <thead className="bg-slate-50 border-b"><tr><th className="p-4">Details</th><th className="p-4">User</th><th className="p-4 text-right">Action</th></tr></thead>
                         <tbody>
                             {pendingItems.map(item => (
                                 <tr key={item.id} className="border-b last:border-0">
                                     <td className="p-4">
                                         <p className="font-bold">{item.courseCode}</p>
                                         <p className="text-xs text-slate-500">{item.courseTitle} ({item.year})</p>
                                     </td>
                                     <td className="p-4 text-slate-500">{item.submittedByEmail}</td>
                                     <td className="p-4 text-right space-x-2">
                                         <button onClick={() => handleApproval(item.id, true)} className="text-emerald-600 font-bold hover:bg-emerald-50 px-3 py-1 rounded">Approve</button>
                                         <button onClick={() => handleApproval(item.id, false)} className="text-rose-600 font-bold hover:bg-rose-50 px-3 py-1 rounded">Reject</button>
                                     </td>
                                 </tr>
                             ))}
                             {pendingItems.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-slate-400">No pending items.</td></tr>}
                         </tbody>
                     </table>
                </div>
            )}

            {/* 5. USERS */}
            {activeSection === 'users' && (
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b"><tr><th className="p-4">User</th><th className="p-4">Current Role</th><th className="p-4">Change Role</th></tr></thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id} className="border-b last:border-0">
                                    <td className="p-4">
                                        <p className="font-bold">{u.name}</p>
                                        <p className="text-xs text-slate-500">{u.email}</p>
                                    </td>
                                    <td className="p-4"><span className="uppercase text-xs font-bold bg-slate-100 px-2 py-1 rounded">{u.role}</span></td>
                                    <td className="p-4">
                                        <select value={u.role} onChange={(e) => updateUserRole(u.id, e.target.value)} className="border rounded p-1 text-xs">
                                            <option value="student">Student</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            )}

            {/* 6. AI GENERATOR */}
            {activeSection === 'ai' && (
                <div className="max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-lg mb-4">Generate Question</h3>
                        <div className="space-y-4">
                            <input className="w-full border p-2 rounded" placeholder="Course Code" value={aiForm.code} onChange={e => setAiForm({...aiForm, code: e.target.value})} />
                            <input className="w-full border p-2 rounded" placeholder="Course Title" value={aiForm.title} onChange={e => setAiForm({...aiForm, title: e.target.value})} />
                            <input className="w-full border p-2 rounded" placeholder="Topic" value={aiForm.topic} onChange={e => setAiForm({...aiForm, topic: e.target.value})} />
                            <div className="flex gap-2">
                                <select className="w-1/2 border p-2 rounded" value={aiForm.level} onChange={e => setAiForm({...aiForm, level: e.target.value})}>{LEVELS.map(l => <option key={l} value={l}>{l}</option>)}</select>
                                <input className="w-1/2 border p-2 rounded" type="number" value={aiForm.year} onChange={e => setAiForm({...aiForm, year: e.target.value})} />
                            </div>
                            <button onClick={handleGenerateAI} disabled={isGenerating} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50">
                                {isGenerating ? 'Thinking...' : 'Generate with AI'}
                            </button>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col">
                        <h3 className="font-bold mb-2">Preview</h3>
                        <div className="flex-1 bg-white border p-4 rounded mb-4 overflow-y-auto h-64 whitespace-pre-wrap text-sm">
                            {generatedContent || <span className="text-slate-400 italic">Output will appear here...</span>}
                        </div>
                        <button onClick={saveAiQuestion} disabled={!generatedContent || isSavingAi} className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50">
                            {isSavingAi ? 'Saving...' : 'Save to Database'}
                        </button>
                    </div>
                </div>
            )}

        </main>

        {/* GENERIC CONTENT MODAL */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
                    <h3 className="font-bold text-xl mb-4 capitalize">{editingItem ? 'Edit' : 'Add'} {activeContent}</h3>
                    <form onSubmit={handleFormSubmit} className="space-y-4">
                        {(activeContent === 'news' || activeContent === 'community' || activeContent === 'gallery') && (
                            <input className="w-full border p-2 rounded" placeholder="Title / Name / Caption" value={formData.title || formData.name || formData.caption || ''} onChange={e => setFormData({...formData, title: e.target.value, name: e.target.value, caption: e.target.value})} required />
                        )}
                        {(activeContent === 'news' || activeContent === 'community') && (
                            <textarea className="w-full border p-2 rounded" rows={3} placeholder="Content / Description" value={formData.content || formData.description || ''} onChange={e => setFormData({...formData, content: e.target.value, description: e.target.value})} required />
                        )}
                        {(activeContent === 'executives' || activeContent === 'lecturers') && (
                            <>
                                <input className="w-full border p-2 rounded" placeholder="Name" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required />
                                <input className="w-full border p-2 rounded" placeholder="Position / Title" value={formData.position || formData.title || ''} onChange={e => setFormData({...formData, position: e.target.value, title: e.target.value})} required />
                            </>
                        )}
                        <div className="border-t pt-4">
                            <label className="block text-xs font-bold mb-2">Upload Image (Optional)</label>
                            <input type="file" onChange={e => e.target.files && setFormFile(e.target.files[0])} />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-bold">Cancel</button>
                            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded">Save</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};