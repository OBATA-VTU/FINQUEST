import { db, functions } from '../firebase';
import { doc, setDoc, increment, getDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY || "a4aa97ad337019899bb59b4e94b149e0";
const DROPBOX_ACCESS_TOKEN = process.env.DROPBOX_ACCESS_TOKEN;

// This function converts a File object to a base64 string for the backend.
const fileToBase64 = (file: File): Promise<string> => 
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Result is "data:mime/type;base64,the-real-base64-string"
      // We only need the part after the comma.
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = error => reject(error);
  });

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

// --- THIS IS THE NEW, CORRECT IMPLEMENTATION ---
export const uploadFileToGoogleDrive = async (file: File, onProgress?: (progress: number) => void): Promise<{ url: string, path: string }> => {
    try {
        onProgress?.(10);
        // Convert file to base64 string for Firebase Function
        const base64Content = await fileToBase64(file);
        onProgress?.(30);

        // Get a reference to the callable function
        const uploadToDriveFunction = httpsCallable(functions, 'uploadFileToDrive');
        onProgress?.(50);
        
        // Call the function with the required payload
        const result: any = await uploadToDriveFunction({
            fileContent: base64Content,
            fileName: file.name,
            mimeType: file.type,
        });

        onProgress?.(100);

        // The 'data' property of the result contains the object returned by the function
        if (result.data.success) {
            return { url: result.data.url, path: result.data.path };
        } else {
            // If the function returns an error, it will be caught in the catch block
            throw new Error("Backend function reported an error.");
        }
    } catch (error: any) {
        console.error("Firebase Function call 'uploadFileToDrive' failed:", error);
        // The error.message will contain the specific, user-friendly error from the backend
        throw new Error(error.message || "An unknown error occurred during upload.");
    }
};

export const uploadDocument = async (file: File, folder: string = 'materials', onProgress?: (progress: number) => void): Promise<{ url: string, path: string }> => {
    try {
        const settingsDoc = await getDoc(doc(db, 'content', 'site_settings'));
        const uploadService = settingsDoc.exists() ? settingsDoc.data().uploadService : 'dropbox';

        if (uploadService === 'google_drive') {
            return uploadFileToGoogleDrive(file, onProgress);
        }
        // Fallback to Dropbox
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

// THIS FUNCTION IS NOT CURRENTLY USED BY THE APP, BUT IS KEPT FOR POTENTIAL FUTURE USE
// It's a client-side only uploader that is less secure and robust than the backend function.
export const deleteFileFromGoogleDrive = async (fileId: string): Promise<void> => {
    try {
        // This function requires a client-side token management which is not implemented.
        console.warn("Client-side Google Drive deletion is not fully implemented.");
    } catch(e) {
        console.error("Failed to delete from Google Drive:", e);
    }
};

export const deleteDocument = async (path: string): Promise<void> => {
    try {
        const settingsDoc = await getDoc(doc(db, 'content', 'site_settings'));
        const uploadService = settingsDoc.exists() ? settingsDoc.data().uploadService : 'dropbox';
        
        // Google Drive file IDs don't contain slashes, Dropbox paths do.
        if (uploadService === 'google_drive' || !path.includes('/')) {
            // For now, deletion only works for Dropbox as the secure backend flow is not implemented for delete.
            console.warn("Deletion is currently only supported for Dropbox-hosted files.");
            return;
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