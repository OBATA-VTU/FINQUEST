import { db, storage, auth } from '../firebase';
import { doc, setDoc, increment, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
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
    // For Firebase/Google Drive, we prefer direct location change for download
    if (url.includes('firebasestorage.googleapis.com') || url.includes('drive.google.com')) {
        window.open(url, '_blank');
        return;
    }
    const response = await fetch(url, { mode: 'cors' });
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    window.open(url, '_blank');
  }
};

export const uploadFileToFirebase = async (file: File, folder: string = 'materials', onProgress?: (progress: number) => void): Promise<{ url: string, path: string }> => {
    try {
        const storageRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / (snapshot.totalBytes || 1)) * 100;
                    console.log(`Upload progress: ${progress}%`);
                    onProgress?.(progress);
                }, 
                (error) => {
                    console.error("Firebase Storage Upload Error:", error);
                    reject(error);
                }, 
                async () => {
                    try {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve({ url: downloadURL, path: uploadTask.snapshot.ref.fullPath });
                    } catch (e) {
                        console.error("Failed to get download URL:", e);
                        reject(e);
                    }
                }
            );
        });
    } catch (error) {
        console.error("Failed to initiate upload task:", error);
        throw error;
    }
};

export const uploadDocument = async (file: File, folder: string = 'materials', onProgress?: (progress: number) => void): Promise<{ url: string, path: string }> => {
    return await uploadFileToFirebase(file, folder, onProgress);
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
export const uploadToImgBB = async (file: File): Promise<string> => {
    try {
        const { url } = await uploadFileToFirebase(file, 'images');
        return url;
    } catch (error) {
        console.error("Firebase upload failed, falling back to ImgBB:", error);
        const formData = new FormData();
        formData.append("image", file);
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
        const data = await response.json();
        return data?.data?.url || '';
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