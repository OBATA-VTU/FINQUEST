import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Groq } from 'groq-sdk';

async function startServer() {
    const app = express();
    const PORT = 3000;

    app.use(cors());
    app.use(express.json());

    const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
    const groq = new Groq({ apiKey: GROQ_API_KEY });

    // AI Generation Endpoint
    app.post('/api/ai/generate', async (req, res) => {
        try {
            const { prompt, model = "llama-3.1-8b-instant" } = req.body;
            if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured on server.");

            const response = await groq.chat.completions.create({
                model: model,
                messages: [{ role: "user", content: prompt }],
            });

            res.json({ content: response.choices[0].message.content });
        } catch (error: any) {
            console.error("AI Error:", error);
            res.status(500).json({ error: error.message });
        }
    });

    // Daily Quote Endpoint
    app.get('/api/ai/quote', async (req, res) => {
        try {
            if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured.");

            const response = await groq.chat.completions.create({
                model: "llama-3.1-8b-instant",
                messages: [{ role: "user", content: "Generate a single, unique, and insightful quote about finance, investing, or wealth. Concise (under 25 words). Do not include author." }],
            });

            res.json({ quote: response.choices[0].message.content?.trim().replace(/^"|"$/g, '') });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // Ocean of PDF Search Proxy
    app.get('/api/library/search', async (req, res) => {
        try {
            const { q } = req.query;
            if (!q) return res.status(400).json({ error: "Query is required" });

            const searchUrl = `https://oceanofpdf.com/?s=${encodeURIComponent(String(q))}`;
            const response = await axios.get(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const $ = cheerio.load(response.data);
            const results: any[] = [];

            $('.post').each((i, el) => {
                const title = $(el).find('.entry-title').text().trim();
                const author = $(el).find('.entry-author').text().trim() || 'Unknown Author';
                const coverUrl = $(el).find('img').attr('src') || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200';
                const link = $(el).find('.entry-title a').attr('href');

                if (title && link) {
                    results.push({
                        title,
                        author,
                        coverUrl,
                        downloadUrl: link, // This is the detail page
                        source: 'Ocean of PDF'
                    });
                }
            });

            res.json({ results });
        } catch (error: any) {
            console.error("Library Search Error:", error);
            res.status(500).json({ error: "Failed to fetch from global archives." });
        }
    });

    // Ocean of PDF Direct Download Extractor
    // This visits the detail page to find the actual PDF link (simulated for now or proxying)
    app.get('/api/library/details', async (req, res) => {
        try {
            const { url } = req.query;
            if (!url) return res.status(400).json({ error: "URL is required" });

            const response = await axios.get(String(url), {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const $ = cheerio.load(response.data);
            
            // OceanOfPDF typically has a form or a specific button for PDF
            const pdfLink = $('.download-button').attr('href') || $('.wp-block-button__link').first().attr('href');
            
            res.json({ pdfLink: pdfLink || url });
        } catch (error) {
            res.status(500).json({ error: "Failed to extract resource links." });
        }
    });

    if (process.env.NODE_ENV !== 'production') {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa',
        });
        app.use(vite.middlewares);
    } else {
        const distPath = path.join(process.cwd(), 'dist');
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
            res.sendFile(path.join(distPath, 'index.html'));
        });
    }

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

startServer();
