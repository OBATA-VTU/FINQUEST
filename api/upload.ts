// This is a Vercel Serverless Function, located at /api/upload.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import formidable from 'formidable';
import { createReadStream } from 'fs';
import { getAccessToken } from './dropboxHelper';

// Disable Vercel's default body parser to handle multipart/form-data with formidable
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const accessToken = await getAccessToken();

        const form = formidable({});
        const [fields, files] = await form.parse(req);
        
        const file = files.file?.[0];
        const folder = fields.folder?.[0] || 'materials';

        if (!file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }
        
        const safeName = file.originalFilename?.replace(/[^a-zA-Z0-9.-]/g, '_') || `file_${Date.now()}`;
        const dropboxPath = `/${folder}/${Date.now()}_${safeName}`;

        const apiArgs = {
            path: dropboxPath,
            mode: 'add',
            autorename: true,
            mute: false,
        };

        const uploadResponse = await fetch('https://content.dropboxapi.com/2/files/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/octet-stream',
                'Dropbox-API-Arg': JSON.stringify(apiArgs),
            },
            body: createReadStream(file.filepath),
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('Dropbox upload error:', errorText);
            throw new Error(`Dropbox upload failed: ${uploadResponse.statusText}`);
        }

        const uploadResult = await uploadResponse.json();

        // Create a shared link
        const linkResponse = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ path: uploadResult.path_lower, settings: { requested_visibility: 'public' } }),
        });

        if (!linkResponse.ok && linkResponse.status !== 409) { // 409 means link already exists
             const errorText = await linkResponse.text();
             console.error('Dropbox share link error:', errorText);
             throw new Error('File uploaded, but failed to create a shareable link.');
        }

        const linkData = await linkResponse.json();
        
        let sharedUrl = linkData.url;
        // If link already existed, we need to fetch it
        if (linkResponse.status === 409 && linkData.error?.shared_link_already_exists) {
            sharedUrl = linkData.error.shared_link_already_exists.metadata.url;
        }
        
        // Convert to a direct preview link
        const previewUrl = sharedUrl.replace('?dl=0', '?raw=1');
        
        return res.status(200).json({
            url: previewUrl,
            path: uploadResult.path_lower,
        });

    } catch (error: any) {
        console.error('Error in /api/upload:', error);
        return res.status(500).json({ error: error.message || 'An internal server error occurred.' });
    }
}
