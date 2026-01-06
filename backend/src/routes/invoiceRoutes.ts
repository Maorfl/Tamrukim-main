import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { processInvoice, downloadAllCollected, clearBasket } from '../controllers/invoiceController';

const router = express.Router();

// Configure Multer for PDF uploads (TEMP folder)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        const validFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${Date.now()}-${validFilename}`);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(null, false);
        }
    }
});

// POST /api/process-invoice
router.post('/process-invoice', upload.single('invoice'), processInvoice);

// GET /api/download-all-collected
router.get('/download-all-collected', downloadAllCollected);

// POST /api/clear-basket
router.post('/clear-basket', clearBasket);

export default router;
