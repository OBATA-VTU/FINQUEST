
import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { GoogleGenAI } from "@google/genai";
import { useNotification } from '../contexts/NotificationContext';
import { db } from '../firebase';
import { doc, updateDoc, collection, getDocs, getDoc, setDoc } from 'firebase/firestore';
import { Executive, Lecturer, User, AiSettings } from '../types';

interface ChatMessage {
    role: 'user' | 'bee';
    text: string;
    image?: string;
    timestamp: number;
    isStreaming?: boolean;
}

const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
    const renderContent = () => {
        return text
            .replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-indigo-900 dark:text-white">$1</strong>')
            .replace(/_(.*?)_/g, '<em class="italic">$1</em>')
            .replace(/^###\s*(.*$)/gim, '<h3 class="text-base font-black text-indigo-800 dark:text-indigo-400 mt-3 mb-1 uppercase tracking-wider">$1</h3>')
            .replace(/^##\s*(.*$)/gim, '<h2 class="text-lg font-black text-indigo-900 dark:text-white mt-4 mb-2 border-b border-indigo-100 dark:border-slate-700 pb-1">$1</h2>')
            .replace(/^#\s*(.*$)/gim, '<h1 class="text-xl font-black text-indigo-950 dark:text-white mt-6 mb-3">$1</h1>')
            .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc mb-1">$1</li>')
            .replace(/^\d\. (.*$)/gim, '<li class="ml-4 list-decimal mb-1">$1</li>')
            .replace(/\n/g, '<br />');
    };
    return <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: renderContent() }} />;
};

const BeeIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L7 7H17L12 2Z" />
        <path d="M12 22V12" />
        <path d="M12 12L17 17H7L12 12Z" />
        <circle cx="12" cy="12" r="3" />
        <path d="M5 8C5 8 2 10 2 12C2 14 5 16 5 16" />
        <path d="M19 8C19 8 22 10 22 12C22 14 19 16 19 16" />
    </svg>
);

const TypingDots = () => (
    <div className="flex gap-1 items-center px-1">
        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
    </div>
);

export const AIPage: React.FC = () => {
    const auth = useContext(AuthContext);
    const { showNotification } = useNotification();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [aiStatus, setAiStatus] = useState<AiSettings | null>(null);
    const [timeUntilReset, setTimeUntilReset] = useState<string>('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const user = auth?.user;

    useEffect(() => {
        const fetchAiStatus = async () => {
            try {
                const statusDoc = await getDoc(doc(db, 'config', 'ai_settings'));
                if (statusDoc.exists()) {
                    setAiStatus(statusDoc.data() as AiSettings);
                } else {
                    setAiStatus({ isAvailable: true });
                }
            } catch (e) {
                console.error("Failed to fetch AI status", e);
                setAiStatus({ isAvailable: true });
            }
        };
        fetchAiStatus();
        
        // Calculate time until next UTC midnight (roughly when Google resets quotas)
        const calculateResetTime = () => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setUTCHours(24, 0, 0, 0);
            const diff = tomorrow.getTime() - now.getTime();
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff / (1000 * 60)) % 60);
            setTimeUntilReset(`${hours}h ${minutes}m`);
        };
        calculateResetTime();
        const interval = setInterval(calculateResetTime, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const performDeepSearch = async (queryText: string) => {
        const nameMatch = queryText.match(/(?:who is|about|know|search for)\s+([a-zA-Z\s]+)/i);
        const searchName = nameMatch ? nameMatch[1].trim() : queryText.trim();
        if (searchName.length < 2) return null;

        try {
            let contextString = "DATABASE SEARCH RESULTS:\n";
            let foundCount = 0;

            const userSnap = await getDocs(collection(db, 'users'));
            const matchingUsers = userSnap.docs
                .map(d => ({ id: d.id, ...d.data() } as User))
                .filter(u => 
                    (u.name && u.name.toLowerCase().includes(searchName.toLowerCase())) || 
                    (u.username && u.username.toLowerCase().includes(searchName.toLowerCase()))
                );
            
            matchingUsers.forEach(u => {
                const maskedMatric = u.matricNumber ? u.matricNumber.slice(0, -3) + '***' : 'N/A';
                contextString += `- USER: Full Name: ${u.name}, Level: ${u.level}, Username: @${u.username}, ID: ${maskedMatric}\n`;
                foundCount++;
            });

            const execSnap = await getDocs(collection(db, 'executives'));
            const matchingExecs = execSnap.docs
                .map(d => ({ id: d.id, ...d.data() } as Executive))
                .filter(e => e.name && e.name.toLowerCase().includes(searchName.toLowerCase()));
            
            matchingExecs.forEach(e => {
                contextString += `- EXECUTIVE: Name: ${e.name}, Position: ${e.position}, Level: ${e.level}\n`;
                foundCount++;
            });

            const lectSnap = await getDocs(collection(db, 'lecturers'));
            const matchingLect = lectSnap.docs
                .map(d => ({ id: d.id, ...d.data() } as Lecturer))
                .filter(l => l.name && l.name.toLowerCase().includes(searchName.toLowerCase()));
            
            matchingLect.forEach(l => {
                contextString += `- LECTURER: Name: ${l.name}, Title: ${l.title}, Specialization/Courses: ${l.specialization || 'Finance'}\n`;
                foundCount++;
            });

            return foundCount > 0 ? contextString : "No records found for this name in the departmental database.";
        } catch (e) { return "Search error occurred."; }
    };

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!user || (!input.trim() && !imageFile) || isLoading) return;
        if (aiStatus && !aiStatus.isAvailable) {
            showNotification("Bee is currently offline for maintenance.", "warning");
            return;
        }

        const creditCost = imageFile ? 400 : 30;
        const currentCredits = user.aiCredits ?? 0;

        if (currentCredits < creditCost) {
            showNotification(`Insufficient Credits. You need ${creditCost} pts.`, "warning");
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
            const dbContext = await performDeepSearch(userMsgText);
            let base64Image = '';
            if (currentImage) {
                const reader = new FileReader();
                base64Image = await new Promise((resolve) => {
                    reader.onload = () => resolve((reader.result as string).split(',')[1]);
                    reader.readAsDataURL(currentImage);
                });
            }

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const result = await ai.models.generateContentStream({
                model: 'gemini-3-flash-preview',
                contents: [{
                    parts: [
                        { text: `IDENTITY: Bee, official mascot for the Dept of Finance, AAUA.
                                 STRICT RULES:
                                 1. PEOPLE INQUIRIES: If the user asks "Who is [Name]", strictly use the provided DATABASE SEARCH RESULTS below. 
                                    - If match found: State Full Name, Level, and specific Role/Title.
                                    - NEVER reveal full IDs. Masked version provided.
                                    - IF NO MATCH: Say "The person you requested is not known or registered in our departmental records." 
                                 2. Powered by Maths Teacher led administration.
                                 3. REPETITION: Don't mention user's level repeatedly.
                                 ${dbContext ? `DATA CONTEXT: ${dbContext}` : ''}
                                 USER: ${user.username}` },
                        ...(base64Image ? [{ inlineData: { data: base64Image, mimeType: currentImage!.type } }] : [])
                    ]
                }, { role: 'user', parts: [{ text: userMsgText }] }]
            });

            const beeMsg: ChatMessage = { role: 'bee', text: '', timestamp: Date.now(), isStreaming: true };
            setMessages(prev => [...prev, beeMsg]);

            let fullText = '';
            let deductionDone = false;

            for await (const chunk of result) {
                if (!deductionDone) {
                    const newCredits = Math.max(0, currentCredits - creditCost);
                    await updateDoc(doc(db, 'users', user.id), { aiCredits: newCredits });
                    auth?.updateUser({ aiCredits: newCredits });
                    deductionDone = true;
                }

                const chunkText = chunk.text;
                if (chunkText) {
                    fullText += chunkText;
                    setMessages(prev => {
                        const newMsgs = [...prev];
                        const last = newMsgs[newMsgs.length - 1];
                        if (last && last.role === 'bee') last.text = fullText;
                        return newMsgs;
                    });
                }
            }
            setMessages(prev => {
                const newMsgs = [...prev];
                const last = newMsgs[newMsgs.length - 1];
                if (last && last.role === 'bee') last.isStreaming = false;
                return newMsgs;
            });
        } catch (error: any) {
            console.error("AI Error:", error);
            const errorMessage = error.message?.toLowerCase() || "";
            if (errorMessage.includes("quota") || errorMessage.includes("429") || errorMessage.includes("limit reached")) {
                showNotification("Bee's API Key is exhausted. System shutting down for all users.", "error");
                await setDoc(doc(db, 'config', 'ai_settings'), {
                    isAvailable: false,
                    shutdownReason: "API Quota Exhausted",
                    lastExhaustionDate: new Date().toISOString()
                }, { merge: true });
                setAiStatus({ isAvailable: false, shutdownReason: "API Quota Exhausted" });
            } else {
                showNotification("Bee engine encountered an issue. Credits not deducted.", "error");
            }
            setMessages(prev => prev.filter(m => m.role !== 'bee' || m.text !== ''));
        }
        finally { setIsLoading(false); }
    };

    if (aiStatus && !aiStatus.isAvailable) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-slate-50 dark:bg-slate-950 p-10 text-center animate-fade-in transition-colors">
                <div className="w-32 h-32 bg-rose-100 dark:bg-rose-900/30 rounded-[3rem] flex items-center justify-center text-rose-500 mb-10 border-4 border-rose-200 dark:border-rose-800 shadow-2xl animate-pulse">
                    <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4 uppercase tracking-tighter">CREDITS EXHAUSTED</h1>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed font-bold uppercase tracking-widest text-xs">
                    The departmental AI engine has reached its daily intelligence quota. 
                </p>
                <div className="mt-12 space-y-4">
                    <div className="px-10 py-5 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl inline-block">
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-2">CHECK BACK IN</p>
                        <p className="text-3xl font-black text-slate-900 dark:text-white font-mono">{timeUntilReset}</p>
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Global Reset occurs at 00:00 UTC</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors overflow-hidden relative">
            <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-sm shrink-0 z-20">
                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg shrink-0">
                    <BeeIcon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="font-black text-slate-900 dark:text-white truncate text-sm">Bee (FINSA AI)</h1>
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Powered by Maths Teacher led administration</span>
                    </div>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/50 px-3 py-1.5 rounded-full border border-indigo-100 dark:border-indigo-800 flex items-center gap-1.5">
                    <svg className="w-3 h-3 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300">{user?.aiCredits ?? 0}</span>
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth z-10 custom-scrollbar bg-white dark:bg-slate-950">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-30 px-10">
                        <BeeIcon className="w-12 h-12 text-slate-400 mb-4" />
                        <p className="font-bold text-slate-500 uppercase tracking-[0.2em] text-[10px]">Academic Intelligence Online. Ask anything.</p>
                    </div>
                )}
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                        <div className={`max-w-[88%] md:max-w-[75%] rounded-2xl p-4 shadow-sm relative ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-slate-700'}`}>
                            {msg.image && <img src={msg.image} alt="Upload" className="rounded-xl mb-3 max-h-56 w-auto object-contain mx-auto border border-black/5" />}
                            {msg.role === 'bee' && msg.text === '' ? <TypingDots /> : <MarkdownRenderer text={msg.text} />}
                            <div className="mt-2 text-[8px] font-black uppercase opacity-40 text-right">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 z-20 shadow-2xl pb-safe md:pb-4">
                <div className="max-w-5xl mx-auto">
                    {imageFile && (
                        <div className="mb-2 p-2 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl flex items-center justify-between border border-indigo-100 dark:border-indigo-800 animate-pop-in">
                            <div className="flex items-center gap-2">
                                <img src={URL.createObjectURL(imageFile)} className="w-8 h-8 object-cover rounded-lg" alt="Preview" />
                                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Image Analysis</span>
                            </div>
                            <button onClick={() => setImageFile(null)} className="p-1 text-rose-500 hover:bg-rose-100 rounded-full"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                    )}
                    <form onSubmit={handleSend} className="flex items-end gap-2">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && setImageFile(e.target.files[0])} />
                        <textarea 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder="Inquiry or academic task (30 pts)"
                            className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none max-h-32 text-sm dark:text-white transition-all shadow-inner border border-transparent"
                            rows={1}
                        />
                        <button type="submit" disabled={isLoading || (!input.trim() && !imageFile)} className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-30 transition-all shadow-lg shrink-0 active:scale-95">
                            {isLoading ? <div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin"></div> : <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
