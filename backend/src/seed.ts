import mongoose from 'mongoose';
import dotenv from 'dotenv';
import License from './models/License';
import fs from 'fs';
import path from 'path';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cosmetic-licenses';

const sampleLicenses = [
    {
        licenseNumber: '64300861',
        notificationNumber: '0622025102818',
        productName: 'קרם לחות מועשר בויטמין E',
        country: 'ישראל',
        manufacturer: 'קוסמטיקה בע"מ'
    },
    {
        licenseNumber: '12345678',
        notificationNumber: '2/182319/24',
        productName: 'שמפו טיפולי לשיער יבש',
        country: 'צרפת',
        manufacturer: 'L\'Oreal Paris'
    },
    {
        licenseNumber: '87654321',
        notificationNumber: '0622025103456',
        productName: 'סרום פנים אנטי אייג\'ינג',
        country: 'גרמניה',
        manufacturer: 'Nivea GmbH'
    },
    {
        licenseNumber: '11223344',
        notificationNumber: '3/245678/24',
        productName: 'מסכת פנים מרגיעה',
        country: 'דרום קוריאה',
        manufacturer: 'K-Beauty Co.'
    },
    {
        licenseNumber: '99887766',
        notificationNumber: '0622025104567',
        productName: 'תחליב גוף מזין',
        country: 'ארצות הברית',
        manufacturer: 'Johnson & Johnson'
    },
    {
        licenseNumber: '55443322',
        notificationNumber: '4/156789/24',
        productName: 'קרם לילה משקם',
        country: 'שוויץ',
        manufacturer: 'La Prairie'
    },
    {
        licenseNumber: '66778899',
        notificationNumber: '0622025105678',
        productName: 'ג\'ל ניקוי עדין לפנים',
        country: 'יפן',
        manufacturer: 'Shiseido'
    },
    {
        licenseNumber: '33221100',
        notificationNumber: '5/167890/24',
        productName: 'קרם הגנה SPF 50',
        country: 'ישראל',
        manufacturer: 'Dead Sea Minerals'
    }
];

async function createDummyPDFs() {
    const uploadsDir = 'G:\\CUS1\\uploads';

    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('📁 Created uploads directory');
    }

    // Create dummy PDF files for each license
    for (const license of sampleLicenses) {
        const pdfPath = path.join(uploadsDir, `${license.licenseNumber}.pdf`);

        // Create a simple text file as a placeholder PDF
        const content = `Cosmetic License Document
    
License Number: ${license.licenseNumber}
Notification Number: ${license.notificationNumber}
Product Name: ${license.productName}
Country of Origin: ${license.country}
Manufacturer: ${license.manufacturer}

This is a dummy PDF file for demonstration purposes.
In production, this would be a real PDF document.`;

        fs.writeFileSync(pdfPath, content);
        console.log(`✅ Created dummy PDF: ${license.licenseNumber}.pdf`);
    }
}

async function seedDatabase() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        await License.deleteMany({});
        console.log('🗑️  Cleared existing licenses');

        // Insert sample data
        await License.insertMany(sampleLicenses);
        console.log(`✅ Inserted ${sampleLicenses.length} sample licenses`);

        // Create dummy PDF files
        await createDummyPDFs();

        console.log('🎉 Database seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
}

seedDatabase();
