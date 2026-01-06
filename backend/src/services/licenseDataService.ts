import path from 'path';
import fs from 'fs-extra';
import License, { ILicense } from '../models/License';
import { parseAndSaveLicensePdf } from './pdfImportService';

export interface EnrichedLicenseData {
    materialId: string;
    productName: string;
    formattedLicense: string;
    shortNotification: string;
    hasFile: boolean;
}

export const getEnrichedLicenseData = async (extractedIds: string[]): Promise<EnrichedLicenseData[]> => {
    // 1. Fetch existing from DB
    const existingDocs = await License.find({ licenseNumber: { $in: extractedIds } });

    // 2. Identify missing IDs (found in invoice but no DB record)
    const existingIdsSet = new Set(existingDocs.map(d => d.licenseNumber));
    const missingIds = extractedIds.filter(id => !existingIdsSet.has(id));

    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    const newlyAddedDocs: ILicense[] = [];

    // 3. For each missing ID, try to parse the PDF and save to DB
    if (missingIds.length > 0) {
        console.log(`Found ${missingIds.length} IDs missing from DB. Attempting to parse PDFs...`);

        await Promise.all(missingIds.map(async (id) => {
            // Check file existence
            const possibleExtensions = ['.pdf', '.Pdf', '.PDF'];
            let foundPath: string | null = null;

            for (const ext of possibleExtensions) {
                const p = path.join(uploadsDir, `${id}${ext}`);
                if (await fs.pathExists(p)) {
                    foundPath = p;
                    break;
                }
            }

            if (foundPath) {
                const newDoc = await parseAndSaveLicensePdf(foundPath, id);
                if (newDoc) {
                    newlyAddedDocs.push(newDoc);
                }
            }
        }));
    }

    const allDocs = [...existingDocs, ...newlyAddedDocs];

    // 4. Map and Format
    const results: EnrichedLicenseData[] = await Promise.all(extractedIds.map(async (id) => {
        const doc = allDocs.find(l => l.licenseNumber === id);

        // Formatting Logic
        // Check if DB 'number' property is not empty, if so, show it.
        // And ensure we DO NOT fallback to notification number or anything else similar.
        // If 'number' is empty, valid decision is to show the ID itself as fallback (standard practice here).
        // The user specifically asked: "check if the number property in the data base is not empty and if not show it and not the notification number"

        let formattedLicense = id; // Default Fallback

        if (doc && doc.number && doc.number.trim().length > 0) {
            formattedLicense = doc.number.replace(/\//g, '');
        }

        const rawNotif = doc?.notificationNumber || '';
        const shortNotification = rawNotif.length >= 4 ? rawNotif.slice(-4) : rawNotif;

        let hasFile = false;
        const possibleExtensions = ['.pdf', '.Pdf', '.PDF'];
        for (const ext of possibleExtensions) {
            if (await fs.pathExists(path.join(uploadsDir, `${id}${ext}`))) {
                hasFile = true;
                break;
            }
        }

        return {
            materialId: id,
            productName: doc?.productName || 'מוצר לא ידוע',
            formattedLicense,
            shortNotification,
            hasFile
        };
    }));

    return results;
};
