
import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { GalleryItem } from '../types';

export const GalleryPage: React.FC = () => {
  const [images, setImages] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGallery = async () => {
        try {
            const q = query(collection(db, 'gallery'), orderBy('date', 'desc'));
            const snapshot = await getDocs(q);
            setImages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryItem)));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    fetchGallery();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 animate-fade-in transition-colors">
        <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-12">
                 <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2 block">Memories</span>
                 <h1 className="text-4xl font-serif font-bold text-slate-900 dark:text-white mb-4">Department Gallery</h1>
                 <p className="text-lg text-slate-600 dark:text-slate-400">Capturing moments, milestones, and memories of the Finance Department student life.</p>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {[1,2,3,4,5,6].map(i => (
                        <div key={i} className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse"></div>
                    ))}
                </div>
            ) : images.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                    <p className="text-slate-500 dark:text-slate-400 font-medium">No photos have been uploaded to the gallery yet.</p>
                </div>
            ) : (
                /* Responsive Masonry-like Grid using CSS Columns */
                <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
                    {images.map((img) => (
                        <div key={img.id} className="break-inside-avoid relative group rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <img 
                                src={img.imageUrl} 
                                alt={img.caption} 
                                className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-500" 
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                                <p className="text-white font-bold text-lg leading-tight shadow-black drop-shadow-md">{img.caption}</p>
                                <p className="text-white/80 text-xs mt-2 font-medium">{new Date(img.date).toLocaleDateString()}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};
