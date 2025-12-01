
import { Dropbox } from 'dropbox';

// Environment Variables
const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY || "a4aa97ad337019899bb59b4e94b149e0";
const DROPBOX_ACCESS_TOKEN = import.meta.env.VITE_DROPBOX_ACCESS_TOKEN;

/**
 * Helper to transform a Dropbox URL into a direct download URL.
 * Using the standard dl=1 parameter which is more reliable and avoids 403 errors.
 */
export const getDropboxDownloadUrl = (url: string | undefined): string => {
    if (!url) return '';
    // If it's already a raw link (preview), convert to download link
    if (url.includes('?raw=1')) {
        return url.replace('?raw=1', '?dl=1');
    }
    // If it has no query params, append dl=1
    if (url.includes('dropbox.com') && !url.includes('?')) {
        return `${url}?dl=1`;
    }
    // If it's a dl=0 link, swap to dl=1
    if (url.includes('?dl=0')) {
        return url.replace('?dl=0', '?dl=1');
    }
    return url;
};

/**
 * Forces a download of a file from a URL by fetching it as a blob
 * and creating a temporary anchor tag.
 */
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
    // Fallback to opening in new tab if fetch fails (e.g. CORS)
    window.open(url, '_blank');
  }
};

/**
 * Uploads a file to Dropbox.
 * Returns object with URL and Path (for deletion).
 */
export const uploadFile = async (file: File, folder: string = 'materials', onProgress?: (progress: number) => void): Promise<{ url: string, path: string }> => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!DROPBOX_ACCESS_TOKEN) {
                throw new Error("Dropbox Access Token is missing.");
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

            // Return the ?raw=1 URL for embedding/previewing in the app
            let previewUrl = linkResponse.result.url;
            previewUrl = previewUrl.replace('?dl=0', '?raw=1');

            resolve({ 
                url: previewUrl, 
                path: response.result.path_lower! 
            });

        } catch (error: any) {
            console.error("Dropbox Upload Error:", error);
            const msg = error.error?.error_summary || error.message || "Unknown upload error";
            reject(new Error(`Upload failed: ${msg}`));
        }
    });
};

/**
 * Deletes a file from Dropbox using its path.
 */
export const deleteFile = async (path: string): Promise<void> => {
    if (!path) return; // Cannot delete without path
    try {
        if (!DROPBOX_ACCESS_TOKEN) return;
        const dbx = new Dropbox({ accessToken: DROPBOX_ACCESS_TOKEN });
        
        await dbx.filesDeleteV2({ path });
        console.log("File deleted from Dropbox:", path);
    } catch (error) {
        console.error("Failed to delete from Dropbox:", error);
        // We don't throw here to avoid blocking the DB delete if storage delete fails
    }
};

/**
 * Uploads an image to ImgBB.
 */
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
        throw new Error("ImgBB response invalid");
    } catch (e: any) {
        console.warn("ImgBB Upload failed:", e);
        throw new Error("Failed to upload image. Please try again.");
    }
};
