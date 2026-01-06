import { PDFDocument } from 'pdf-lib';
import fs from 'fs-extra';
import path from 'path';

export const mergePdfs = async (filePaths: string[]): Promise<Uint8Array> => {
    const mergedPdf = await PDFDocument.create();

    for (const filePath of filePaths) {
        if (await fs.pathExists(filePath)) {
            try {
                const fileBuffer = await fs.readFile(filePath);
                const pdf = await PDFDocument.load(fileBuffer);
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            } catch (err) {
                console.error(`Failed to merge file ${filePath}:`, err);
                // Skip corrupt files instead of crashing
            }
        }
    }

    return await mergedPdf.save();
};
