
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

const IMGBB_API_KEY = "a4aa97ad337019899bb59b4e94b149e0";

/**
 * Uploads a file to Firebase Storage.
 * Replaced complex fallback logic with direct Firebase usage for reliability.
 * This fixes the "Stuck at 0%" issue caused by ImgBB CORS blocks.
 */
export const uploadFile = (file: File, path: string = 'uploads', onProgress?: (progress: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
        // Create a storage reference
        // Sanitize filename to prevent issues
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const storageRef = ref(storage, `${path}/${fileName}`);
        
        // Create upload task
        const uploadTask = uploadBytesResumable(storageRef, file);

        // Listen for state changes, errors, and completion of the upload.
        uploadTask.on('state_changed',
            (snapshot) => {
                // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (onProgress) {
                    onProgress(progress);
                }
            }, 
            (error) => {
                console.error("Firebase Storage Upload Error:", error);
                // A full list of error codes is available at
                // https://firebase.google.com/docs/storage/web/handle-errors
                switch (error.code) {
                    case 'storage/unauthorized':
                        reject(new Error("Permission denied. You are not authorized to upload."));
                        break;
                    case 'storage/canceled':
                        reject(new Error("Upload canceled."));
                        break;
                    case 'storage/unknown':
                        reject(new Error("Unknown error occurred, inspect error.serverResponse"));
                        break;
                    default:
                        reject(new Error(`Upload failed: ${error.message}`));
                }
            }, 
            async () => {
                // Upload completed successfully, now we can get the download URL
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(downloadURL);
                } catch (e: any) {
                    reject(new Error(`Failed to get download URL: ${e.message}`));
                }
            }
        );
    });
};

/**
 * Keep ImgBB ONLY for small profile pictures if strictly necessary, 
 * but for consistency, we could also move this to Firebase. 
 * For now, simplified to use fetch with no fancy XHR to avoid hangs.
 */
export const uploadToImgBB = async (file: File): Promise<string> => {
    // Fallback to Firebase for Profile Pics too if ImgBB fails, 
    // but try ImgBB first to save Storage bandwidth for PDFs.
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
        throw new Error("ImgBB failed");
    } catch (e) {
        console.warn("ImgBB Profile Upload failed, falling back to Firebase");
        return uploadFile(file, 'profiles');
    }
};
