
import { Dropbox } from 'dropbox';
import { db } from '../firebase';
import { doc, setDoc, increment } from 'firebase/firestore';

const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY || "a4aa97ad337019899bb59b4e94b149e0";
const DROPBOX_ACCESS_TOKEN = import.meta.env.VITE_DROPBOX_ACCESS_TOKEN;

// Helper to track AI Usage for Admin Dashboard
export const trackAiUsage = async () => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const statsRef = doc(db, 'system_stats', 'ai_usage');
        // Increment global counter and daily counter
        await setDoc(statsRef, { 
            total_calls: increment(1),
            [`daily_${today}`]: increment(1),
            last_updated: new Date().toISOString()
        }, { merge: true });
    } catch (e) {
        console.warn("Failed to track AI usage", e);
    }
};

export const getDropboxDownloadUrl = (url: string | undefined): string => {
    if (!url) return '';
    if (url.includes('?raw=1')) return url.replace('?raw=1', '?dl=1');
    if (url.includes('dropbox.com') && !url.includes('?')) return `${url}?dl=1`;
    if (url.includes('?dl=0')) return url.replace('?dl=0', '?dl=1');
    return url;
};

export const forceDownload = async (url: string, filename: string) => {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error('Network response was not ok');
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Download failed:', error);
    window.open(url, '_blank');
  }
};

export const uploadFile = async (file: File, folder: string = 'materials', onProgress?: (progress: number) => void): Promise<{ url: string, path: string }> => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!DROPBOX_ACCESS_TOKEN) {
                throw new Error("Storage service is unavailable.");
            }

            const dbx = new Dropbox({ accessToken: DROPBOX_ACCESS_TOKEN });
            if (onProgress) onProgress(10);

            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const path = `/${folder}/${Date.now()}_${safeName}`;

            const response = await dbx.filesUpload({
                path: path,
                contents: file,
                mode: { '.tag': 'add' }, 
                autorename: true,
                mute: false
            });

            if (onProgress) onProgress(60);

            const linkResponse = await dbx.sharingCreateSharedLinkWithSettings({
                path: response.result.path_lower!
            });

            if (onProgress) onProgress(100);

            let previewUrl = linkResponse.result.url;
            previewUrl = previewUrl.replace('?dl=0', '?raw=1');

            resolve({ url: previewUrl, path: response.result.path_lower! });

        } catch (error: any) {
            console.error("Storage Upload Error:", error);
            reject(new Error("Failed to upload document to cloud storage. Please try again or check connection."));
        }
    });
};

export const deleteFile = async (path: string): Promise<void> => {
    if (!path) return;
    try {
        if (!DROPBOX_ACCESS_TOKEN) return;
        const dbx = new Dropbox({ accessToken: DROPBOX_ACCESS_TOKEN });
        await dbx.filesDeleteV2({ path });
    } catch (error) {
        console.error("Failed to delete from storage:", error);
    }
};

export const uploadToImgBB = async (file: File): Promise<string> => {
    try {
        const formData = new FormData();
        formData.append("image", file);

        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (data && data.data && data.data.url) {
            return data.data.url;
        }
        throw new Error("Invalid response");
    } catch (e: any) {
        console.warn("Image Upload failed:", e);
        throw new Error("Failed to upload image. Please try again.");
    }
};
