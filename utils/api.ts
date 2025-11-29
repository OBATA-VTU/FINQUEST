
import { createClient } from '@supabase/supabase-js';

// Environment Variables
const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY || "a4aa97ad337019899bb59b4e94b149e0";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Initialize Supabase Client
// Note: Users must provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in their .env file
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Uploads a file (PDF, DOC, etc.) to Supabase Storage.
 * Uses the 'materials' bucket.
 */
export const uploadFile = async (file: File, folder: string = 'general', onProgress?: (progress: number) => void): Promise<string> => {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        throw new Error("Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.");
    }

    return new Promise(async (resolve, reject) => {
        try {
            // 1. Simulate Start Progress
            if (onProgress) onProgress(10);

            // 2. Sanitize Filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

            // 3. Upload to Supabase 'materials' bucket
            const { data, error } = await supabase.storage
                .from('materials')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error("Supabase Upload Error:", error);
                throw new Error(error.message);
            }

            // 4. Simulate Complete Progress
            if (onProgress) onProgress(100);

            // 5. Get Public URL
            const { data: publicUrlData } = supabase.storage
                .from('materials')
                .getPublicUrl(fileName);

            resolve(publicUrlData.publicUrl);

        } catch (error: any) {
            reject(new Error(`Upload failed: ${error.message}`));
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
