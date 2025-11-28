
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

const IMGBB_API_KEY = "a4aa97ad337019899bb59b4e94b149e0";

/**
 * Uploads an image file to ImgBB with progress tracking.
 */
export const uploadToImgBB = (file: File, onProgress?: (progress: number) => void): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!IMGBB_API_KEY) {
      reject(new Error("ImgBB API Key is missing"));
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percentComplete = (event.loaded / event.total) * 100;
        onProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
            const data = JSON.parse(xhr.responseText);
            if (data.success) {
                resolve(data.data.url);
            } else {
                reject(new Error(data.error?.message || "ImgBB Upload Failed"));
            }
        } catch (e) {
            reject(new Error("Invalid response from ImgBB"));
        }
      } else {
        reject(new Error("ImgBB Upload Failed with status " + xhr.status));
      }
    };

    xhr.onerror = () => reject(new Error("Network Error during ImgBB upload"));
    xhr.send(formData);
  });
};

/**
 * Uploads a file to either ImgBB (if image) or Firebase Storage (if doc).
 * Supports progress callback.
 */
export const uploadFile = (file: File, path: string = 'uploads', onProgress?: (progress: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
        // If it's an image, try ImgBB first
        if (file.type.startsWith('image/')) {
            uploadToImgBB(file, onProgress)
                .then(resolve)
                .catch((error) => {
                    console.warn("ImgBB upload failed, falling back to Firebase Storage", error);
                    // Fallback to Firebase Storage
                    uploadToFirebase(file, path, onProgress).then(resolve).catch(reject);
                });
        } else {
            // Non-images go to Firebase Storage
            uploadToFirebase(file, path, onProgress).then(resolve).catch(reject);
        }
    });
};

const uploadToFirebase = (file: File, path: string, onProgress?: (progress: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
        const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed', 
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (onProgress) onProgress(progress);
            }, 
            (error) => {
                reject(error);
            }, 
            async () => {
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(downloadURL);
                } catch (e) {
                    reject(e);
                }
            }
        );
    });
}
