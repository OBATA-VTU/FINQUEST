
import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { GoogleGenAI } from "@google/genai";
import { useNotification } from '../contexts/NotificationContext';
import { db } from '../firebase';
import { doc, updateDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { Announcement } from '../types';

interface ChatMessage {
    role: 'user' | 'bee';
    text: string;
    image?: string;
    timestamp: number;
}

// Simple Markdown Parser for Professional Rendering
const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
    const renderContent = () => {
        return text
            .replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-indigo-900 dark:text-white">$1</strong>')
            .replace(/_(.*?)_/g, '<em class="italic">$1</em>')
            .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc mb-1">$1</li>')
            .replace(/^\d\. (.*$)/gim, '<li class="ml-4 list-decimal mb-1">$1</li>')
            .replace(/\n/g, '<br />');
    };
    return <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: renderContent() }} />;
};

export const AIPage: React.FC = () => {
    const auth = useContext(AuthContext);
    const { showNotification } = useNotification();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [siteContext, setSiteContext] = useState<string>('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const user = auth?.user;
    const today = new Date().toISOString().split('T')[0];

    // Initialize/Refresh Credits
    useEffect(() => {
        const initializeCredits = async () => {
            if (!user) return;
            if (user.lastCreditRefreshDate !== today) {
                const updates = { aiCredits: 1000, lastCreditRefreshDate: today };
                await updateDoc(doc(db, 'users', user.id), updates);
                auth?.updateUser(updates);
            }
        };
        initializeCredits();
    }, [user?.id, today]);

    // Auto-scroll logic
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    // Fetch site context (News and Features)
    useEffect(() => {
        const fetchContext = async () => {
            try {
                const newsSnap = await getDocs(query(collection(db, 'announcements'), orderBy('date', 'desc'), limit(5)));
                const news = newsSnap.docs.map(d => (d.data() as Announcement).title).join(', ');

                setSiteContext(`
                    CURRENT FEATURES: Dashboard, CBT Practice (Mock/AI Quizzes), Academic Vault (Archives), Student Lounge, Marketplace, Lost & Found.
                    LATEST NEWS: ${news || 'Standard updates.'}
                    OWNERSHIP: Owned by Dept of Finance AAUA. Initiated by Comr Sidiku Michael Boluwatife admin. Developed by OBA (PRO 2025/2026).
                `);
            } catch (e) {}
        };
        fetchContext();
    }, []);

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!user || (!input.trim() && !imageFile) || isLoading) return;

        const creditCost = imageFile ? 400 : 10;
        const currentCredits = user.aiCredits ?? 0;

        if (currentCredits < creditCost) {
            showNotification(`Low Credits! You need ${creditCost} Bee Power. Resets daily.`, "warning");
            return;
        }

        setIsLoading(true);
        const userMsgText = input.trim();
        const currentImage = imageFile;
        setInput('');
        setImageFile(null);

        const userMsg: ChatMessage = { role: 'user', text: userMsgText, timestamp: Date.now() };
        if (currentImage) userMsg.image = URL.createObjectURL(currentImage);
        setMessages(prev => [...prev, userMsg]);

        try {
            let base64Image = '';
            if (currentImage) {
                const reader = new FileReader();
                base64Image = await new Promise((resolve) => {
                    reader.onload = () => resolve((reader.result as string).split(',')[1]);
                    reader.readAsDataURL(currentImage);
                });
            }

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const modelParams = {
                model: 'gemini-3-flash-preview',
                contents: [{
                    parts: [
                        { text: `IDENTITY: You are Bee 🐝, the verified mascot and interactive AI for the Finance Department, AAUA.
                                 PERSONA: Be witty, helpful, and concise. Don't repeat user's level back to them. Be natural.
                                 STRICT RULES: 
                                 - Do NOT say "As a [Level] student" or "Hello [User]" in every reply.
                                 - Only mention OBA or the Michael administration IF the user specifically asks who made you or who owns the site.
                                 - Use Markdown: **bold** for emphasis, numbered lists for steps.
                                 
                                 CONTEXT: ${siteContext}
                                 USER: ${user.username}
                                 MESSAGE: ${userMsgText}` },
                        ...(base64Image ? [{ inlineData: { data: base64Image, mimeType: currentImage!.type } }] : [])
                    ]
                }]
            };

            const result = await ai.models.generateContent(modelParams);
            const responseText = result.text || "I'm currently recalibrating my wings. Try again?";

            // Deduct Credits
            const newCredits = Math.max(0, currentCredits - creditCost);
            await updateDoc(doc(db, 'users', user.id), { aiCredits: newCredits });
            auth?.updateUser({ aiCredits: newCredits });
            
            setMessages(prev => [...prev, { role: 'bee', text: responseText, timestamp: Date.now() }]);
        } catch (error: any) {
            showNotification("Connection lost. Credits preserved.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors overflow-hidden relative">
            {/* Animated Background */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-20 dark:opacity-10 overflow-hidden">
                <div className="absolute top-10 left-10 animate-bounce-slow">🐝</div>
                <div className="absolute bottom-20 right-10 animate-pulse" style={{ animationDelay: '2s' }}>🐝</div>
                <div className="absolute top-1/2 left-1/3 animate-float opacity-50">💸</div>
                <div className="absolute top-1/4 right-1/4 animate-bounce-slow" style={{ animationDelay: '1s' }}>🐝</div>
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="bee-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                            <path d="M10 10L90 90M90 10L10 90" stroke="currentColor" strokeWidth="0.5" className="text-indigo-500" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#bee-pattern)" />
                </svg>
            </div>

            {/* AI Header */}
            <div className="p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-sm shrink-0 z-20">
                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-2xl shadow-lg animate-bounce-slow">🐝</div>
                <div className="flex-1 min-w-0">
                    <h1 className="font-black text-slate-900 dark:text-white truncate text-sm">Bee Assistant</h1>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Executive Council 25/26</p>
                </div>
                {/* Credit Gauge */}
                <div className="text-right">
                    <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/50 px-3 py-1.5 rounded-full border border-indigo-100 dark:border-indigo-800">
                        <svg className="w-3 h-3 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM5.884 6.607a1 1 0 011.414 0l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zm2.12 8.485a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 110 2 1 1 0 010-2z" /></svg>
                        <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300">{user?.aiCredits ?? 0} <span className="opacity-60">Pts</span></span>
                    </div>
                </div>
            </div>

            {/* Chat History */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth z-10">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-10 opacity-40">
                        <div className="text-6xl mb-4">✨</div>
                        <p className="font-bold text-slate-500 max-w-xs uppercase tracking-widest text-[10px]">Bee is ready to assist. Type a question or upload an image of a past question.</p>
                    </div>
                )}
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-pop-in`}>
                        <div className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none'}`}>
                            {msg.image && <img src={msg.image} alt="Evidence" className="rounded-xl mb-2.5 max-h-48 w-auto object-contain mx-auto shadow-inner" />}
                            <MarkdownRenderer text={msg.text} />
                            <span className="block text-[8px] mt-2 opacity-40 text-right uppercase font-bold">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start animate-pulse">
                        <div className="bg-white dark:bg-slate-800 p-3 px-5 rounded-2xl rounded-tl-none flex gap-2 items-center border border-slate-100 dark:border-slate-700">
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 z-20 shadow-2xl safe-p-bottom">
                <div className="max-w-4xl mx-auto">
                    {imageFile && (
                        <div className="mb-2 p-2 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl flex items-center justify-between border border-indigo-200 dark:border-indigo-800 animate-pop-in">
                            <div className="flex items-center gap-2">
                                <img src={URL.createObjectURL(imageFile)} className="w-8 h-8 object-cover rounded-lg" />
                                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">Image Analysis (400 Credits)</span>
                            </div>
                            <button onClick={() => setImageFile(null)} className="p-1 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-full">✕</button>
                        </div>
                    )}
                    <form onSubmit={handleSend} className="flex items-end gap-2">
                        <button 
                            type="button" 
                            onClick={() => fileInputRef.current?.click()}
                            className="p-3.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors active:scale-90"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && setImageFile(e.target.files[0])} />
                        
                        <textarea 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder={`Message Bee... (10 Pts)`}
                            className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none max-h-32 text-sm dark:text-white shadow-inner transition-all"
                            rows={1}
                        />
                        
                        <button 
                            type="submit" 
                            disabled={isLoading || (!input.trim() && !imageFile)}
                            className="p-3.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-30 transition-all shadow-lg active:scale-90"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <svg className="w-5 h-5 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
