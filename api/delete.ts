// This is a Vercel Serverless Function, located at /api/delete.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAccessToken } from './dropboxHelper';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { path } = req.body;

        if (!path) {
            return res.status(400).json({ error: 'File path is required.' });
        }

        const accessToken = await getAccessToken();

        await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ path: path }),
        });
        
        return res.status(200).json({ message: 'File deletion initiated.' });

    } catch (error: any) {
        console.error('Error in /api/delete:', error);
        return res.status(500).json({ error: error.message || 'An internal server error occurred.' });
    }
}
