const express = require('express');
const router = express.Router();
const multer = require('multer');
const superJotaService = require('../services/super-jota-service');

// Configure multer for audio file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024 // 25MB limit
    }
});

/**
 * POST /api/super-jota/transcribe
 * Transcribe audio to text using Whisper
 */
router.post('/transcribe', upload.single('audio'), async (req, res) => {
    try {
        console.log('📥 Transcribe request received');

        if (!req.file) {
            console.log('❌ No audio file in request');
            return res.status(400).json({ error: 'No audio file provided' });
        }

        console.log('✅ Audio file received:', {
            size: req.file.size,
            mimetype: req.file.mimetype,
            originalname: req.file.originalname
        });

        // Create a File object from the buffer for OpenAI
        const audioFile = new File([req.file.buffer], req.file.originalname || 'audio.webm', {
            type: req.file.mimetype || 'audio/webm'
        });

        console.log('🎵 Sending to Whisper API...');
        const text = await superJotaService.transcribeAudio(audioFile);
        console.log('✅ Transcription successful:', text);

        res.json({ text });
    } catch (error) {
        console.error('❌ Error in transcribe endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/super-jota/chat
 * Process a chat message and get AI response
 */
router.post('/chat', async (req, res) => {
    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages array required' });
        }

        // Get current system context
        const context = await superJotaService.getSystemContext();

        // Process chat with GPT-4
        const response = await superJotaService.processChat(messages, context);

        res.json(response);
    } catch (error) {
        console.error('Error in chat endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/super-jota/speak
 * Generate speech from text
 */
router.post('/speak', async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text required' });
        }

        const audioBuffer = await superJotaService.generateSpeech(text);

        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.length
        });
        res.send(audioBuffer);
    } catch (error) {
        console.error('Error in speak endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/super-jota/context
 * Get current system context
 */
router.get('/context', async (req, res) => {
    try {
        const context = await superJotaService.getSystemContext();
        res.json(context);
    } catch (error) {
        console.error('Error in context endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/super-jota/notifications
 * Check for new notifications since last check
 */
router.get('/notifications', async (req, res) => {
    try {
        const { since } = req.query;

        const lastCheckTime = since ? new Date(since) : new Date(Date.now() - 60000); // Default: last minute

        const notifications = await superJotaService.checkForNotifications(lastCheckTime);

        res.json({ notifications, timestamp: new Date().toISOString() });
    } catch (error) {
        console.error('Error in notifications endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/super-jota/action
 * Execute an action (update ticket, add response, etc)
 */
router.post('/action', async (req, res) => {
    try {
        const { functionName, args } = req.body;

        if (!functionName) {
            return res.status(400).json({ error: 'Function name required' });
        }

        const result = await superJotaService.executeFunction(functionName, args || {});

        res.json({ success: true, result });
    } catch (error) {
        console.error('Error in action endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
