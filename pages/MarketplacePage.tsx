import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { uploadToImgBB } from '../utils/api';
import { MarketplaceItem } from '../types';
import { VerificationBadge } from '../components/VerificationBadge';

const CATEGORIES = ['Goods', 'Services', 'Accommodation'];

export const MarketplacePage: React.FC = () => {
    const auth = useContext(AuthContext);
    const { showNotification } = useNotification();
    const [items, setItems] = useState<MarketplaceItem[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({ title: '', description: '', price: '', category: 'Goods', contact: '' });
    const [imageFile, setImageFile] = useState<File | null>(null);

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'marketplace'), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as MarketplaceItem)));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    
    const handleDelete = async (item: MarketplaceItem) => {
        if (!auth?.user || (auth.user.id !== item.sellerId && auth.user.role !== 'admin')) return;
        if (!window.confirm("Delete this listing?")) return;
        
        try {
            await deleteDoc(doc(db, 'marketplace', item.id));
            showNotification("Listing deleted.", "info");
            fetchItems();
        } catch(e) { showNotification("Failed to delete.", "error"); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth?.user || !imageFile) {
            showNotification("Please fill all fields and upload an image.", "error");
            return;
        }
        setIsSubmitting(true);
        try {
            const imageUrl = await uploadToImgBB(imageFile);
            
            await addDoc(collection(db, 'marketplace'), {
                ...formData,
                price: parseFloat(formData.price) || 0,
                imageUrl,
                sellerId: auth.user.id,
                sellerName: auth.user.username,
                sellerVerified: auth.user.isVerified || false,
                createdAt: new Date().toISOString()
            });

            showNotification("Your ad has been posted!", "success");
            setIsModalOpen(false);
            setFormData({ title: '', description: '', price: '', category: 'Goods', contact: '' });
            setImageFile(null);
            fetchItems();
        } catch (error: any) {
            showNotification("Failed to post: " + error.message, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4">
            <div className="container mx-auto max-w-6xl">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">Student Marketplace</h1>
                        <p className="text-slate-500 dark:text-slate-400">Buy, sell, and trade with fellow students.</p>
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg flex items-center gap-2">Post an Ad</button>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 text-amber-800 dark:text-amber-300 p-4 rounded-r-lg mb-8">
                    <h4 className="font-bold">Disclaimer</h4>
                    <p className="text-sm">This is a student-run marketplace. For your safety, prioritize transactions with <span className="font-bold">verified users</span> (those with a blue badge). The FINSA executive body and the department are not responsible for any issues arising from transactions.</p>
                </div>

                {loading ? <div className="text-center py-20">Loading listings...</div> : items.length === 0 ? (
                    <div className="text-center py-20">No items listed yet.</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {items.map(item => (
                            <div key={item.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                                <div className="h-48 bg-slate-100 dark:bg-slate-700 relative">
                                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                                     {auth?.user && (auth.user.id === item.sellerId || auth.user.role === 'admin') && (
                                        <button onClick={() => handleDelete(item)} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 hover:bg-rose-500"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                     )}
                                </div>
                                <div className="p-4 flex flex-col flex-1">
                                    <h3 className="font-bold text-slate-800 dark:text-white line-clamp-2 mb-2">{item.title}</h3>
                                    <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mb-4">₦{item.price.toLocaleString()}</p>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-auto pt-2 border-t border-slate-100 dark:border-slate-700">
                                        <span>@{item.sellerName}</span>
                                        {item.sellerVerified && <VerificationBadge role="student" isVerified={true} />}
                                    </div>
                                    <a href={`https://wa.me/${item.contact.replace('+', '')}`} target="_blank" rel="noopener noreferrer" className="mt-4 w-full text-center py-2 bg-green-500 text-white font-bold text-sm rounded-lg hover:bg-green-600">Contact Seller</a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
                    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                        <h3 className="p-6 font-bold text-xl">Create Listing</h3>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-3 border rounded-xl" placeholder="Item/Service Title" required />
                            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-3 border rounded-xl" placeholder="Description" rows={3} required />
                            <div className="grid grid-cols-2 gap-4">
                                <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full p-3 border rounded-xl" placeholder="Price (₦)" required />
                                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-3 border rounded-xl bg-white">{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
                            </div>
                            <input value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} className="w-full p-3 border rounded-xl" placeholder="WhatsApp Number (e.g., 080...)" required />
                            <input type="file" onChange={e => e.target.files && setImageFile(e.target.files[0])} accept="image/*" className="w-full border p-3 rounded-xl" required />
                        </div>
                        <div className="p-4 bg-slate-50 flex justify-end gap-3"><button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-lg font-bold">Cancel</button><button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg">{isSubmitting ? 'Posting...' : 'Post Ad'}</button></div>
                    </form>
                </div>
            )}
        </div>
    );
};
