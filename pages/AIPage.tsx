import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { GoogleGenAI } from "@google/genai";
import { useNotification } from '../contexts/NotificationContext';
import { db } from '../firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { uploadToImgBB } from '../utils/api';

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
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const user = auth?.user;

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
    }, [messages]);

    // Initial greeting
    useEffect(() => {
        if (user) {
            setMessages([{
                role: 'bee',
                text: `Hello ${user.username}! I am Bee 🐝, your verified official FINSA AI assistant. How can I help you today with your academic or financial inquiries?`,
                timestamp: Date.now()
            }]);
        }
    }, [user?.username]);

    const handleBanUser = async () => {
        if (!user) return;
        const banUntilDate = new Date();
        banUntilDate.setDate(banUntilDate.getDate() + 7); // 1 week suspension
        
        try {
            await updateDoc(doc(db, 'users', user.id), {
                isBanned: true,
                banUntil: banUntilDate.toISOString()
            });
            showNotification("Your account has been suspended for violating safety policies.", "error");
            setTimeout(() => auth?.logout(), 3000);
        } catch (e) {
            console.error("Failed to suspend user", e);
        }
    };

    const moderateText = (text: string) => {
        const triggers = ['fuck', 'dick', 'suck', 'sex', 'porn', 'pussy', 'nude', 'penis', 'vagina'];
        const lower = text.toLowerCase();
        return triggers.some(t => lower.includes(t));
    };

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!user || (!input.trim() && !imageFile) || isLoading) return;

        // 1. Check Moderation
        if (moderateText(input)) {
            await handleBanUser();
            return;
        }

        // 2. Check Image Limit
        if (imageFile) {
            const today = new Date().toISOString().split('T')[0];
            const currentCount = (user.lastAiImageDate === today) ? (user.aiImageCount || 0) : 0;
            if (currentCount >= 2) {
                showNotification("You've reached the limit of 2 images per day for Bee 🐝.", "warning");
                return;
            }
        }

        setIsLoading(true);
        const userMsgText = input.trim();
        const currentImage = imageFile;
        setInput('');
        setImageFile(null);

        // Add user message to UI
        const userMsg: ChatMessage = { role: 'user', text: userMsgText, timestamp: Date.now() };
        if (currentImage) userMsg.image = URL.createObjectURL(currentImage);
        setMessages(prev => [...prev, userMsg]);

        try {
            let uploadedImageUrl = '';
            if (currentImage) {
                uploadedImageUrl = await uploadToImgBB(currentImage);
                // Update image counter in DB
                const today = new Date().toISOString().split('T')[0];
                const newCount = (user.lastAiImageDate === today) ? (user.aiImageCount || 0) + 1 : 1;
                await updateDoc(doc(db, 'users', user.id), {
                    aiImageCount: newCount,
                    lastAiImageDate: today
                });
                auth?.updateUser({ aiImageCount: newCount, lastAiImageDate: today });
            }

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const model = ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: [
                    {
                        parts: [
                            { text: `You are Bee 🐝, the official interactive FINSA AI assistant for the Finance Department at AAUA. 
                                     Your creator is OBA (Boluwatife Oluwapelumi), the PRO for 2025/2026. 
                                     If asked who made you, say OBA. If asked for OBA's full name, say Boluwatife Oluwapelumi. 
                                     Do not mention any other AI platforms. 
                                     The user is ${user.username}, email ${user.email}, level ${user.level}L. 
                                     Address them by their username. 
                                     Be helpful with academics, finance, news, and entertainment. 
                                     If the user says anything sexual or inappropriate, you will not respond normally, though the system will ban them. 
                                     
                                     User Input: ${userMsgText}` },
                            ...(currentImage ? [{ inlineData: { data: (await currentImage.arrayBuffer()).toString(), mimeType: currentImage.type } }] : [])
                        ]
                    }
                ],
                config: {
                    systemInstruction: "You are Bee 🐝, a helpful financial and academic AI mascot created by OBA."
                }
            });

            const result = await model;
            const responseText = result.text || "I'm sorry, I couldn't process that. Can you rephrase?";
            
            setMessages(prev => [...prev, {
                role: 'bee',
                text: responseText,
                timestamp: Date.now()
            }]);

        } catch (error: any) {
            showNotification("Bee is having trouble responding right now. Please try later.", "error");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 transition-colors overflow-hidden">
            {/* AI Header */}
            <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-sm z-10 shrink-0">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center text-3xl animate-bounce-slow">🐝</div>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="font-bold text-slate-900 dark:text-white">Bee (FINSA AI)</h1>
                        <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase tracking-tighter">Verified Official</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">By OBA • {user?.username}</p>
                </div>
            </div>

            {/* Chat Container */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth bg-[url('https://www.transparenttextures.com/patterns/hexellence.png')]">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                        <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none'}`}>
                            {msg.image && <img src={msg.image} alt="Sent" className="rounded-lg mb-2 max-h-60 w-auto object-contain mx-auto" />}
                            <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert">
                                {msg.text.split('\n').map((line, idx) => (
                                    <p key={idx} className={idx > 0 ? 'mt-2' : ''}>{line}</p>
                                ))}
                            </div>
                            <span className="block text-[9px] mt-2 opacity-50 text-right">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start animate-pulse">
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none flex gap-2 items-center">
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></span>
                            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Bar */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-end gap-2">
                    <div className="flex-1 relative">
                        {imageFile && (
                            <div className="absolute bottom-full left-0 mb-4 p-2 bg-indigo-50 dark:bg-indigo-900/50 rounded-xl border-2 border-indigo-500 flex items-center gap-2 animate-pop-in">
                                <img src={URL.createObjectURL(imageFile)} className="w-10 h-10 object-cover rounded" alt="To send" />
                                <button type="button" onClick={() => setImageFile(null)} className="text-rose-500 font-bold">✕</button>
                            </div>
                        )}
                        <textarea 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder={`Ask Bee something, ${user?.username}...`}
                            className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none max-h-32 dark:text-white text-sm"
                            rows={1}
                        />
                    </div>
                    <div className="flex gap-1 mb-0.5">
                        <button 
                            type="button" 
                            onClick={() => fileInputRef.current?.click()}
                            className="p-3.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && setImageFile(e.target.files[0])} />
                        
                        <button 
                            type="submit" 
                            disabled={isLoading || (!input.trim() && !imageFile)}
                            className="p-3.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg active:scale-95"
                        >
                            {isLoading ? <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <svg className="w-5 h-5 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
