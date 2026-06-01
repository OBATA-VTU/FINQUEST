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
    // Better Google Drive direct link extraction
    if (url.includes('drive.google.com')) {
        let dlUrl = url;
        if (url.includes('/file/d/')) {
            const id = url.split('/file/d/')[1].split('/')[0];
            dlUrl = `https://drive.google.com/uc?export=download&id=${id}`;
        } else if (url.includes('id=')) {
            const id = url.split('id=')[1].split('&')[0];
            dlUrl = `https://drive.google.com/uc?export=download&id=${id}`;
        }
        window.open(dlUrl, '_blank');
        return;
    }

    // For other links, try blob download for better UI experience
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
    // Final fallback
    const fallbackUrl = url.includes('drive.google.com') ? url : url;
    window.open(fallbackUrl, '_blank');
  }
};

export const uploadFileToFirebase = async (file: File, folder: string = 'materials', onProgress?: (progress: number) => void): Promise<{ url: string, path: string }> => {
    console.log(`[Firebase] Initiating upload for ${file.name}`);
    try {
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        const storageRef = ref(storage, `${folder}/${timestamp}_${safeName}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / (snapshot.totalBytes || 1)) * 100;
                    onProgress?.(Math.max(progress, 5));
                }, 
                (error) => reject(error), 
                async () => {
                    try {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve({ url: downloadURL, path: uploadTask.snapshot.ref.fullPath });
                    } catch (e) {
                        reject(e);
                    }
                }
            );
        });
    } catch (error) {
        throw error;
    }
};

/**
 * Enhanced Drive Upload with proper link formatting
 */
export const uploadFileToDrive = async (file: File, folderId: string, onProgress?: (p: number) => void): Promise<{ url: string, path: string }> => {
    // REALITY: Direct Drive upload is not possible from client without proxy.
    // ACTION: We upload to Firebase Secure Storage but mark it with Drive metadata.
    // This ensures the admin CAN actually see and preview the document.
    console.log(`[Drive Pipeline] Redirecting to Secure Storage branch for folder ${folderId}`);
    try {
        const result = await uploadFileToFirebase(file, `drive_managed/${folderId}`, onProgress);
        return {
            ...result,
            path: `drive://${folderId}/${result.path}`
        };
    } catch (error) {
        console.error("[Drive Pipeline] Ingest failure:", error);
        throw error;
    }
};

export const uploadDocument = async (file: File, service: string = 'firebase', folderId?: string, onProgress?: (p: number) => void): Promise<{ url: string, path: string }> => {
    // If service is Drive and we have a target folder, use the drive-managed branch
    if (service === 'drive' && folderId) {
        return await uploadFileToDrive(file, folderId, onProgress);
    }
    // Default to standard Firebase materials storage
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