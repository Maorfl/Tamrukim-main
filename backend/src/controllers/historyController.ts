import { Request, Response } from 'express';
import History from '../models/History';
import fs from 'fs-extra';
import path from 'path';

export const createHistoryEntry = async (req: Request, res: Response) => {
    try {
        const { caseNumber, licenseIds, fileName, filePath } = req.body;

        if (!caseNumber || !licenseIds || !Array.isArray(licenseIds) || licenseIds.length === 0) {
            return res.status(400).json({ error: 'Invalid data: caseNumber and licenseIds are required' });
        }

        const historyEntry = new History({
            caseNumber,
            licenseIds,
            fileName: fileName || `merged_licenses_${Date.now()}.pdf`,
            filePath: filePath || undefined
        });

        await historyEntry.save();

        res.status(201).json({
            success: true,
            data: historyEntry
        });
    } catch (error) {
        console.error('Error creating history entry:', error);
        res.status(500).json({ error: 'Failed to create history entry' });
    }
};

export const getAllHistory = async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 50;
        
        const history = await History.find()
            .sort({ createdAt: -1 })
            .limit(limit);

        res.json({
            success: true,
            data: history
        });
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
};

export const getHistoryById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const historyEntry = await History.findById(id);

        if (!historyEntry) {
            return res.status(404).json({ error: 'History entry not found' });
        }

        res.json({
            success: true,
            data: historyEntry
        });
    } catch (error) {
        console.error('Error fetching history entry:', error);
        res.status(500).json({ error: 'Failed to fetch history entry' });
    }
};

export const deleteHistoryEntry = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const deleted = await History.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ error: 'History entry not found' });
        }

        // Delete the associated PDF file if it exists
        if (deleted.filePath && await fs.pathExists(deleted.filePath)) {
            await fs.unlink(deleted.filePath);
        }

        res.json({
            success: true,
            message: 'History entry deleted'
        });
    } catch (error) {
        console.error('Error deleting history entry:', error);
        res.status(500).json({ error: 'Failed to delete history entry' });
    }
};

export const downloadHistoryPdf = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const historyEntry = await History.findById(id);

        if (!historyEntry) {
            return res.status(404).json({ error: 'History entry not found' });
        }

        if (!historyEntry.filePath || !(await fs.pathExists(historyEntry.filePath))) {
            return res.status(404).json({ error: 'PDF file not found' });
        }

        const fileBuffer = await fs.readFile(historyEntry.filePath);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${historyEntry.fileName}`);
        res.send(fileBuffer);

    } catch (error) {
        console.error('Error downloading history PDF:', error);
        res.status(500).json({ error: 'Failed to download PDF' });
    }
};
