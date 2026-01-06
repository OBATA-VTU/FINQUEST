import { db } from '../firebase';
import { doc, setDoc, increment, getDoc, updateDoc } from 'firebase/firestore';

const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY || "a4aa97ad337019899bb59b4e94b149e0";
const DROPBOX_ACCESS_TOKEN = process.env.DROPBOX_ACCESS_TOKEN;

// Credentials for client-side refresh flow
const GOOGLE_DRIVE_CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
const GOOGLE_DRIVE_CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;

interface DriveTokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

const getGoogleAuthToken = async (): Promise<string> => {
    const tokenDocRef = doc(db, 'config', 'google_drive_settings');
    const tokenDoc = await getDoc(tokenDocRef);

    if (!tokenDoc.exists()) {
        throw new Error("Google Drive not connected. Please connect in Admin Settings.");
    }

    const tokenData = tokenDoc.data() as DriveTokenData;

    // Check if the token is still valid (with a 60-second buffer).
    if (Date.now() < tokenData.expires_at - 60000) {
        return tokenData.access_token;
    }

    // --- Token has expired, use the refresh token to get a new one ---
    if (!tokenData.refresh_token) {
        throw new Error("Google Drive connection has expired and requires re-authentication. Please ask an admin to reconnect.");
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: GOOGLE_DRIVE_CLIENT_ID,
            client_secret: GOOGLE_DRIVE_CLIENT_SECRET,
            refresh_token: tokenData.refresh_token,
            grant_type: 'refresh_token',
        }),
    });

    const newTokens = await tokenResponse.json();
    if (!tokenResponse.ok) {
        console.error("Failed to refresh Google token:", newTokens);
        throw new Error("Failed to refresh Google Drive connection. Please ask an admin to reconnect.");
    }

    // Update Firestore with the new access token and expiry time
    const newExpiry = Date.now() + (newTokens.expires_in * 1000);
    await updateDoc(tokenDocRef, {
        access_token: newTokens.access_token,
        expires_at: newExpiry,
    });

    return newTokens.access_token;
};

export const trackAiUsage = async () => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const statsRef = doc(db, 'system_stats', 'ai_usage');
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

export const uploadFile = (file: File, folder: string = 'materials', onProgress?: (progress: number) => void): Promise<{ url: string, path: string }> => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!DROPBOX_ACCESS_TOKEN) {
                return reject(new Error("Dropbox access token is missing."));
            }

            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const path = `/${folder}/${Date.now()}_${safeName}`;

            const createSharedLink = async (filePath: string): Promise<string> => {
                const response = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${DROPBOX_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: filePath, settings: { requested_visibility: 'public' } }),
                });
                if (response.status === 409) {
                    const listResponse = await fetch('https://api.dropboxapi.com/2/sharing/list_shared_links', {
                         method: 'POST',
                         headers: { 'Authorization': `Bearer ${DROPBOX_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
                         body: JSON.stringify({ path: filePath, direct_only: true }),
                    });
                    const listData = await listResponse.json();
                    if (listData.links && listData.links.length > 0) return listData.links[0].url;
                }
                if (!response.ok) throw new Error("Failed to create shared link.");
                const data = await response.json();
                return data.url;
            };

            onProgress?.(10);
            const apiArgs = { path, mode: 'add', autorename: true, mute: false };
            const uploadResponse = await fetch('https://content.dropboxapi.com/2/files/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${DROPBOX_ACCESS_TOKEN}`, 'Content-Type': 'application/octet-stream', 'Dropbox-API-Arg': JSON.stringify(apiArgs) },
                body: file
            });
            onProgress?.(60);

            if (!uploadResponse.ok) throw new Error("Upload failed.");
            
            const result = await uploadResponse.json();
            const sharedUrl = await createSharedLink(result.path_lower);
            onProgress?.(100);

            const previewUrl = sharedUrl.replace('?dl=0', '?raw=1');
            resolve({ url: previewUrl, path: result.path_lower });

        } catch (error: any) {
            console.error("Dropbox Upload Error:", error);
            reject(new Error(error.message || "Failed to upload to Dropbox."));
        }
    });
};

export const uploadFileToGoogleDrive = async (file: File, onProgress?: (progress: number) => void): Promise<{ url: string, path: string }> => {
    try {
        onProgress?.(10);
        const accessToken = await getGoogleAuthToken();
        const settingsDoc = await getDoc(doc(db, 'config', 'google_drive_settings'));
        const folderId = settingsDoc.exists() ? settingsDoc.data().folder_id : null;

        if (!folderId) {
            throw new Error("Google Drive Folder ID not set in Admin Settings.");
        }
        
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

        if (!response.ok) {
            throw new Error(`Google Drive upload failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        const fileId = result.id;
        
        await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'reader', type: 'anyone' }),
        });
        
        onProgress?.(100);
        const publicUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
        return { url: publicUrl, path: fileId };

    } catch (error) {
        console.error("Google Drive upload failed:", error);
        throw error;
    }
};

export const uploadDocument = async (file: File, folder: string = 'materials', onProgress?: (progress: number) => void): Promise<{ url: string, path: string }> => {
    try {
        const settingsDoc = await getDoc(doc(db, 'content', 'site_settings'));
        const uploadService = settingsDoc.exists() ? settingsDoc.data().uploadService : 'dropbox';

        if (uploadService === 'google_drive') {
            return uploadFileToGoogleDrive(file, onProgress);
        }
        return uploadFile(file, folder, onProgress);
    } catch (error) {
        console.error("Failed to determine upload service, defaulting to Dropbox.", error);
        return uploadFile(file, folder, onProgress);
    }
};

export const deleteFile = async (path: string): Promise<void> => {
    if (!path || !DROPBOX_ACCESS_TOKEN) return;
    try {
        await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${DROPBOX_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: path }),
        });
    } catch (error) {
        console.error("Failed to delete from Dropbox:", error);
    }
};

export const deleteFileFromGoogleDrive = async (fileId: string): Promise<void> => {
    try {
        const accessToken = await getGoogleAuthToken();
        await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
        });
    } catch(e) {
        console.error("Failed to delete from Google Drive:", e);
    }
};

export const deleteDocument = async (path: string): Promise<void> => {
    try {
        const settingsDoc = await getDoc(doc(db, 'content', 'site_settings'));
        const uploadService = settingsDoc.exists() ? settingsDoc.data().uploadService : 'dropbox';
        
        if (uploadService === 'google_drive' || !path.includes('/')) {
            return deleteFileFromGoogleDrive(path);
        }
        return deleteFile(path);
    } catch (error) {
        console.error("Could not determine delete service, defaulting to Dropbox.", error);
        return deleteFile(path);
    }
};

export const uploadToImgBB = async (file: File): Promise<string> => {
    try {
        const formData = new FormData();
        formData.append("image", file);
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST', body: formData
        });
        const data = await response.json();
        if (data && data.data && data.data.url) return data.data.url;
        throw new Error("Invalid response from image host.");
    } catch (e: any) {
        console.warn("Image Upload failed:", e);
        throw new Error("Failed to upload image.");
    }
};