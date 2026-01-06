import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';
import License from '../models/License';

// Regex patterns for Hebrew fields
const PATTERNS = {
    number: /\d{1,2}\/\d{6}\/\d{1,2}/g,
    notification: /\d{13,14}/g,
    productName: /(?:שם התמרוק בעברית|תירבעב קורמתה םש|םש קורמתה תירבעב|םש קורמתה תיזעולב|תיזעולב קורמתה םש|בלועזית התמרוק שם)[:\s]+(.+)/i,
    manufacturer: /(?:הערות כתובת|תבותכ תורעה|כתובתו|ותבותכ)[:\s]+(.+)/i,
    country: /(?:שם המפעל המייצר|שם יצרן בחו"ל|םש לעפמה רציימה|םש ןרצי ל"וחב|רציימה לעפמה םש|המייצר המפעל שם)[:\s]+(.+)/i,
    productNameRev: /(?:קורמתה םש)[:\s]+(.+)/i,
    countryRev: /(?:רוציי ץרא)[:\s]+(.+)/i
};

function cleanText(text: string): string {
    if (!text) return "";
    return text.trim().replace(/\r?\n|\r/g, " ").replace(/\s+/g, " ");
}

/**
 * Parses a PDF file from the uploads directory and saves/updates it in MongoDB.
 * @param filePath Full path to the PDF file
 * @param licenseNumber The 8-digit license ID
 * @returns The saved License document
 */
export const parseAndSaveLicensePdf = async (filePath: string, licenseNumber: string) => {
    try {
        console.log(`Parsing PDF for License ${licenseNumber}...`);

        const dataBuffer = fs.readFileSync(filePath);
        const parser = new PDFParse({ data: dataBuffer });
        const data = await parser.getText();
        const text = data.text;

        // Refined extraction logic based on the regex types
        const extractGroup = (match: RegExpMatchArray | null) => match && match[1] ? cleanText(match[1]) : "";
        const extractString = (match: RegExpMatchArray | null) => match && match[0] ? cleanText(match[0]) : "";

        const finalNum = text.match(PATTERNS.number);
        const finalNotif = text.match(PATTERNS.notification);

        const docData = {
            licenseNumber,
            // Ensure we use the proper match for each field
            number: finalNum ? cleanText(finalNum[0]) : "",
            notificationNumber: finalNotif ? cleanText(finalNotif[0]) : "",
            productName: extractGroup(text.match(PATTERNS.productName) || text.match(PATTERNS.productNameRev)) || "Unknown Product",
            manufacturer: extractGroup(text.match(PATTERNS.manufacturer)) || "Unknown Manufacturer",
            country: extractGroup(text.match(PATTERNS.country) || text.match(PATTERNS.countryRev)) || "Unknown Country"
        };

        // Upsert to DB
        const savedDoc = await License.findOneAndUpdate(
            { licenseNumber },
            docData,
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return savedDoc;

    } catch (error) {
        console.error(`Error parsing/saving PDF ${licenseNumber}:`, error);
        return null; // Fail gracefully
    }
};
