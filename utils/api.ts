
import { Dropbox } from 'dropbox';

// Environment Variables
const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY || "a4aa97ad337019899bb59b4e94b149e0";
const DROPBOX_ACCESS_TOKEN = import.meta.env.VITE_DROPBOX_ACCESS_TOKEN;

/**
 * Helper to transform a Dropbox URL into a direct download URL.
 * Uses dl.dropboxusercontent.com to bypass the Dropbox app/preview page.
 */
export const getDropboxDownloadUrl = (url: string | undefined): string => {
    if (!url) return '';
    if (url.includes('dropbox.com')) {
        // Replace www.dropbox.com with dl.dropboxusercontent.com
        // This domain serves the raw file directly
        let newUrl = url.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
        
        // Remove existing query params (like ?dl=0 or ?raw=1) as the domain handles it
        newUrl = newUrl.split('?')[0];
        
        return newUrl;
    }
    return url;
};

/**
 * Uploads a file (PDF, DOC, etc.) to Dropbox.
 * Used for Past Questions and Materials.
 */
export const uploadFile = async (file: File, folder: string = 'materials', onProgress?: (progress: number) => void): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!DROPBOX_ACCESS_TOKEN) {
                throw new Error("Dropbox Access Token is missing in environment variables.");
            }

            const dbx = new Dropbox({ accessToken: DROPBOX_ACCESS_TOKEN });

            // 1. Simulate Start Progress
            if (onProgress) onProgress(10);

            // 2. Prepare Path
            // Clean filename to avoid special char issues
            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const path = `/${folder}/${Date.now()}_${safeName}`;

            // 3. Upload File
            const response = await dbx.filesUpload({
                path: path,
                contents: file,
                mode: { '.tag': 'add' }, 
                autorename: true,
                mute: false
            });

            if (onProgress) onProgress(60);

            // 4. Create Shared Link
            const linkResponse = await dbx.sharingCreateSharedLinkWithSettings({
                path: response.result.path_lower!
            });

            if (onProgress) onProgress(100);

            // 5. Convert to Raw Link for Previewing
            // We store ?raw=1 in the DB because it allows embedding in <iframe>.
            // We will convert this to the download URL dynamically when the user clicks "Download".
            let directUrl = linkResponse.result.url;
            directUrl = directUrl.replace('?dl=0', '?raw=1');

            resolve(directUrl);

        } catch (error: any) {
            console.error("Dropbox Upload Error:", error);
            const msg = error.error?.error_summary || error.message || "Unknown upload error";
            reject(new Error(`Upload failed: ${msg}`));
        }
    });
};

/**
 * Uploads an image to ImgBB.
 * Used for Profile Pictures and Display Images only.
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
