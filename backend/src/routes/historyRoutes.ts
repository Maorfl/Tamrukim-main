import express from 'express';
import {
    createHistoryEntry,
    getAllHistory,
    getHistoryById,
    deleteHistoryEntry,
    downloadHistoryPdf
} from '../controllers/historyController';

const router = express.Router();

router.post('/', createHistoryEntry);
router.get('/', getAllHistory);
router.get('/:id', getHistoryById);
router.get('/:id/download', downloadHistoryPdf);
router.delete('/:id', deleteHistoryEntry);

export default router;
