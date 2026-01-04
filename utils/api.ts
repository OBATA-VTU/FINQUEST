
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

/**
 * Re-engineered Dropbox upload function using direct `fetch` calls to bypass SDK issues.
 * This provides more robust error handling and resilience for both small and large files.
 */
export const uploadFile = (file: File, folder: string = 'materials', onProgress?: (progress: number) => void): Promise<{ url: string, path: string }> => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!DROPBOX_ACCESS_TOKEN) {
                return reject(new Error("Storage service is unavailable. Check API keys."));
            }

            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const path = `/${folder}/${Date.now()}_${safeName}`;

            // Helper to create a publicly shareable link for the uploaded file.
            const createSharedLink = async (filePath: string): Promise<string> => {
                try {
                    const response = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${DROPBOX_ACCESS_TOKEN}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ path: filePath, settings: { requested_visibility: 'public' } }),
                    });

                    if (response.status === 409) { // shared_link_already_exists
                        const listResponse = await fetch('https://api.dropboxapi.com/2/sharing/list_shared_links', {
                             method: 'POST',
                             headers: {
                                 'Authorization': `Bearer ${DROPBOX_ACCESS_TOKEN}`,
                                 'Content-Type': 'application/json',
                             },
                             body: JSON.stringify({ path: filePath, direct_only: true }),
                        });
                        const listData = await listResponse.json();
                        if (listData.links && listData.links.length > 0) {
                             return listData.links[0].url;
                        }
                    }
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(`Failed to create shared link: ${errorData?.error_summary || 'Unknown error'}`);
                    }

                    const data = await response.json();
                    return data.url;

                } catch (linkError: any) {
                    console.error("Error creating shared link:", linkError);
                    throw new Error("File uploaded, but failed to create a shareable link.");
                }
            };

            const MAX_SIMPLE_UPLOAD_SIZE = 150 * 1024 * 1024; // Dropbox API limit for single upload call

            if (file.size < MAX_SIMPLE_UPLOAD_SIZE) {
                // --- Simple Upload for files under 150MB ---
                if (onProgress) onProgress(10);
                const apiArgs = { path, mode: 'add', autorename: true, mute: false };
                const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${DROPBOX_ACCESS_TOKEN}`,
                        'Content-Type': 'application/octet-stream',
                        'Dropbox-API-Arg': JSON.stringify(apiArgs),
                    },
                    body: file
                });
                if (onProgress) onProgress(60);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({error_summary: 'Network error or invalid response from Dropbox.'}));
                    throw new Error(`Upload failed: ${errorData.error_summary}`);
                }
                
                const result = await response.json();
                const sharedUrl = await createSharedLink(result.path_lower);
                if (onProgress) onProgress(100);

                const previewUrl = sharedUrl.replace('?dl=0', '?raw=1');
                resolve({ url: previewUrl, path: result.path_lower });

            } else {
                // --- Chunked Upload for files over 150MB ---
                const CHUNK_SIZE = 8 * 1024 * 1024; // 8MB chunks
                let offset = 0;

                // 1. Start session
                const firstChunk = file.slice(offset, offset + CHUNK_SIZE);
                const startResponse = await fetch('https://content.dropboxapi.com/2/files/upload_session/start', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${DROPBOX_ACCESS_TOKEN}`,
                        'Content-Type': 'application/octet-stream',
                    },
                    body: firstChunk
                });
                if (!startResponse.ok) throw new Error('Failed to start upload session');
                const { session_id } = await startResponse.json();
                offset += firstChunk.size;
                if (onProgress) onProgress(Math.round((offset / file.size) * 80));

                // 2. Append chunks
                while ((file.size - offset) > CHUNK_SIZE) {
                    const chunk = file.slice(offset, offset + CHUNK_SIZE);
                    const appendArgs = { cursor: { session_id, offset }, close: false };
                    const appendResponse = await fetch('https://content.dropboxapi.com/2/files/upload_session/append_v2', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${DROPBOX_ACCESS_TOKEN}`,
                            'Content-Type': 'application/octet-stream',
                            'Dropbox-API-Arg': JSON.stringify(appendArgs),
                        },
                        body: chunk
                    });
                    if (!appendResponse.ok) throw new Error(`Failed to append chunk at offset ${offset}`);
                    offset += chunk.size;
                    if (onProgress) onProgress(Math.round((offset / file.size) * 80));
                }

                // 3. Finish session
                const lastChunk = file.slice(offset);
                const finishArgs = { cursor: { session_id, offset }, commit: { path, mode: 'add', autorename: true, mute: false }};
                const finishResponse = await fetch('https://content.dropboxapi.com/2/files/upload_session/finish', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${DROPBOX_ACCESS_TOKEN}`,
                        'Content-Type': 'application/octet-stream',
                        'Dropbox-API-Arg': JSON.stringify(finishArgs),
                    },
                    body: lastChunk
                });
                if (!finishResponse.ok) {
                     const errorData = await finishResponse.json().catch(() => ({error_summary: 'Network error on finishing upload.'}));
                     throw new Error(`Failed to finish upload: ${errorData.error_summary}`);
                }
                if (onProgress) onProgress(90);

                const result = await finishResponse.json();
                const sharedUrl = await createSharedLink(result.path_lower);
                if (onProgress) onProgress(100);

                const previewUrl = sharedUrl.replace('?dl=0', '?raw=1');
                resolve({ url: previewUrl, path: result.path_lower });
            }

        } catch (error: any) {
            console.error("Dropbox Upload Error:", error);
            reject(new Error(error.message || "Failed to upload document. Please check connection."));
        }
    });
};

/**
 * Deletes a file from Dropbox storage using a direct fetch call.
 */
export const deleteFile = async (path: string): Promise<void> => {
    if (!path || !DROPBOX_ACCESS_TOKEN) return;
    try {
        await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DROPBOX_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ path: path }),
        });
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
        throw new Error("Invalid response from image host.");
    } catch (e: any) {
        console.warn("Image Upload failed:", e);
        throw new Error("Failed to upload image. Please try again.");
    }
};
