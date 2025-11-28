import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY;

/**
 * Uploads an image file to ImgBB.
 */
export const uploadToImgBB = async (file: File): Promise<string> => {
  if (!IMGBB_API_KEY) {
      console.error("ImgBB Key Missing");
      throw new Error("ImgBB API Key is missing");
  }

  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (data.success) {
    return data.data.url;
  } else {
    throw new Error(data.error?.message || "Failed to upload image to ImgBB");
  }
};

/**
 * Uploads a file to either ImgBB (if image) or Firebase Storage (if doc).
 */
export const uploadFile = async (file: File, path: string = 'uploads'): Promise<string> => {
  // If it's an image, try ImgBB first as requested
  if (file.type.startsWith('image/')) {
    try {
      return await uploadToImgBB(file);
    } catch (error) {
      console.warn("ImgBB upload failed, falling back to Firebase Storage", error);
    }
  }

  // Fallback or default for non-images: Firebase Storage
  const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  return downloadURL;
};