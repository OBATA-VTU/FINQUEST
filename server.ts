import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
    const app = express();
    const PORT = 3000;

    app.use(cors());
    app.use(express.json());

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
    const ai = new GoogleGenAI({
        apiKey: GEMINI_API_KEY,
        httpOptions: {
            headers: {
                'User-Agent': 'aistudio-build',
            }
        }
    });

    // AI Generation Endpoint
    app.post('/api/ai/generate', async (req, res) => {
        try {
            const { prompt, systemPrompt, stream = false } = req.body;
            if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured on server.");

            const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

            if (stream) {
                const result = await ai.models.generateContentStream({
                    model: 'gemini-3.7-flash',
                    contents: fullPrompt
                });
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');

                for await (const chunk of result) {
                    const chunkText = chunk.text;
                    if (chunkText) {
                        res.write(`data: ${JSON.stringify({ content: chunkText })}\n\n`);
                    }
                }
                res.write('data: [DONE]\n\n');
                res.end();
            } else {
                const result = await ai.models.generateContent({
                    model: 'gemini-3.7-flash',
                    contents: fullPrompt
                });
                res.json({ content: result.text });
            }
        } catch (error: any) {
            console.error("AI Error:", error);
            if (!res.headersSent) {
                res.status(500).json({ error: error.message });
            } else {
                res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
                res.end();
            }
        }
    });

    // Daily Quote Endpoint
    app.get('/api/ai/quote', async (req, res) => {
        try {
            if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured.");
            const result = await ai.models.generateContent({
                model: 'gemini-3.7-flash',
                contents: "Generate a single, unique, and insightful quote about finance, investing, or wealth. Concise (under 25 words). Do not include author."
            });
            res.json({ quote: (result.text || "").trim().replace(/^"|"$/g, '') });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // Specialized CBT Intelligence Endpoint
    app.post('/api/ai/cbt-analyze', async (req, res) => {
        try {
            const { questions, userAnswers, score } = req.body;
            if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured.");

            const prompt = `
                I just finished a Finance CBT practice test.
                My score was ${score}%.
                
                Here is a summary of the questions and my answers (0-indexed):
                ${questions.map((q: any, i: number) => `Q${i+1}: ${q.text}\nCorrect: ${q.options[q.correctAnswer]}\nMy Answer: ${q.options[userAnswers[i]] || 'Skipped'}`).join('\n\n')}
                
                Please provide:
                1. A breakdown of my strengths and weaknesses based on these questions.
                2. Specific academic topics I should study more.
                3. A motivational but professional closing advice.
                Format the response in clean Markdown.
            `;

            const result = await ai.models.generateContent({
                model: 'gemini-3.1-pro-preview',
                contents: prompt
            });
            res.json({ analysis: result.text });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // Explain Question Endpoint
    app.post('/api/ai/explain', async (req, res) => {
        try {
            const { question, selectedOption, correctOption, options } = req.body;
            if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured.");

            const prompt = `
                Explain this finance question and why the correct answer is what it is.
                Question: ${question}
                Options: ${options.join(', ')}
                Correct Answer: ${options[correctOption]}
                User Selected: ${options[selectedOption] || 'None'}
                
                Provide a clear, concise academic explanation suitable for a university student.
            `;

            const result = await ai.models.generateContent({
                model: 'gemini-3.7-flash',
                contents: prompt
            });
            res.json({ explanation: result.text });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // Smart Hint/Tip Endpoint
    app.post('/api/ai/tip', async (req, res) => {
        try {
            const { question, options } = req.body;
            if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured.");

            const prompt = `
                Provide a very short, subtle hint (max 15 words) for this finance question WITHOUT giving away the correct answer directly.
                
                Question: ${question}
                Options: ${options.join(', ')}
                
                Keep it professional and encouraging.
            `;

            const result = await ai.models.generateContent({
                model: 'gemini-3.7-flash',
                contents: prompt
            });
            res.json({ tip: result.text?.trim() });
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
