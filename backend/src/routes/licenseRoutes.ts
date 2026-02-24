import express, { Request, Response } from 'express';
import License from '../models/License';
import path from 'path';
import multer from 'multer';
import fs from 'fs-extra'; // Ensure fs-extra is imported
import { parseAndSaveLicensePdf } from '../services/pdfImportService';

const router = express.Router();

// Multer Storage Configuration for Direct Uploads
const licenseStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads');
        // Ensure upload directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Filename is strictly the licenseId provided in the body + .pdf
        // Note: req.body might not be populated before multer processes file if fields are after file.
        // Frontend should send text fields BEFORE file field to be safe, or we handle renaming after.
        // Standard Multer middleware processes fields later usually.
        // Let's use a temporary name or handle renaming in the controller.
        // Actually, best practice: save with temp name, rename in controller if validation passes.
        // BUT, user asked for "Updated Multer storage configuration to rename the file on the fly."
        // We can try accessing req.body.licenseId if the client sends it first.

        // Strategy: Use a temp name first to avoid overwriting before validation
        cb(null, `temp-${Date.now()}-${file.originalname}`);
    }
});

const uploadNew = multer({
    storage: licenseStorage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(null, false);
    }
});

// Check if license exists
router.post('/check-license-exists', async (req: Request, res: Response) => {
    try {
        const { licenseId } = req.body;
        
        if (!licenseId) {
            return res.status(400).json({ error: 'License ID is required' });
        }

        const existingLicense = await License.findOne({ licenseNumber: licenseId });
        
        res.json({
            exists: !!existingLicense,
            data: existingLicense || null
        });
    } catch (error) {
        console.error('Check license error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// New Endpoint: Upload License with specific ID
router.post('/upload-new-license', uploadNew.single('pdf'), async (req: Request, res: Response) => {
    try {
        const { licenseId } = req.body;
        const file = req.file;

        if (!licenseId || !/^[68]\d{7}$/.test(licenseId)) {
            // Delete temp file if invalid ID
            if (file) await fs.unlink(file.path);
            return res.status(400).json({ error: 'Invalid or missing License ID (must be 8 digits starting with 6 or 8)' });
        }

        if (!file) {
            return res.status(400).json({ error: 'No PDF file uploaded' });
        }

        // Rename logic: Move/Rename temp file to proper ID
        const finalPath = path.join(path.dirname(file.path), `${licenseId}.pdf`);

        // Use fs-extra move with overwrite
        await fs.move(file.path, finalPath, { overwrite: true });

        // Trigger Auto-Extraction Logic
        console.log(`Triggering extraction for new upload: ${licenseId}`);
        const savedDoc = await parseAndSaveLicensePdf(finalPath, licenseId);

        if (savedDoc) {
            res.json({ success: true, message: 'File saved and indexed', data: savedDoc });
        } else {
            // Fallback if parsing failed but file is saved
            res.json({ success: true, message: 'File saved, but metadata extraction failed', data: { licenseId } });
        }

    } catch (error) {
        console.error('Upload error:', error);
        // Clean up if error logic is tricky, but here let's just 500
        res.status(500).json({ error: `Server error: ${error instanceof Error ? error.message : String(error)}` });
    }
});

// Search licenses by ID or product name
router.get('/search', async (req: Request, res: Response) => {
    try {
        const { query } = req.query;

        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const searchQuery = query.trim();

        // Build search criteria
        const searchCriteria: any = {
            $or: [
                { licenseNumber: searchQuery },
                { productName: { $regex: searchQuery, $options: 'i' } }
            ]
        };

        const licenses = await License.find(searchCriteria).sort({ createdAt: -1 });

        res.json({
            success: true,
            count: licenses.length,
            data: licenses
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Server error during search' });
    }
});

// Get all licenses
router.get('/', async (req: Request, res: Response) => {
    try {
        const licenses = await License.find().sort({ createdAt: -1 });
        res.json({
            success: true,
            count: licenses.length,
            data: licenses
        });
    } catch (error) {
        console.error('Get licenses error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single license by ID
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const license = await License.findById(req.params.id);

        if (!license) {
            return res.status(404).json({ error: 'License not found' });
        }

        res.json({
            success: true,
            data: license
        });
    } catch (error) {
        console.error('Get license error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create new license
router.post('/', async (req: Request, res: Response) => {
    try {
        const { licenseNumber, notificationNumber, productName, country, manufacturer } = req.body;

        const license = new License({
            licenseNumber,
            notificationNumber,
            productName,
            country,
            manufacturer
        });

        await license.save();

        res.status(201).json({
            success: true,
            data: license
        });
    } catch (error: any) {
        console.error('Create license error:', error);

        if (error.code === 11000) {
            return res.status(400).json({ error: 'License number already exists' });
        }

        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
