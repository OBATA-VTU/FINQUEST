import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { GoogleGenAI } from "@google/genai";
import { useNotification } from '../contexts/NotificationContext';
import { db } from '../firebase';
import { doc, updateDoc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { uploadToImgBB } from '../utils/api';
import { Announcement } from '../types';

interface ChatMessage {
    role: 'user' | 'bee';
    text: string;
    image?: string;
    timestamp: number;
}

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

    // Auto-scroll logic - refined for mobile stability
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    // Enhanced Site Intelligence: Fetch News and Features context
    useEffect(() => {
        const fetchContext = async () => {
            try {
                // 1. Fetch latest 5 announcements for Bee to read
                const newsSnap = await getDocs(query(collection(db, 'announcements'), orderBy('date', 'desc'), limit(5)));
                const newsContext = newsSnap.docs.map(d => {
                    const data = d.data() as Announcement;
                    return `- [NEWS] ${data.title}: ${data.content.substring(0, 150)}...`;
                }).join('\n');

                // 2. Build the full feature map
                const featuresMap = `
                    PORTAL FEATURES GUIDE:
                    1. Dashboard (/dashboard): User overview, points tracker, test history.
                    2. FINSA AI (Bee): Currently active page. AI support for academic/finance queries.
                    3. CBT Practice Hub (/test): Contains Official Mock Exams, AI Topic Quizzes, and AI Study Notes Generator.
                    4. Resources Archives (/questions): Repository for verified past questions and lecture notes.
                    5. Student Lounge (/community): Live community chat for students.
                    6. Marketplace (/marketplace): Platform to buy/sell items within the department.
                    7. Lost & Found (/lost-and-found): Post or find missing items on campus.
                    8. News & Updates (/announcements): Official bulletins and intelligence reports.
                    9. Gallery (/gallery): Photos of department milestones.
                    10. Directory: Lists of Executives (/executives) and Lecturers (/lecturers).
                `;

                const ownershipInfo = `
                    OWNERSHIP & CREDITS:
                    - Owner: Department of Finance AAUA Chapter.
                    - Administration: Brought up by the COMR Sidiku Michael Boluwatife administration.
                    - Developer: OBA (Boluwatife Oluwapelumi) developed the website, the AI system, and all other features.
                `;

                setSiteContext(`${ownershipInfo}\n${featuresMap}\nLATEST NEWS:\n${newsContext || 'No recent news.'}`);
            } catch (e) {
                console.error("Context fetch failed", e);
            }
        };
        fetchContext();
    }, []);

    // Initial greeting
    useEffect(() => {
        if (user) {
            setMessages([{
                role: 'bee',
                text: `Hi ${user.username}! 🐝 I'm your official departmental assistant. I have full access to everything on this portal—from the latest news to our CBT features. How can I help you today?`,
                timestamp: Date.now()
            }]);
        }
    }, [user?.username]);

    const handleBanUser = async () => {
        if (!user) return;
        const banUntilDate = new Date();
        banUntilDate.setDate(banUntilDate.getDate() + 7);
        try {
            await updateDoc(doc(db, 'users', user.id), { isBanned: true, banUntil: banUntilDate.toISOString() });
            showNotification("Your account has been suspended for 1 week for violating safety policies.", "error");
            setTimeout(() => auth?.logout(), 3000);
        } catch (e) {}
    };

    const moderateText = (text: string) => {
        const triggers = ['fuck', 'dick', 'suck', 'sex', 'porn', 'pussy', 'nude', 'penis', 'vagina'];
        return triggers.some(t => text.toLowerCase().includes(t));
    };

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!user || (!input.trim() && !imageFile) || isLoading) return;

        if (moderateText(input)) {
            await handleBanUser();
            return;
        }

        if (imageFile) {
            const today = new Date().toISOString().split('T')[0];
            const currentCount = (user.lastAiImageDate === today) ? (user.aiImageCount || 0) : 0;
            if (currentCount >= 2) {
                showNotification("You've reached your daily limit of 2 images for Bee 🐝.", "warning");
                return;
            }
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
                
                const today = new Date().toISOString().split('T')[0];
                const newCount = (user.lastAiImageDate === today) ? (user.aiImageCount || 0) + 1 : 1;
                await updateDoc(doc(db, 'users', user.id), { aiImageCount: newCount, lastAiImageDate: today });
                auth?.updateUser({ aiImageCount: newCount, lastAiImageDate: today });
            }

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const modelParams = {
                model: 'gemini-3-flash-preview',
                contents: [
                    {
                        parts: [
                            { text: `IDENTITY: You are Bee 🐝, the verified mascot and official interactive AI for the Finance Department, AAUA.
                                     KNOWLEDGE: You have full access to understand the portal's features and departmental news. Use this live context:
                                     ${siteContext}
                                     
                                     RULES:
                                     - If asked who owns the website: State clearly that it is owned by the Department of Finance AAUA Chapter, brought up by the COMR Sidiku Michael Boluwatife administration, but developed by OBA (Boluwatife Oluwapelumi) and Bee.
                                     - If asked for help: Guide users to features like the CBT Practice Hub, Archives, or Marketplace.
                                     - Do NOT mention Google, OpenAI, or other platforms.
                                     - User is ${user.username}, level ${user.level}L. Address them by their username.
                                     - Be conversational, helpful, and insightful about finance.
                                     
                                     USER MESSAGE: ${userMsgText}` },
                            ...(base64Image ? [{ inlineData: { data: base64Image, mimeType: currentImage!.type } }] : [])
                        ]
                    }
                ]
            };

            const result = await ai.models.generateContent(modelParams);
            const responseText = result.text || "I'm having trouble processing that right now. Could you try rephrasing?";
            
            setMessages(prev => [...prev, { role: 'bee', text: responseText, timestamp: Date.now() }]);
        } catch (error: any) {
            console.error(error);
            showNotification("Bee is currently over capacity. Please try again in a moment.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors overflow-hidden relative">
            {/* AI Header */}
            <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-sm shrink-0 z-20">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-3xl animate-bounce-slow">🐝</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h1 className="font-black text-slate-900 dark:text-white truncate">Bee (FINSA AI)</h1>
                        <span className="text-[9px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase">Official</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">Powered by the Executive Council 25/26</p>
                </div>
            </div>

            {/* Chat Container */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] dark:bg-none">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                        <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 shadow-md ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none'}`}>
                            {msg.image && <img src={msg.image} alt="Sent" className="rounded-lg mb-3 max-h-64 w-auto object-contain mx-auto shadow-inner" />}
                            <div className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                {msg.text}
                            </div>
                            <span className="block text-[8px] mt-2 opacity-40 text-right uppercase font-bold">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start animate-pulse">
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none flex gap-2 items-center border border-slate-100 dark:border-slate-700 shadow-sm">
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                        </div>
                    </div>
                )}
            </div>

            {/* Anchored Input Bar */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 relative z-20 pb-safe md:pb-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] shrink-0">
                <form onSubmit={handleSend} className="flex items-end gap-2 max-w-5xl mx-auto">
                    <div className="flex-1 relative">
                        {imageFile && (
                            <div className="absolute bottom-full left-0 mb-4 p-2 bg-white dark:bg-slate-800 rounded-xl border-2 border-indigo-500 flex items-center gap-2 animate-pop-in shadow-2xl">
                                <img src={URL.createObjectURL(imageFile)} className="w-12 h-12 object-cover rounded-lg" alt="To send" />
                                <button type="button" onClick={() => setImageFile(null)} className="p-1 bg-rose-100 dark:bg-rose-900/50 text-rose-500 rounded-full">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        )}
                        <textarea 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder={`Ask Bee anything, ${user?.username}...`}
                            className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none max-h-32 dark:text-white text-sm transition-all shadow-inner"
                            rows={1}
                        />
                    </div>
                    <div className="flex gap-1 mb-0.5">
                        <button 
                            type="button" 
                            onClick={() => fileInputRef.current?.click()}
                            className="p-3.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors active:scale-90"
                            title="Attach Evidence"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && setImageFile(e.target.files[0])} />
                        
                        <button 
                            type="submit" 
                            disabled={isLoading || (!input.trim() && !imageFile)}
                            className="p-3.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg active:scale-90"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                            ) : (
                                <svg className="w-5 h-5 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};