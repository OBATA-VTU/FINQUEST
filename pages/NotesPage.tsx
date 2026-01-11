import React, { useState, useEffect, useContext, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

// Simple Markdown to HTML Renderer Component
const MarkdownRenderer: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
    const createMarkup = () => {
        if (!text) return { __html: '' };
        // Chain of replacements for markdown syntax
        const html = text
            .replace(/</g, "&lt;").replace(/>/g, "&gt;") // Escape HTML tags first
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/_(.*?)_/g, '<em>$1</em>')
            .replace(/~~(.*?)~~/g, '<s>$1</s>')
            .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold mt-2 mb-1">$1</h2>')
            .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
            .replace(/\n/g, '<br />')
            // Cleanup: remove <br> before lists/headings
            .replace(/<br \/>(<h2|<li)/g, '$1')
            .replace(/(<\/h2>|<\/li>)<br \/>/g, '$1');

        return { __html: html };
    };
    return <div className={className} dangerouslySetInnerHTML={createMarkup()} />;
};

interface Note {
    id: string;
    title: string;
    content: string;
    createdAt: string;
}

export const NotesPage: React.FC = () => {
    const auth = useContext(AuthContext);
    const { showNotification } = useNotification();
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState<Note | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    
    // Form State
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        fetchNotes();
    }, [auth?.user?.id]);

    const fetchNotes = async () => {
        if (!auth?.user) return;
        setLoading(true);
        try {
            const q = query(collection(db, 'notes'), where('userId', '==', auth.user.id));
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Note));
            // Sort client side by date desc
            data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setNotes(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth?.user) return;

        if (!title.trim()) {
            showNotification("Title cannot be empty.", "warning");
            return;
        }
        
        try {
            if (isEditing) {
                await updateDoc(doc(db, 'notes', isEditing.id), {
                    title, content
                });
                showNotification("Note updated", "success");
            } else {
                await addDoc(collection(db, 'notes'), {
                    userId: auth.user.id,
                    title,
                    content,
                    createdAt: new Date().toISOString()
                });
                showNotification("Note created", "success");
            }
            closeModal();
            fetchNotes();
        } catch (e) {
            showNotification("Failed to save note", "error");
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Delete this note?")) return;
        try {
            await deleteDoc(doc(db, 'notes', id));
            setNotes(prev => prev.filter(n => n.id !== id));
            showNotification("Note deleted", "info");
        } catch (e) {
            showNotification("Failed to delete", "error");
        }
    };

    const openModal = (note?: Note) => {
        if (note) {
            setIsEditing(note);
            setTitle(note.title);
            setContent(note.content);
        } else {
            setIsCreating(true);
            setTitle('');
            setContent('');
        }
    };

    const closeModal = () => {
        setIsEditing(null);
        setIsCreating(false);
    };

    const applyFormat = (format: 'bold' | 'italic' | 'strike' | 'h2' | 'ul') => {
        const textarea = textAreaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);

        let prefix = '', suffix = '';
        switch (format) {
            case 'bold': prefix = '**'; suffix = '**'; break;
            case 'italic': prefix = '_'; suffix = '_'; break;
            case 'strike': prefix = '~~'; suffix = '~~'; break;
            case 'h2': prefix = '\n## '; suffix = '\n'; break;
            case 'ul': prefix = '\n- '; suffix = ''; break;
        }

        const newText = 
            content.substring(0, start) + 
            prefix + 
            (selectedText || '') + 
            suffix + 
            content.substring(end);

        setContent(newText);
        
        setTimeout(() => {
            textarea.focus();
            if (selectedText) {
                textarea.setSelectionRange(start + prefix.length, end + prefix.length);
            } else {
                textarea.setSelectionRange(start + prefix.length, start + prefix.length);
            }
        }, 0);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 transition-colors animate-fade-in">
            <div className="container mx-auto max-w-6xl">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">My Notes</h1>
                        <p className="text-slate-500 dark:text-slate-400">Private study notes and reminders.</p>
                    </div>
                    <button 
                        onClick={() => openModal()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-transform hover:-translate-y-1 flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        New Note
                    </button>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1,2,3].map(i => <div key={i} className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"></div>)}
                    </div>
                ) : notes.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 animate-fade-in-up">
                        <div className="text-6xl mb-4">📝</div>
                        <h3 className="text-xl font-bold text-slate-700 dark:text-white mb-2">No notes yet</h3>
                        <p className="text-slate-500 dark:text-slate-400">Jot down key points from lectures or tests.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                        {notes.map((note, idx) => (
                            <div 
                                key={note.id} 
                                className="bg-yellow-50 dark:bg-slate-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 group relative border border-yellow-100 dark:border-slate-700"
                                style={{ animationDelay: `${idx * 100}ms` }}
                            >
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button onClick={() => openModal(note)} className="p-2 bg-white/50 dark:bg-slate-700/50 rounded-full hover:bg-white text-indigo-600"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                    <button onClick={() => handleDelete(note.id)} className="p-2 bg-white/50 dark:bg-slate-700/50 rounded-full hover:bg-white text-rose-600"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                </div>
                                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-3 pr-16">{note.title}</h3>
                                <MarkdownRenderer text={note.content} className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed max-h-40 overflow-hidden" />
                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-4 uppercase tracking-widest">{new Date(note.createdAt).toLocaleDateString()}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Modal */}
                {(isCreating || isEditing) && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeModal}>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in-down" onClick={e => e.stopPropagation()}>
                            <form onSubmit={handleSave} className="flex flex-col h-[80vh] md:h-auto">
                                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                    <h3 className="font-bold text-xl text-slate-800 dark:text-white">{isEditing ? 'Edit Note' : 'New Note'}</h3>
                                    <button type="button" onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                                </div>
                                <div className="p-6 flex-1 overflow-y-auto">
                                    <input 
                                        className="w-full text-2xl font-bold bg-transparent outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 text-slate-800 dark:text-white mb-4" 
                                        placeholder="Title" 
                                        value={title} 
                                        onChange={e => setTitle(e.target.value)} 
                                        required 
                                        autoFocus
                                    />
                                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                        <div className="p-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-1 bg-slate-50 dark:bg-slate-800 flex-wrap">
                                            <button type="button" onClick={() => applyFormat('bold')} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 w-9 h-9 flex items-center justify-center font-bold" title="Bold">B</button>
                                            <button type="button" onClick={() => applyFormat('italic')} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 w-9 h-9 flex items-center justify-center italic font-serif" title="Italic">I</button>
                                            <button type="button" onClick={() => applyFormat('strike')} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 w-9 h-9 flex items-center justify-center line-through" title="Strikethrough">S</button>
                                            <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                                            <button type="button" onClick={() => applyFormat('h2')} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 w-9 h-9 flex items-center justify-center font-bold text-sm" title="Heading">H2</button>
                                            <button type="button" onClick={() => applyFormat('ul')} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 w-9 h-9 flex items-center justify-center" title="List Item">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" /></svg>
                                            </button>
                                        </div>
                                        <textarea 
                                            ref={textAreaRef}
                                            className="w-full h-64 p-4 resize-none bg-transparent outline-none text-slate-600 dark:text-slate-300 leading-relaxed" 
                                            placeholder="Start typing..." 
                                            value={content} 
                                            onChange={e => setContent(e.target.value)} 
                                            required 
                                        />
                                    </div>
                                </div>
                                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
                                    <button type="button" onClick={closeModal} className="px-6 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition">Cancel</button>
                                    <button type="submit" className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition shadow-lg">Save Note</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};