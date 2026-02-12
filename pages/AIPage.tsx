
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

const BeeIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L7 7H17L12 2Z" />
        <path d="M12 22V12" />
        <path d="M12 12L17 17H7L12 12Z" />
        <circle cx="12" cy="12" r="3" />
        <path d="M5 8C5 8 2 10 2 12C2 14 5 16 5 16" />
        <path d="M19 8C19 8 22 10 22 12C22 14 19 16 19 16" />
    </svg>
);

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
                    OWNERSHIP: Owned by Dept of Finance AAUA. Initiated by Michael Boluwatife administration. Developed by OBA (PRO).
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
            showNotification(`Low Bee Power! You need ${creditCost} pts. Resets daily.`, "warning");
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
                        { text: `IDENTITY: You are Bee, the mascot and expert AI for the Finance Department at AAUA.
                                 PERSONA: Be interactive, conversational, and concise. Stop repeated standard greetings about user level. Be witty like a departmental colleague.
                                 STRICT RULES: 
                                 - Do NOT start every reply with "As a [Level] student...".
                                 - Only mention the administration or creators IF asked explicitly about origins.
                                 - Use professional Markdown for formatting (**bold**, lists, etc.).
                                 
                                 CONTEXT: ${siteContext}
                                 USER: ${user.username}
                                 MESSAGE: ${userMsgText}` },
                        ...(base64Image ? [{ inlineData: { data: base64Image, mimeType: currentImage!.type } }] : [])
                    ]
                }]
            };

            const result = await ai.models.generateContent(modelParams);
            const responseText = result.text || "I'm momentarily disconnected from the network. Try again shortly?";

            // Deduct Credits
            const newCredits = Math.max(0, currentCredits - creditCost);
            await updateDoc(doc(db, 'users', user.id), { aiCredits: newCredits });
            auth?.updateUser({ aiCredits: newCredits });
            
            setMessages(prev => [...prev, { role: 'bee', text: responseText, timestamp: Date.now() }]);
        } catch (error: any) {
            showNotification("Processing failed. Credits preserved.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[100dvh] bg-slate-50 dark:bg-slate-950 transition-colors overflow-hidden relative">
            {/* Animated SVG Background */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-20 dark:opacity-5 overflow-hidden">
                <div className="absolute top-[10%] left-[10%] animate-bounce-slow text-indigo-500">
                    <BeeIcon className="w-12 h-12" />
                </div>
                <div className="absolute bottom-[20%] right-[10%] animate-pulse text-indigo-500" style={{ animationDelay: '2s' }}>
                    <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22m11-11H1" /></svg>
                </div>
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="hex-pattern" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                            <path d="M40 0L80 20V60L40 80L0 60V20L40 0Z" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-indigo-400" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#hex-pattern)" />
                </svg>
            </div>

            {/* AI Header */}
            <div className="p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-sm shrink-0 z-20">
                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg animate-bounce-slow">
                    <BeeIcon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="font-black text-slate-900 dark:text-white truncate text-sm">Bee (FINSA AI)</h1>
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Active Intelligence</span>
                    </div>
                </div>
                {/* Credit Gauge */}
                <div className="text-right">
                    <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/50 px-3 py-1.5 rounded-full border border-indigo-100 dark:border-indigo-800">
                        <svg className="w-3 h-3 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300">{user?.aiCredits ?? 0} <span className="opacity-60">PTS</span></span>
                    </div>
                </div>
            </div>

            {/* Chat History */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth z-10 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-10 opacity-30">
                        <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-6">
                            <BeeIcon className="w-10 h-10 text-slate-400" />
                        </div>
                        <p className="font-bold text-slate-500 max-w-xs uppercase tracking-[0.2em] text-[10px] leading-relaxed">Intelligence Engine Ready. Ask about department policies, exams, or upload a question paper for analysis.</p>
                    </div>
                )}
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-pop-in`}>
                        <div className={`max-w-[88%] rounded-2xl p-4 shadow-sm relative ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none'}`}>
                            {msg.image && <img src={msg.image} alt="Uploaded Resource" className="rounded-xl mb-3 max-h-56 w-auto object-contain mx-auto shadow-inner border border-black/5" />}
                            <MarkdownRenderer text={msg.text} />
                            <div className="mt-2 flex items-center justify-end gap-1.5 opacity-40">
                                <span className="text-[8px] font-black uppercase tracking-tighter">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {msg.role === 'user' && <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                            </div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start animate-pulse">
                        <div className="bg-white dark:bg-slate-800 p-3 px-5 rounded-2xl rounded-tl-none flex gap-2 items-center border border-slate-100 dark:border-slate-700 shadow-sm">
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Bar - Pinned to Bottom */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 z-20 shadow-2xl safe-p-bottom">
                <div className="max-w-4xl mx-auto">
                    {imageFile && (
                        <div className="mb-2 p-2 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl flex items-center justify-between border border-indigo-200 dark:border-indigo-800 animate-pop-in">
                            <div className="flex items-center gap-2">
                                <img src={URL.createObjectURL(imageFile)} className="w-8 h-8 object-cover rounded-lg border border-indigo-200" alt="Preview" />
                                <div>
                                    <span className="text-[9px] block font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Image Analysis</span>
                                    <span className="text-[8px] text-slate-500 font-bold uppercase">Cost: 400 Credits</span>
                                </div>
                            </div>
                            <button onClick={() => setImageFile(null)} className="p-2 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-full transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    )}
                    <form onSubmit={handleSend} className="flex items-end gap-2">
                        <button 
                            type="button" 
                            onClick={() => fileInputRef.current?.click()}
                            className="p-3.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors active:scale-90"
                            title="Analyze Image"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && setImageFile(e.target.files[0])} />
                        
                        <div className="flex-1 relative">
                            <textarea 
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder={`Ask Bee... (10 pts)`}
                                className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none max-h-32 text-sm dark:text-white shadow-inner transition-all scrollbar-hide border border-transparent focus:border-indigo-200"
                                rows={1}
                            />
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={isLoading || (!input.trim() && !imageFile)}
                            className="p-3.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-30 transition-all shadow-lg active:scale-95 group"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <svg className="w-5 h-5 translate-x-0.5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
