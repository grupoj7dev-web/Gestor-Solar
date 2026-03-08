const express = require('express');
const router = express.Router();
const multer = require('multer');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, JPG and PNG are allowed.'));
        }
    }
});

// Upload file
router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { folder } = req.body;
        const allowedFolders = ['customer_contracts', 'customer_documents'];

        const targetFolder = allowedFolders.includes(folder) ? folder : 'misc';

        // Generate unique filename
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        const extension = req.file.originalname.split('.').pop();
        const filename = `${timestamp}_${random}.${extension}`;
        const filePath = `${targetFolder}/${filename}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('documents') // Assuming a bucket named 'documents' exists
            .upload(filePath, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false
            });

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('documents')
            .getPublicUrl(filePath);

        res.json({
            url: publicUrl,
            path: filePath,
            filename: req.file.originalname
        });

    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Upload failed: ' + error.message });
    }
});

module.exports = router;
