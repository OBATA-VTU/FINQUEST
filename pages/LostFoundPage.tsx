
import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { uploadToImgBB } from '../utils/api';

interface LostItem {
    id: string;
    itemName: string;
    description: string;
    locationFound: string;
    imageUrl: string;
    finderName: string;
    contactInfo: string; // Phone or WhatsApp link
    dateFound: string;
    status: 'open' | 'claimed';
}

export const LostFoundPage: React.FC = () => {
    const auth = useContext(AuthContext);
    const { showNotification } = useNotification();
    const [items, setItems] = useState<LostItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [itemName, setItemName] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [contact, setContact] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'lost_items'), orderBy('dateFound', 'desc'));
            const snap = await getDocs(q);
            setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as LostItem)));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth?.user) {
            showNotification("You must be logged in to report an item.", "error");
            return;
        }
        if (!imageFile) {
            showNotification("Please upload an image of the item.", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            const imageUrl = await uploadToImgBB(imageFile);
            
            // Format contact (if it's a number, make it WhatsApp link, else keep as is)
            let contactInfo = contact;
            if (/^\d+$/.test(contact.replace('+', ''))) {
               contactInfo = `https://wa.me/${contact.replace('+', '')}`;
            }

            await addDoc(collection(db, 'lost_items'), {
                itemName,
                description,
                locationFound: location,
                imageUrl,
                finderName: auth.user.name,
                finderId: auth.user.id,
                contactInfo,
                dateFound: new Date().toISOString(),
                status: 'open'
            });

            showNotification("Item reported successfully!", "success");
            setIsModalOpen(false);
            // Reset form
            setItemName(''); setDescription(''); setLocation(''); setContact(''); setImageFile(null);
            fetchItems();
        } catch (error: any) {
            showNotification("Failed to post: " + error.message, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 transition-colors">
            <div className="container mx-auto max-w-6xl">
                <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">Lost & Found</h1>
                        <p className="text-slate-500 dark:text-slate-400">Reuniting lost items with their owners.</p>
                    </div>
                    <button 
                        onClick={() => setIsModalOpen(true)} 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg flex items-center gap-2 transition-transform hover:-translate-y-1"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Report Found Item
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>
                ) : items.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                        <svg className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No lost items reported yet.</h3>
                        <p className="text-slate-500 dark:text-slate-500 text-sm">That's a good thing!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {items.map(item => (
                            <div key={item.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden group hover:shadow-xl transition-all duration-300">
                                <div className="h-56 overflow-hidden relative">
                                    <img src={item.imageUrl} alt={item.itemName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full">
                                        {new Date(item.dateFound).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{item.itemName}</h3>
                                    <p className="text-slate-600 dark:text-slate-300 text-sm mb-4 line-clamp-2">{item.description}</p>
                                    
                                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-6">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        Found at: <span className="font-semibold">{item.locationFound}</span>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                        <div className="text-xs">
                                            <span className="block text-slate-400">Finder</span>
                                            <span className="font-bold text-slate-700 dark:text-slate-200">{item.finderName}</span>
                                        </div>
                                        <a 
                                            href={item.contactInfo.startsWith('http') ? item.contactInfo : `tel:${item.contactInfo}`} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                                            Contact
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Reporting Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-down" onClick={e => e.stopPropagation()}>
                            <div className="bg-indigo-900 p-6 flex justify-between items-center text-white">
                                <h3 className="text-xl font-bold">Report Found Item</h3>
                                <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-1 rounded-full"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Item Name</label>
                                    <input value={itemName} onChange={e => setItemName(e.target.value)} className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="e.g. Black Wallet" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Description</label>
                                    <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white" rows={3} placeholder="Details about the item..." required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Found Location</label>
                                        <input value={location} onChange={e => setLocation(e.target.value)} className="w-full border p-3 rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="e.g. LT1" required />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Contact (Phone/WA)</label>
                                        <input value={contact} onChange={e => setContact(e.target.value)} className="w-full border p-3 rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="08012345678" required />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Image Evidence</label>
                                    <input type="file" onChange={e => e.target.files && setImageFile(e.target.files[0])} accept="image/*" className="w-full border p-3 rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:bg-slate-700 dark:border-slate-600 dark:text-white" required />
                                </div>
                                <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-indigo-700 disabled:opacity-70 mt-2">
                                    {isSubmitting ? 'Posting...' : 'Submit Report'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
