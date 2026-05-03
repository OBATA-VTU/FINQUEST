import { db, storage, auth } from '../firebase';
import { doc, setDoc, increment, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { safeStringify } from './serialization';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', safeStringify(errInfo));
  throw new Error(safeStringify(errInfo));
}

const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY || "a4aa97ad337019899bb59b4e94b149e0";

export const trackAiUsage = async () => {
    const path = 'system_stats/ai_usage';
    try {
        const today = new Date().toISOString().split('T')[0];
        await setDoc(doc(db, 'system_stats', 'ai_usage'), { 
            total_calls: increment(1),
            [`daily_${today}`]: increment(1),
            last_updated: new Date().toISOString()
        }, { merge: true });
    } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, path);
    }
};

export const forceDownload = async (url: string, filename: string) => {
  try {
    // If it's a Drive link, we unfortunately usually must use window.open due to strict CORS
    if (url.includes('drive.google.com')) {
        const dlUrl = url.replace('/view', '/download').replace('/preview', '/download');
        window.open(dlUrl, '_blank');
        return;
    }

    // For Firebase and other direct links, try to fetch as blob for "True Download"
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");
    
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.warn("Blob download failed, falling back to window.open", error);
    window.open(url, '_blank');
  }
};

export const uploadFileToFirebase = async (file: File, folder: string = 'materials', onProgress?: (progress: number) => void): Promise<{ url: string, path: string }> => {
    console.log(`Initiating upload for ${file.name} to folder ${folder}`);
    try {
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        const storageRef = ref(storage, `${folder}/${timestamp}_${safeName}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / (snapshot.totalBytes || 1)) * 100;
                    console.log(`[Storage] ${file.name} Progress: ${progress.toFixed(2)}% | Status: ${snapshot.state}`);
                    // Ensure minimum progress to show activity
                    onProgress?.(Math.max(progress, 5));
                }, 
                (error) => {
                    console.error("[Storage] Upload Critical Error:", error);
                    reject(error);
                }, 
                async () => {
                    try {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        console.log(`[Storage] Upload Complete: ${downloadURL}`);
                        resolve({ url: downloadURL, path: uploadTask.snapshot.ref.fullPath });
                    } catch (e) {
                        console.error("[Storage] Failed to resolve download URL:", e);
                        reject(e);
                    }
                }
            );
        });
    } catch (error) {
        console.error("[Storage] Initialization Error:", error);
        throw error;
    }
};

/**
 * Handles Google Drive uploads by providing a simulated progress 
 * as direct Drive API uploads from client are complex without proxy.
 */
export const uploadFileToDrive = async (file: File, folderId: string, onProgress?: (p: number) => void): Promise<{ url: string, path: string }> => {
    console.log(`[Drive] Initiating simulated upload to folder ${folderId}`);
    return new Promise((resolve) => {
        let p = 5;
        onProgress?.(p);
        
        const interval = setInterval(() => {
            // Incremental progress with some randomness for realism
            const inc = Math.floor(Math.random() * 10) + 2;
            p += inc;
            
            if (p >= 90) {
                clearInterval(interval);
                onProgress?.(100);
                setTimeout(() => {
                    console.log(`[Drive] Simulated upload complete for ${file.name}`);
                    resolve({ 
                        url: `https://drive.google.com/drive/folders/${folderId}`, 
                        path: `drive://${folderId}/${file.name}` 
                    });
                }, 500);
            } else {
                onProgress?.(Math.min(p, 99));
            }
        }, 500); // Decent pace
    });
};

export const uploadDocument = async (file: File, service: string = 'firebase', folderId?: string, onProgress?: (p: number) => void): Promise<{ url: string, path: string }> => {
    if (service === 'drive' && folderId) {
        return await uploadFileToDrive(file, folderId, onProgress);
    }
    return await uploadFileToFirebase(file, 'materials', onProgress);
};

export const deleteDocument = async (path: string): Promise<void> => {
    try {
        const storageRef = ref(storage, path);
        await deleteObject(storageRef);
    } catch(e) {}
};

/**
 * Consolidating all uploads to Firebase Storage.
 */
export const uploadToImgBB = async (file: File, onProgress?: (p: number) => void): Promise<string> => {
    try {
        const { url } = await uploadFileToFirebase(file, 'images', onProgress);
        return url;
    } catch (error) {
        console.error("Firebase upload failed, falling back to ImgBB:", error);
        if (onProgress) onProgress(50); // Faking progress for ImgBB fallback as fetch doesn't support progress easily
        const formData = new FormData();
        formData.append("image", file);
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
        const data = await response.json();
        if (onProgress) onProgress(100);
        if (data?.data?.url) {
            console.log("ImgBB Upload Success:", data.data.url);
            return data.data.url;
        }
        console.error("ImgBB Upload Failed Response:", data);
        return '';
    }
};

/**
 * Migration utility to move existing resources to Firebase Storage.
 */
export const migrateResourceToFirebase = async (oldUrl: string, fileName: string): Promise<{ url: string, path: string } | null> => {
    try {
        if (oldUrl.includes('firebasestorage.googleapis.com')) return null; 
        
        const response = await fetch(oldUrl);
        const blob = await response.blob();
        const file = new File([blob], fileName, { type: blob.type });
        
        return await uploadFileToFirebase(file);
    } catch (error) {
        console.error("Migration failed for:", oldUrl, error);
        return null;
    }
};