import { Request, Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import { mergePdfs } from '../services/pdfService';
// Import the new service
import { getEnrichedLicenseData } from '../services/licenseDataService';

// Global "Session" Basket
let collectedLicenseIds = new Set<string>();

export const clearBasket = (req: Request, res: Response) => {
    collectedLicenseIds.clear();
    res.json({ message: 'Basket cleared', totalCollected: 0 });
};

export const loadLicensesToBasket = async (req: Request, res: Response) => {
    try {
        const { licenseIds } = req.body;

        if (!licenseIds || !Array.isArray(licenseIds)) {
            return res.status(400).json({ error: 'licenseIds array is required' });
        }

        // Clear existing basket and add the new IDs
        collectedLicenseIds.clear();
        licenseIds.forEach(id => collectedLicenseIds.add(id));

        // Get enriched data for these licenses
        const enrichedData = await getEnrichedLicenseData(licenseIds);

        const scanResults = enrichedData.map(d => ({
            id: d.materialId,
            productName: d.productName,
            cleanLicense: d.formattedLicense,
            shortNotification: d.shortNotification,
            status: d.hasFile ? 'Available' : 'Missing'
        }));

        res.json({
            success: true,
            scanResults,
            totalCollected: collectedLicenseIds.size
        });
    } catch (error) {
        console.error('Error loading licenses to basket:', error);
        res.status(500).json({ error: 'Failed to load licenses' });
    }
};

export const downloadAllCollected = async (req: Request, res: Response) => {
    try {
        const uniqueNumbers = Array.from(collectedLicenseIds);
        const caseNumber = req.query.caseNumber as string;
        console.log(`Downloading all collected: ${uniqueNumbers.length} IDs for case ${caseNumber}`);

        if (uniqueNumbers.length === 0) {
            return res.status(400).json({ error: 'No licenses in basket to download.' });
        }

        const uploadsDir = path.resolve(process.cwd(), 'uploads');
        const foundFiles: string[] = [];

        for (const num of uniqueNumbers) {
            const possibleExtensions = ['.pdf', '.Pdf', '.PDF'];
            for (const ext of possibleExtensions) {
                const potentialPath = path.join(uploadsDir, `${num}${ext}`);
                if (await fs.pathExists(potentialPath)) {
                    foundFiles.push(potentialPath);
                    break;
                }
            }
        }

        if (foundFiles.length === 0) {
            return res.status(404).json({ error: 'None of the collected licenses were found in the system.' });
        }

        const mergedPdfBytes = await mergePdfs(foundFiles);

        // Save the PDF to history folder if caseNumber is provided
        if (caseNumber && caseNumber.trim() !== '') {
            const historyDir = path.resolve(process.cwd(), 'history');
            await fs.ensureDir(historyDir);
            
            const fileName = `merged_licenses_${caseNumber}_${Date.now()}.pdf`;
            const filePath = path.join(historyDir, fileName);
            await fs.writeFile(filePath, Buffer.from(mergedPdfBytes));
            
            // Store in response headers so frontend can access it
            res.setHeader('X-File-Name', fileName);
            res.setHeader('X-File-Path', filePath);
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=merged_licenses_${caseNumber || Date.now()}.pdf`);
        res.send(Buffer.from(mergedPdfBytes));

    } catch (error) {
        console.error('Error creating merged PDF:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
};

export const processInvoice = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filePath = req.file.path;

        const scriptPath = path.resolve(process.cwd(), '../python_scripts/extract_numbers.py');
        if (!fs.existsSync(scriptPath)) {
            return res.status(500).json({ error: 'Internal server configuration error: Script missing' });
        }

        const pythonProcess = spawn('python', [scriptPath, filePath]);

        let resultData = '';
        let errorData = '';

        pythonProcess.stdout.on('data', (data) => {
            resultData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorData += data.toString();
        });

        pythonProcess.on('close', async (code) => {
            try {
                await fs.unlink(filePath);
            } catch (err) {
                console.error("Error deleting temp file:", err);
            }

            if (code !== 0) {
                return res.status(500).json({
                    error: 'Failed to process invoice (Python script error)',
                    details: errorData
                });
            }

            try {
                const jsonStartIndex = resultData.lastIndexOf('[');
                const jsonEndIndex = resultData.lastIndexOf(']');

                if (jsonStartIndex === -1 || jsonEndIndex === -1) {
                    throw new Error(`Invalid JSON output: ${resultData}`);
                }

                const jsonString = resultData.substring(jsonStartIndex, jsonEndIndex + 1);
                const extractedNumbers: string[] = JSON.parse(jsonString);

                // Identify NEW numbers for this batch count (just for notification)
                const newCount = extractedNumbers.filter(id => !collectedLicenseIds.has(id)).length;

                // Accumulate ALL found numbers into the basket
                extractedNumbers.forEach(num => collectedLicenseIds.add(num));

                // Requirement: Return specific object structure using getEnrichedLicenseData
                // We will fetch/enrich data for ALL items currently in the basket to provide a full state view to the frontend.
                const allCollectedArray = Array.from(collectedLicenseIds);

                const enrichedData = await getEnrichedLicenseData(allCollectedArray);

                // Map to the Frontend expected structure (matches ScanResultRow in React)
                // Backend service returns: materialId, productName, formattedLicense, shortNotification, hasFile
                // Frontend expects: id, productName, cleanLicense, shortNotification, status
                const scanResults = enrichedData.map(d => ({
                    id: d.materialId,
                    productName: d.productName,
                    cleanLicense: d.formattedLicense,
                    shortNotification: d.shortNotification,
                    status: d.hasFile ? 'Available' : 'Missing'
                }));

                return res.status(200).json({
                    success: true,
                    scanResults, // Returns the FULL accumulated list
                    totalCollected: collectedLicenseIds.size,
                    newCount
                });

            } catch (e) {
                console.error('Error parsing results:', e);
                return res.status(500).json({
                    error: 'Error parsing processing results',
                    details: e instanceof Error ? e.message : String(e)
                });
            }
        });

    } catch (error) {
        console.error('Error in processInvoice:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Server error processing invoice' });
        }
    }
};
