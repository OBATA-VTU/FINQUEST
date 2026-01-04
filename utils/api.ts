import { db } from '../firebase';
import { doc, setDoc, increment } from 'firebase/firestore';

const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY || "a4aa97ad337019899bb59b4e94b149e0";
const DROPBOX_ACCESS_TOKEN = process.env.DROPBOX_ACCESS_TOKEN;
const ONEDRIVE_ACCESS_TOKEN = process.env.ONEDRIVE_ACCESS_TOKEN;

// Helper to track AI Usage for Admin Dashboard
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


export const uploadToDropbox = (file: File, folder: string = 'materials', onProgress?: (progress: number) => void): Promise<{ url: string, path: string }> => {
    return new Promise(async (resolve, reject) => {
        if (!DROPBOX_ACCESS_TOKEN) {
            return reject(new Error("Dropbox is not configured."));
        }
        // ... (rest of the dropbox function is the same, just ensure it rejects on error)
        try {
            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const path = `/${folder}/${Date.now()}_${safeName}`;

            const createSharedLink = async (filePath: string): Promise<string> => {
                try {
                    const createResponse = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${DROPBOX_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ path: filePath, settings: { requested_visibility: 'public' } })
                    });
                    if (createResponse.status === 409) {
                        const listResponse = await fetch('https://api.dropboxapi.com/2/sharing/list_shared_links', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${DROPBOX_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ path: filePath, direct_only: true })
                        });
                        const listData = await listResponse.json();
                        if (listData.links && listData.links.length > 0) return listData.links[0].url;
                        else throw new Error('Failed to retrieve existing shared link.');
                    }
                    if (!createResponse.ok) {
                        const errorText = await createResponse.text();
                        throw new Error(`Failed to create shared link: ${errorText}`);
                    }
                    const data = await createResponse.json();
                    return data.url;
                } catch (linkError) {
                    console.error("Error in createSharedLink:", linkError);
                    throw linkError;
                }
            };

            const apiArgs = { path, mode: 'add', autorename: true, mute: false };
            if (onProgress) onProgress(10);
            const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${DROPBOX_ACCESS_TOKEN}`, 'Content-Type': 'application/octet-stream', 'Dropbox-API-Arg': JSON.stringify(apiArgs) }, body: file
            });
            if (onProgress) onProgress(60);
            if (!response.ok) { 
                const errorData = await response.json().catch(() => ({error_summary: 'Network error'})); 
                throw new Error(`Upload failed: ${errorData.error_summary}`); 
            }
            
            const result = await response.json();
            const sharedUrl = await createSharedLink(result.path_lower);
            if (onProgress) onProgress(100);
            const previewUrl = sharedUrl.replace('?dl=0', '?raw=1');
            resolve({ url: previewUrl, path: result.path_lower });

        } catch (error: any) {
            console.error("Dropbox Upload Error:", error);
            reject(new Error(error.message || "Failed to upload to Dropbox."));
        }
    });
};

export const uploadToOneDrive = (file: File, folder: string = 'materials', onProgress?: (progress: number) => void): Promise<{ url: string, path: string }> => {
    return new Promise(async (resolve, reject) => {
        if (!ONEDRIVE_ACCESS_TOKEN) {
            return reject(new Error("OneDrive is not configured."));
        }
        try {
            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const path = `/${folder}/${Date.now()}_${safeName}`;
            const sessionUrl = `https://graph.microsoft.com/v1.0/me/drive/root:${path}:/createUploadSession`;

            if (onProgress) onProgress(10);
            const sessionResponse = await fetch(sessionUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${ONEDRIVE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ item: { "@microsoft.graph.conflictBehavior": "rename" } })
            });

            if (!sessionResponse.ok) throw new Error('Could not create OneDrive upload session.');
            const { uploadUrl } = await sessionResponse.json();

            if (onProgress) onProgress(30);
            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Length': file.size.toString(), 'Content-Range': `bytes 0-${file.size - 1}/${file.size}` },
                body: file
            });
            if (onProgress) onProgress(80);

            if (!uploadResponse.ok) throw new Error('OneDrive file upload failed.');
            const itemData = await uploadResponse.json();

            const linkResponse = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${itemData.id}/createLink`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${ONEDRIVE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'view', scope: 'anonymous' })
            });

            if (!linkResponse.ok) throw new Error('Could not create public link for OneDrive file.');
            const linkData = await linkResponse.json();
            
            if (onProgress) onProgress(100);
            resolve({ url: linkData.link.webUrl, path: itemData.parentReference.path + '/' + itemData.name });

        } catch (error: any) {
            console.error("OneDrive Upload Error:", error);
            reject(new Error(error.message || "Failed to upload to OneDrive."));
        }
    });
};

export const uploadWithFallback = async (file: File, folder: string = 'materials', onProgress: (progress: number, status: string) => void): Promise<{ url: string, path: string }> => {
    try {
        onProgress(0, 'Uploading via Dropbox...');
        const result = await uploadToDropbox(file, folder, (p) => onProgress(p, 'Uploading via Dropbox...'));
        return result;
    } catch (dropboxError: any) {
        console.warn("Dropbox upload failed, trying OneDrive...", dropboxError.message);
        try {
            onProgress(0, 'Dropbox failed. Retrying with OneDrive...');
            const result = await uploadToOneDrive(file, folder, (p) => onProgress(p, 'Uploading via OneDrive...'));
            return result;
        } catch (oneDriveError: any) {
            console.error("OneDrive upload also failed:", oneDriveError.message);
            throw new Error("Both Dropbox and OneDrive uploads failed. Please check configuration and network.");
        }
    }
};

export const deleteFile = async (path: string): Promise<void> => {
    if (!path) return;
    // For now, only Dropbox delete is supported. OneDrive delete would require more complex logic.
    if (path.startsWith('/') && DROPBOX_ACCESS_TOKEN) {
        try {
            await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${DROPBOX_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: path }),
            });
        } catch (error) {
            console.error("Failed to delete from storage:", error);
        }
    }
};

export const uploadToImgBB = async (file: File): Promise<string> => {
    // ... (This function remains unchanged)
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
        throw new Error("Failed to upload image. Please try again.");
    }
};
