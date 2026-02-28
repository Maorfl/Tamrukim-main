import express, { Application } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import licenseRoutes from './routes/licenseRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import historyRoutes from './routes/historyRoutes';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = 'mongodb+srv://maorfl:M0301f1644@maor-cluster.yi54khe.mongodb.net/Tamrukim';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads folder
app.use('/uploads', express.static('G:\\CUS1\\uploads'));

// Routes
app.use('/api/licenses', licenseRoutes);
app.use('/api', invoiceRoutes);
app.use('/api/history', historyRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// Connect to MongoDB and start server
mongoose
    .connect(MONGODB_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB');
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📁 Serving PDFs from: G:\\CUS1\\uploads`);
        });
    })
    .catch((error) => {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    });

export default app;
