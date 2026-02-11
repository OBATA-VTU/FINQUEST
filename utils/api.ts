import { db } from '../firebase';
import { doc, setDoc, increment, getDoc, updateDoc } from 'firebase/firestore';

const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY || "a4aa97ad337019899bb59b4e94b149e0";
const DROPBOX_ACCESS_TOKEN = process.env.DROPBOX_ACCESS_TOKEN;

// Credentials for client-side refresh flow
const GOOGLE_DRIVE_CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
const GOOGLE_DRIVE_CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const TEST_GOOGLE_DRIVE_REFRESH_TOKEN = process.env.TEST_GOOGLE_DRIVE_REFRESH_TOKEN;

interface DriveTokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

const getGoogleAuthToken = async (): Promise<string> => {
    let tokenData: DriveTokenData | null = null;

    try {
        const tokenDocRef = doc(db, 'config', 'google_drive_settings');
        const tokenDoc = await getDoc(tokenDocRef);
        if (tokenDoc.exists()) {
            tokenData = tokenDoc.data() as DriveTokenData;
        }
    } catch (e: any) {
        // Quietly fallback for students if config read fails
        if (e.code === 'permission-denied' && TEST_GOOGLE_DRIVE_REFRESH_TOKEN) {
            tokenData = { access_token: '', refresh_token: TEST_GOOGLE_DRIVE_REFRESH_TOKEN, expires_at: 0 };
        } else throw e;
    }

    if (!tokenData) throw new Error("Cloud Storage not ready. Contact Admin.");

    if (Date.now() < tokenData.expires_at - 60000) return tokenData.access_token;

    // Token Expired: Refresh Session
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: GOOGLE_DRIVE_CLIENT_ID || '',
            client_secret: GOOGLE_DRIVE_CLIENT_SECRET || '',
            refresh_token: tokenData.refresh_token,
            grant_type: 'refresh_token',
        }),
    });

    const newTokens = await tokenResponse.json();
    if (!tokenResponse.ok) throw new Error("Cloud refresh failed.");

    const newExpiry = Date.now() + (newTokens.expires_in * 1000);
    
    // Background sync - do not block UI, do not log if failed (expected for non-admins)
    (async () => {
        try {
            await updateDoc(doc(db, 'config', 'google_drive_settings'), {
                access_token: newTokens.access_token,
                expires_at: newExpiry,
            });
        } catch (e) {}
    })();

    return newTokens.access_token;
};


export const trackAiUsage = async () => {
    try {
        const statsRef = doc(db, 'system_stats', 'ai_usage');
        await setDoc(statsRef, { 
            total_calls: increment(1),
            last_updated: new Date().toISOString()
        }, { merge: true });
    } catch (e) {}
};

export const getDropboxDownloadUrl = (url: string | undefined): string => {
    if (!url) return '';
    if (url.includes('?raw=1')) return url.replace('?raw=1', '?dl=1');
    if (url.includes('dropbox.com') && !url.includes('?')) return `${url}?dl=1`;
    return url;
};

export const forceDownload = async (url: string, filename: string) => {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error('Download failed');
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
    window.open(url, '_blank');
  }
};

export const uploadFileToGoogleDrive = async (file: File, onProgress?: (progress: number) => void): Promise<{ url: string, path: string }> => {
    onProgress?.(10);
    const accessToken = await getGoogleAuthToken();
    const settingsDoc = await getDoc(doc(db, 'content', 'site_settings'));
    const folderId = settingsDoc.exists() ? settingsDoc.data().googleDriveFolderId : null;

    if (!folderId) throw new Error("Storage folder missing.");
    
    onProgress?.(30);
    const metadata = { name: file.name, parents: [folderId] };
    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', file);
    
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
    });

    if (!response.ok) throw new Error("Upload aborted by server.");
    
    const result = await response.json();
    const fileId = result.id;
    
    // Set permission in background
    fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    }).catch(() => {});
    
    onProgress?.(100);
    return { url: `https://drive.google.com/uc?export=view&id=${fileId}`, path: fileId };
};

export const uploadDocument = async (file: File, folder: string = 'materials', onProgress?: (progress: number) => void): Promise<{ url: string, path: string }> => {
    try {
        const settingsDoc = await getDoc(doc(db, 'content', 'site_settings'));
        const uploadService = settingsDoc.exists() ? settingsDoc.data().uploadService : 'dropbox';

        if (uploadService === 'google_drive') {
            return await uploadFileToGoogleDrive(file, onProgress);
        }
        throw new Error("Direct upload unavailable.");
    } catch (error) {
        throw error;
    }
};

export const deleteDocument = async (path: string): Promise<void> => {
    try {
        const accessToken = await getGoogleAuthToken();
        await fetch(`https://www.googleapis.com/drive/v3/files/${path}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
        });
    } catch(e) {}
};

export const uploadToImgBB = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("image", file);
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST', body: formData
    });
    const data = await response.json();
    if (data?.data?.url) return data.data.url;
    throw new Error("Image host rejected file.");
};